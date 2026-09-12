// Write claims for concurrent subtask/execute children.
//
// Each loop in the task tree has an owner key built from its position
// ("" for the root, "/s1.0", "/s1.0/s3.1", ...). A path written by one owner
// can't be written by an unrelated owner — a sibling or cousin that may be
// running concurrently — until the parent's fan-out finishes and releases its
// descendants' claims. Mirrors the Python agent's parallel write groups.

use std::collections::HashMap;
use std::path::{Path, PathBuf};

use crate::tools::filesystem::resolve_path;

const PATCH_HEADERS: [&str; 4] = [
    "*** Add File:",
    "*** Update File:",
    "*** Delete File:",
    "*** Move to:",
];

/// Resolved path → owner key of the last loop that wrote it.
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
    pub fn claim(&mut self, paths: &[PathBuf], owner: &str) -> Result<(), String> {
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
        for path in paths {
            self.claims.insert(path.clone(), owner.to_string());
        }
        Ok(())
    }

    /// Drop claims held by strict descendants of `owner` (its children have finished).
    pub fn release_descendants(&mut self, owner: &str) {
        let prefix = format!("{owner}/");
        self.claims.retain(|_, holder| !holder.starts_with(&prefix));
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
    fn test_release_descendants_frees_paths() {
        let mut claims = WriteClaims::default();
        claims.claim(&paths("/w/a.txt"), "/s1.0").unwrap();
        claims.release_descendants("");
        claims.claim(&paths("/w/a.txt"), "/s2.1").unwrap();
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
