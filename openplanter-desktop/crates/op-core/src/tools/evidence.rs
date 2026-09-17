// Evidence store: a DuckDB database in the session dir holding ingested
// datasets plus a `_sources` provenance table (path, URL, sha256, modified
// time, row count). Every ingested row carries `_source_id` → `_sources`.
// DuckDB's own settings confine file access to the workspace.

use std::path::Path;

use duckdb::{Connection, params};

use super::ToolResult;
use super::filesystem::resolve_path;

/// Rows shown per `sql` result before truncating.
const MAX_ROWS: usize = 200;

pub struct EvidenceStore {
    conn: Connection,
}

/// A SQL string literal.
fn quote(s: &str) -> String {
    format!("'{}'", s.replace('\'', "''"))
}

fn is_identifier(s: &str) -> bool {
    let mut chars = s.chars();
    chars
        .next()
        .is_some_and(|c| c.is_ascii_alphabetic() || c == '_')
        && chars.all(|c| c.is_ascii_alphanumeric() || c == '_')
}

/// True when `sql` holds a single statement.
///
/// duckdb-rs offers no safe way to run exactly one statement: `execute` runs every
/// statement in the string, and `prepare` *executes* all but the last. So a second
/// statement has to be refused before DuckDB sees it. Semicolons inside string
/// literals, quoted identifiers, dollar-quotes and comments don't count as separators.
fn is_single_statement(sql: &str) -> bool {
    let bytes = sql.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        let rest = &sql[i..];
        match bytes[i] {
            b'\'' | b'"' => {
                let quote = bytes[i];
                i += 1;
                while i < bytes.len() {
                    if bytes[i] == quote {
                        // A doubled quote is an escape, not the end.
                        if bytes.get(i + 1) == Some(&quote) {
                            i += 2;
                            continue;
                        }
                        break;
                    }
                    i += 1;
                }
            }
            b'-' if rest.starts_with("--") => {
                i += sql[i..].find('\n').unwrap_or(sql.len() - i);
            }
            b'/' if rest.starts_with("/*") => {
                i += sql[i + 2..]
                    .find("*/")
                    .map(|n| n + 4)
                    .unwrap_or(sql.len() - i);
                continue;
            }
            b'$' if rest.starts_with("$$") => {
                i += sql[i + 2..]
                    .find("$$")
                    .map(|n| n + 4)
                    .unwrap_or(sql.len() - i);
                continue;
            }
            b';' => return sql[i + 1..].trim().is_empty(),
            _ => {}
        }
        i += 1;
    }
    true
}

/// DuckDB table function that reads this file type.
fn reader_for(path: &Path) -> Option<&'static str> {
    let ext = path.extension()?.to_str()?.to_ascii_lowercase();
    match ext.as_str() {
        "csv" | "tsv" | "txt" => Some("read_csv_auto"),
        "json" | "jsonl" | "ndjson" => Some("read_json_auto"),
        "parquet" => Some("read_parquet"),
        _ => None,
    }
}

impl EvidenceStore {
    /// Open (creating if needed) the database at `db_path`, confining file access to `root`.
    pub fn open(root: &Path, db_path: &Path) -> Result<Self, String> {
        if let Some(dir) = db_path.parent() {
            std::fs::create_dir_all(dir).map_err(|e| format!("create {}: {e}", dir.display()))?;
        }
        let conn = Connection::open(db_path).map_err(|e| format!("open evidence store: {e}"))?;
        let root = std::fs::canonicalize(root).unwrap_or_else(|_| root.to_path_buf());
        conn.execute_batch(&format!(
            "SET allowed_directories = [{}];
             SET enable_external_access = false;
             SET lock_configuration = true;
             CREATE SEQUENCE IF NOT EXISTS _source_seq;
             CREATE TABLE IF NOT EXISTS _sources (
                 source_id BIGINT PRIMARY KEY,
                 table_name VARCHAR,
                 path VARCHAR,
                 url VARCHAR,
                 sha256 VARCHAR,
                 modified_at TIMESTAMP,
                 ingested_at TIMESTAMP,
                 row_count BIGINT
             );",
            quote(&root.to_string_lossy())
        ))
        .map_err(|e| format!("configure evidence store: {e}"))?;
        Ok(Self { conn })
    }

