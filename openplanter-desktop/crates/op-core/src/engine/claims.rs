// Write claims for concurrent subtask/execute children.
//
// Each loop in the task tree has an owner key built from its position
// ("" for the root, "/s1.0", "/s1.0/s3.1", ...). A path written by one owner
// can't be written by an unrelated owner — a sibling or cousin that may be
// running concurrently. When a fan-out joins, its claims pass up to the loop
// that ran it, so they keep guarding until every enclosing fan-out has joined.
// Mirrors the Python agent's parallel write groups.

use std::collections::HashMap;
use std::path::{Path, PathBuf};

use crate::tools::filesystem::resolve_path;

const PATCH_HEADERS: [&str; 4] = [
    "*** Add File:",
    "*** Update File:",
    "*** Delete File:",
    "*** Move to:",
];

/// Paths and their holders before a claim, for rolling it back.
pub type PreviousHolders = Vec<(PathBuf, Option<String>)>;

/// Resolved path → owner key of the loop currently answerable for it.
#[derive(Default)]
pub struct WriteClaims {
    claims: HashMap<PathBuf, String>,
}

/// True when `a` is `b` or one of its ancestors in the task tree.
fn is_ancestor_or_self(a: &str, b: &str) -> bool {
    b == a || b.starts_with(&format!("{a}/"))
}

impl WriteClaims {
    /// Claim every path for `owner`, or return a conflict error without claiming any.
    /// On success, returns the previous holders so a failed write can be rolled back.
    pub fn claim(&mut self, paths: &[PathBuf], owner: &str) -> Result<PreviousHolders, String> {
        for path in paths {
            let conflicting = self.claims.get(path).filter(|holder| {
                !is_ancestor_or_self(holder, owner) && !is_ancestor_or_self(owner, holder)
            });
            if let Some(holder) = conflicting {
                return Err(format!(
                    "Parallel write conflict: '{}' is already claimed by sibling task {holder}. \
                     Concurrent subtasks must write different files; merge results in the parent.",
                    path.display()
                ));
            }
        }
        Ok(paths
            .iter()
            .map(|path| {
                let previous = self.claims.insert(path.clone(), owner.to_string());
                (path.clone(), previous)
            })
            .collect())
    }

    /// Undo a claim whose write failed without changing anything.
    /// Reversed so a path claimed twice in one call ends at its original holder.
    pub fn restore(&mut self, previous: PreviousHolders) {
        for (path, holder) in previous.into_iter().rev() {
            match holder {
                Some(holder) => self.claims.insert(path, holder),
                None => self.claims.remove(&path),
            };
        }
    }

    /// `owner`'s fan-out has joined: its descendants' claims pass up to `owner`,
    /// which is still running, so its siblings and cousins stay blocked.
    pub fn promote_descendants(&mut self, owner: &str) {
        let prefix = format!("{owner}/");
        for holder in self.claims.values_mut() {
            if holder.starts_with(&prefix) {
                *holder = owner.to_string();
            }
        }
    }
}

/// Workspace paths a tool call will write, resolved like the tools resolve them.
/// Non-write tools and unresolvable paths yield nothing (the tool reports its own error).
pub fn write_targets(root: &Path, tool: &str, args_json: &str) -> Vec<PathBuf> {
    let args: serde_json::Value = serde_json::from_str(args_json).unwrap_or_default();
    let raw: Vec<&str> = match tool {
        "write_file" | "edit_file" | "hashline_edit" => {
            vec![args.get("path").and_then(|v| v.as_str()).unwrap_or("")]
        }
        "apply_patch" => args
            .get("patch")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .lines()
            .filter_map(|line| {
                let line = line.trim();
                PATCH_HEADERS
                    .iter()
                    .find_map(|h| line.strip_prefix(h))
                    .map(str::trim)
            })
            .collect(),
        // ponytail: run_shell/run_shell_bg writes aren't claimed (same gap as the Python
        // agent); closing it needs declared output paths or a sandbox per child.
        _ => Vec::new(),
    };
    raw.into_iter()
        .filter(|p| !p.is_empty())
        .filter_map(|p| resolve_path(root, p).ok())
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn paths(p: &str) -> Vec<PathBuf> {
        vec![PathBuf::from(p)]
    }

    #[test]
    fn test_sibling_write_conflicts() {
        let mut claims = WriteClaims::default();
        claims.claim(&paths("/w/a.txt"), "/s1.0").unwrap();
        let err = claims.claim(&paths("/w/a.txt"), "/s1.1").unwrap_err();
        assert!(err.contains("Parallel write conflict"), "{err}");
        // Cousins conflict too.
        assert!(claims.claim(&paths("/w/a.txt"), "/s1.1/s2.0").is_err());
    }

    #[test]
    fn test_ancestors_and_descendants_may_write() {
        let mut claims = WriteClaims::default();
        for owner in ["", "/s1.0", "/s1.0/s2.0", "/s1.0", ""] {
            claims.claim(&paths("/w/a.txt"), owner).unwrap();
        }
    }

    #[test]
    fn test_promoted_claims_keep_cousins_blocked_until_outer_join() {
        let mut claims = WriteClaims::default();
        // Branch A's grandchild writes, then A's inner fan-out joins while the
        // root fan-out (A and C) is still running.
        claims.claim(&paths("/w/a.txt"), "/s1.0/s2.0").unwrap();
        claims.promote_descendants("/s1.0");
        assert!(
            claims.claim(&paths("/w/a.txt"), "/s1.1").is_err(),
            "cousin C stays blocked"
        );
        // Root fan-out joins: next turn's children may write.
        claims.promote_descendants("");
        claims.claim(&paths("/w/a.txt"), "/s2.0").unwrap();
    }

    #[test]
    fn test_restore_undoes_a_failed_claim() {
        let mut claims = WriteClaims::default();
        let previous = claims.claim(&paths("/w/a.txt"), "/s1.0").unwrap();
        claims.restore(previous);
        claims.claim(&paths("/w/a.txt"), "/s1.1").unwrap();

        // A path claimed twice in one call returns to its original holder.
        let twice = vec![PathBuf::from("/w/b.txt"), PathBuf::from("/w/b.txt")];
        claims.claim(&paths("/w/b.txt"), "").unwrap();
        let previous = claims.claim(&twice, "/s1.0").unwrap();
        claims.restore(previous);
        claims.claim(&paths("/w/b.txt"), "/s1.1").unwrap();
    }

    #[test]
    fn test_write_targets() {
        let dir = tempfile::tempdir().unwrap();
        let root = dir.path();
        assert!(write_targets(root, "read_file", r#"{"path":"a.txt"}"#).is_empty());

        let written = write_targets(root, "write_file", r#"{"path":"a.txt"}"#);
        assert_eq!(written.len(), 1);
        assert!(written[0].ends_with("a.txt"));

        let patch = serde_json::json!({
            "patch": "*** Begin Patch\n*** Update File: x.rs\n*** Move to: y.rs\n@@\n-a\n+b\n*** Add File: z.rs\n+z\n*** End Patch"
        })
        .to_string();
        let patched = write_targets(root, "apply_patch", &patch);
        assert_eq!(patched.len(), 3, "{patched:?}");
    }
}