    /// Load a workspace file into `table`, recording its provenance.
    pub fn ingest(
        &mut self,
        root: &Path,
        path: &str,
        table: &str,
        url: Option<&str>,
    ) -> ToolResult {
        if !is_identifier(table) || table.starts_with('_') {
            return ToolResult::error(format!(
                "Invalid table name '{table}': use letters, digits and _, not starting with _ or a digit."
            ));
        }
        let full = match resolve_path(root, path) {
            Ok(p) => p,
            Err(e) => return ToolResult::error(e),
        };
        let Some(reader) = reader_for(&full) else {
            return ToolResult::error(format!(
                "Unsupported file type for '{path}': use .csv, .tsv, .json, .jsonl, .ndjson or .parquet."
            ));
        };
        match self.load(&full.to_string_lossy(), reader, table, url) {
            Ok(message) => ToolResult::ok(message),
            Err(e) => ToolResult::error(format!("ingest_file failed: {e}")),
        }
    }

    fn load(
        &mut self,
        file: &str,
        reader: &str,
        table: &str,
        url: Option<&str>,
    ) -> duckdb::Result<String> {
        let literal = quote(file);
        let tx = self.conn.transaction()?;
        let sha: String = tx.query_row(
            &format!("SELECT sha256(content) FROM read_blob({literal})"),
            [],
            |r| r.get(0),
        )?;
        let existing: Option<i64> = tx.query_row(
            "SELECT min(source_id) FROM _sources WHERE table_name = ? AND sha256 = ?",
            params![table, sha],
            |r| r.get(0),
        )?;
        if let Some(id) = existing {
            return Ok(format!(
                "Already ingested: this exact file is source {id} of '{table}'. Nothing added."
            ));
        }

        let id: i64 = tx.query_row("SELECT nextval('_source_seq')", [], |r| r.get(0))?;
        let exists: i64 = tx.query_row(
            "SELECT count(*) FROM information_schema.tables WHERE table_name = ?",
            params![table],
            |r| r.get(0),
        )?;
        // A file with its own _source_id column would otherwise be renamed by DuckDB,
        // leaving provenance in a column nobody joins on.
        let carries_source_id = {
            let mut probe = tx.prepare(&format!("SELECT * FROM {reader}({literal}) LIMIT 0"))?;
            let probe_rows = probe.query([])?;
            let columns = probe_rows
                .as_ref()
                .map(|s| s.column_names())
                .unwrap_or_default();
            columns.iter().any(|c| c == "_source_id")
        };
        let select = if carries_source_id {
            format!("SELECT * REPLACE ({id}::BIGINT AS _source_id) FROM {reader}({literal})")
        } else {
            format!("SELECT *, {id}::BIGINT AS _source_id FROM {reader}({literal})")
        };
        if exists > 0 {
            tx.execute(&format!("INSERT INTO {table} BY NAME {select}"), [])?;
        } else {
            tx.execute(&format!("CREATE TABLE {table} AS {select}"), [])?;
        }
        let rows: i64 = tx.query_row(
            &format!("SELECT count(*) FROM {table} WHERE _source_id = {id}"),
            [],
            |r| r.get(0),
        )?;
        tx.execute(
            &format!(
                "INSERT INTO _sources
                 SELECT ?, ?, ?, ?, ?, CAST(last_modified AS TIMESTAMP), CAST(now() AS TIMESTAMP), ?
                 FROM read_blob({literal})"
            ),
            params![id, table, file, url, sha, rows],
        )?;
        tx.commit()?;
        Ok(format!(
            "Ingested {rows} rows from {file} into '{table}' as source {id} (sha256 {}…). \
             Query with sql(); each row's _source_id joins to _sources for provenance.",
            &sha[..12]
        ))
    }

    /// Run one SQL statement. Statements that return rows render as text.
    pub fn sql(&mut self, query: &str) -> ToolResult {
        let query = query.trim().trim_end_matches(';').trim();
        if query.is_empty() {
            return ToolResult::error("sql requires a query".into());
        }
        if !is_single_statement(query) {
            return ToolResult::error(
                "sql runs one statement; send each statement as its own call.".into(),
            );
        }
        // Cast every column to text so any type renders without per-type formatting.
        // The newlines keep a trailing `-- comment` from swallowing the closing paren.
        let wrapped = format!(
            "SELECT COLUMNS(*)::VARCHAR FROM (\n{query}\n) LIMIT {}",
            MAX_ROWS + 1
        );
        // Preparing runs nothing, so it is a safe way to ask DuckDB whether this
        // statement returns rows — more reliable than guessing from the first keyword.
        let result = if self.conn.prepare(&wrapped).is_ok() {
            self.rows(&wrapped)
        } else {
            // execute() runs exactly one statement, so a trailing `; DROP ...` is rejected.
            self.conn.execute(query, []).map(|_| "OK".to_string())
        };
        match result {
            Ok(text) => ToolResult::ok(text),
            Err(e) => ToolResult::error(format!("SQL error: {e}")),
        }
    }

    fn rows(&self, wrapped: &str) -> duckdb::Result<String> {
        let mut stmt = self.conn.prepare(wrapped)?;
        let mut rows = stmt.query([])?;
        let names = rows.as_ref().map(|s| s.column_names()).unwrap_or_default();
        let mut lines = vec![names.join(" | ")];
        while let Some(row) = rows.next()? {
            if lines.len() > MAX_ROWS {
                lines.push(format!(
                    "... more than {MAX_ROWS} rows; add LIMIT, WHERE or GROUP BY"
                ));
                break;
            }
            let values = (0..names.len())
                .map(|i| {
                    row.get::<_, Option<String>>(i)
                        .map(|v| v.unwrap_or_else(|| "NULL".into()))
                })
                .collect::<duckdb::Result<Vec<_>>>()?;
            lines.push(values.join(" | "));
        }
        if lines.len() == 1 {
            lines.push("(0 rows)".into());
        }
        Ok(lines.join("\n"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn store() -> (tempfile::TempDir, EvidenceStore) {
        let dir = tempfile::tempdir().unwrap();
        let db = dir.path().join(".quantico/evidence.duckdb");
        let store = EvidenceStore::open(dir.path(), &db).unwrap();
        (dir, store)
    }

    fn ok(result: ToolResult) -> String {
        assert!(!result.is_error, "{}", result.content);
        result.content
    }

    #[test]
    fn test_ingest_csv_records_provenance() {
        let (dir, mut s) = store();
        std::fs::write(dir.path().join("a.csv"), "name,amount\nACME,10\nBeta,20\n").unwrap();

        let msg = ok(s.ingest(dir.path(), "a.csv", "donations", Some("https://fec.gov/x")));
        assert!(msg.contains("Ingested 2 rows"), "{msg}");

        let rows = ok(s.sql("SELECT name, amount, _source_id FROM donations ORDER BY name"));
        assert_eq!(
            rows,
            "name | amount | _source_id\nACME | 10 | 1\nBeta | 20 | 1"
        );

        let prov = ok(s.sql(
            "SELECT table_name, url, row_count, length(sha256), modified_at IS NOT NULL FROM _sources",
        ));
        assert!(
            prov.ends_with("donations | https://fec.gov/x | 2 | 64 | true"),
            "{prov}"
        );
    }

    #[test]
    fn test_reingest_is_skipped_and_new_file_appends() {
        let (dir, mut s) = store();
        std::fs::write(dir.path().join("a.csv"), "name,amount\nACME,10\n").unwrap();
        std::fs::write(dir.path().join("b.csv"), "name,amount\nGamma,30\n").unwrap();

        ok(s.ingest(dir.path(), "a.csv", "donations", None));
        let again = ok(s.ingest(dir.path(), "a.csv", "donations", None));
        assert!(again.contains("Already ingested"), "{again}");
        ok(s.ingest(dir.path(), "b.csv", "donations", None));

        let counts = ok(s.sql("SELECT _source_id, count(*) FROM donations GROUP BY 1 ORDER BY 1"));
        assert_eq!(counts, "_source_id | count_star()\n1 | 1\n2 | 1");
    }

    #[test]
    fn test_ingest_json_and_parquet() {
        let (dir, mut s) = store();
        std::fs::write(
            dir.path().join("c.jsonl"),
            "{\"vendor\":\"ACME\",\"award\":5}\n",
        )
        .unwrap();
        ok(s.ingest(dir.path(), "c.jsonl", "contracts", None));
        assert!(ok(s.sql("SELECT vendor FROM contracts")).ends_with("ACME"));

        // COPY inside the workspace is allowed.
        let parquet = dir.path().join("p.parquet");
        ok(s.sql(&format!(
            "COPY (SELECT 7 AS n) TO {} (FORMAT parquet)",
            quote(
                &std::fs::canonicalize(dir.path())
                    .unwrap()
                    .join("p.parquet")
                    .to_string_lossy()
            )
        )));
        assert!(parquet.exists());
        ok(s.ingest(dir.path(), "p.parquet", "numbers", None));
        assert!(ok(s.sql("SELECT n FROM numbers")).ends_with('7'));
    }

    #[test]
    fn test_file_access_is_confined_to_workspace() {
        let (dir, mut s) = store();
        let outside = tempfile::tempdir().unwrap();
        let secret = outside.path().join("secret.csv");
        std::fs::write(&secret, "x\n1\n").unwrap();
        let secret = quote(&secret.to_string_lossy());

        assert!(s.sql(&format!("SELECT * FROM read_csv({secret})")).is_error);
        assert!(s.sql(&format!("COPY (SELECT 1) TO {secret}")).is_error);
        assert!(s.sql("SET enable_external_access = true").is_error);
        assert!(s.ingest(dir.path(), "../secret.csv", "leak", None).is_error);
    }

    #[test]
    fn test_sql_statements_and_row_cap() {
        let (_dir, mut s) = store();
        assert_eq!(
            ok(s.sql("CREATE TABLE t AS SELECT range AS n FROM range(500);")),
            "OK"
        );
        let many = ok(s.sql("SELECT n FROM t"));
        assert!(many.contains("more than 200 rows"), "{many}");
        assert_eq!(many.lines().count(), 202);
        assert!(ok(s.sql("DESCRIBE t")).contains("BIGINT"));
        assert!(ok(s.sql("SELECT n FROM t WHERE n < 0")).ends_with("(0 rows)"));
        assert!(s.sql("SELEC 1").is_error);
    }

    #[test]
    fn test_only_one_statement_runs() {
        let (_dir, mut s) = store();
        let attack = s.sql("CREATE TABLE evil AS SELECT 1; DROP TABLE _sources");
        assert!(
            attack.is_error,
            "second statement must be refused: {attack:?}"
        );
        let survived = s.sql("SELECT count(*) FROM _sources");
        assert!(!survived.is_error, "_sources must survive: {survived:?}");
        // A trailing semicolon is fine; semicolons inside literals or comments
        // are not separators.
        ok(s.sql("SELECT 1;"));
        assert!(ok(s.sql("SELECT 'a;b' AS s")).ends_with("a;b"));
        assert!(ok(s.sql("SELECT 1 AS n -- trailing ; comment")).ends_with('1'));
        assert!(ok(s.sql("SELECT /* mid ; comment */ 2 AS n")).ends_with('2'));
    }

    #[test]
    fn test_statement_routing_without_keyword_guessing() {
        let (_dir, mut s) = store();
        // A comment before SELECT must still return rows.
        assert!(ok(s.sql("-- a note\nSELECT 1 AS n")).ends_with('1'));
        // A data-modifying statement returns OK, not a wrapped-query error.
        ok(s.sql("CREATE TABLE t AS SELECT 1 AS n"));
        assert_eq!(ok(s.sql("DELETE FROM t WHERE n = 1")), "OK");
        assert!(ok(s.sql("SELECT count(*) FROM t")).ends_with('0'));
    }

    #[test]
    fn test_input_source_id_column_is_overwritten() {
        let (dir, mut s) = store();
        std::fs::write(dir.path().join("a.csv"), "name,_source_id\nACME,999\n").unwrap();
        ok(s.ingest(dir.path(), "a.csv", "donations", None));

        let rows = ok(s.sql("SELECT name, _source_id FROM donations"));
        assert!(rows.ends_with("ACME | 1"), "generated id wins: {rows}");
        assert!(ok(s.sql("SELECT row_count FROM _sources")).ends_with('1'));
    }

    #[test]
    fn test_bad_table_names_rejected() {
        let (dir, mut s) = store();
        std::fs::write(dir.path().join("a.csv"), "x\n1\n").unwrap();
        for bad in ["x; DROP TABLE _sources", "_sources", "1abc", ""] {
            assert!(s.ingest(dir.path(), "a.csv", bad, None).is_error, "{bad}");
        }
        assert!(s.ingest(dir.path(), "a.xlsx", "ok_name", None).is_error);
    }
}
