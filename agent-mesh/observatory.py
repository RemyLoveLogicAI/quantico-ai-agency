#!/usr/bin/env python3
"""Read-only mesh inspection; --refresh updates only the standalone HTML snapshot.

Uses the Mac's existing PyYAML installation. Never publishes or acknowledges events.
"""
import argparse
import json
import math
import plistlib
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent
PAGE = ROOT.parent / "mesh-observatory.html"
PLIST = Path.home() / "Library/LaunchAgents/ai.lovelogic.agent-mesh.heartbeat.plist"
TYPES = {"announce", "heartbeat", "task.request", "task.result", "alert", "capability.update"}


def read_registry(path):
    source = path.read_text()
    try:
        return yaml.safe_load(source), []
    except yaml.YAMLError:
        # The existing mirror has unquoted ': ' in three prose descriptions.
        # Quote only those single-line strings in memory; never edit the registry.
        repaired = re.sub(r'^(\s+description: )([^\n]+)$',
                          lambda m: m[1] + json.dumps(m[2]) if ': ' in m[2] and not m[2].startswith(('"', "'")) else m[0],
                          source, flags=re.M)
        registry = yaml.safe_load(repaired)  # Other schema failures remain explicit.
        return registry, [{"source": "agent-registry/registry.yaml", "message":
                           "Registry is invalid YAML: unquoted colons in descriptions. Quoted in memory for this view; source unchanged."}]


def timestamp(value):
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("timestamp requires timezone")
    return parsed


def inspect_events(root, agents, now):
    events, issues, seen = [], [], set()
    for path in sorted((root / "agent-bus/events").glob("*.jsonl")):
        for line_no, line in enumerate(path.read_text().splitlines(), 1):
            if not line.strip():
                continue
            source = f"agent-bus/events/{path.name}:{line_no}"
            try:
                event = json.loads(line)
                if not isinstance(event, dict):
                    raise ValueError("envelope must be an object")
                for key in ("id", "ts", "from", "to", "type"):
                    if not isinstance(event.get(key), str):
                        raise ValueError(f"invalid {key}")
                if not re.fullmatch(r"[0-9a-f]{12}", event["id"]):
                    raise ValueError("invalid event id")
                if event["type"] not in TYPES or not isinstance(event.get("payload"), dict):
                    raise ValueError("invalid type or payload")
                age = (now - timestamp(event["ts"])).total_seconds()
                ttl = event.get("ttl_hours")
                if ttl is not None and (isinstance(ttl, bool) or not isinstance(ttl, (int, float)) or not math.isfinite(ttl) or ttl <= 0):
                    raise ValueError("invalid TTL")
                if event["id"] in seen:
                    raise ValueError("duplicate event id")
                seen.add(event["id"])
                known = event["from"] in agents and event["to"] in agents | {"*"}
                if not known:
                    issues.append({"source": source, "message": "Unregistered sender or recipient"})
                if age < -300:
                    issues.append({"source": source, "message": "Timestamp more than five minutes in the future"})
                ack_path = root / "agent-bus/acks" / (event["id"] + ".json")
                acked = []
                if ack_path.exists():
                    try:
                        ack = json.loads(ack_path.read_text())
                        acked = ack["acked_by"]
                        if ack.get("event_id") != event["id"] or not isinstance(acked, list) or not all(isinstance(a, str) and a in agents for a in acked):
                            raise ValueError("invalid acknowledgement")
                    except (ValueError, KeyError, TypeError):
                        acked = []
                        issues.append({"source": source, "message": "Invalid acknowledgement file"})
                # Deliberately omit payloads, contact details, device IDs and auth.
                events.append({k: event[k] for k in ("id", "ts", "from", "to", "type")} | {
                    "age_seconds": round(age), "expired": ttl is not None and age > ttl * 3600,
                    "eligible": known and age >= -300,
                    "acked_by": acked, "source": source,
                })
            except (ValueError, TypeError, KeyError, OverflowError):
                issues.append({"source": source, "message": "Malformed or duplicate event; excluded from health evidence"})
    return sorted(events, key=lambda e: timestamp(e["ts"]), reverse=True), issues


def heartbeat_health(events, now, interval):
    candidates = [e for e in events if e["type"] == "heartbeat" and e["from"] == "mac-mini" and e["to"] == "waldo" and e["eligible"] and not e["expired"]]
    if not candidates:
        return {"state": "missing", "latest": None, "acknowledged": False}
    latest = max(candidates, key=lambda e: timestamp(e["ts"]))
    age = (now - timestamp(latest["ts"])).total_seconds()
    return {"state": "fresh" if age <= interval * 2 + 300 else "stale", "latest": latest,
            "acknowledged": "waldo" in latest["acked_by"]}


def snapshot(root=ROOT, plist_path=PLIST, now=None):
    now = now or datetime.now(timezone.utc)
    registry, registry_issues = read_registry(root / "agent-registry/registry.yaml")
    agents = []
    for item in registry["agents"]:
        agents.append({k: item.get(k, "") for k in ("id", "name", "kind", "status", "last_seen")} | {
            "can": item.get("capabilities", {}).get("can", []),
            "cant": item.get("capabilities", {}).get("cant", []),
            "next": item.get("capabilities", {}).get("next", []),
            "method": item.get("reach", {}).get("method", "unknown"),
        })
    events, issues = inspect_events(root, {a["id"] for a in agents}, now)
    issues.extend(registry_issues)
    with plist_path.open("rb") as handle:
        plist = plistlib.load(handle)
    interval = plist.get("StartInterval", 3600)
    label = plist["Label"]
    try:
        result = subprocess.run(["/bin/launchctl", "list", label], capture_output=True, text=True, timeout=5)
        loaded = result.returncode == 0
    except (OSError, subprocess.TimeoutExpired):
        loaded = None
    return {"generated_at": now.isoformat(timespec="seconds"), "registry_updated": str(registry.get("updated", "")),
            "agents": agents, "events": events, "issues": issues,
            "launchd": {"loaded": loaded, "label": label, "interval_seconds": interval},
            "heartbeat": heartbeat_health(events, now, interval)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--refresh", action="store_true", help="replace only the embedded dashboard snapshot")
    args = parser.parse_args()
    data = snapshot()
    encoded = json.dumps(data, ensure_ascii=True).replace("<", "\\u003c")
    if args.refresh:
        page = PAGE.read_text()
        pattern = r'(<script id="mesh-data" type="application/json">).*?(</script>)'
        updated, count = re.subn(pattern, lambda m: m[1] + encoded + m[2], page, flags=re.S)
        if count != 1:
            raise SystemExit("Expected exactly one mesh-data element; page unchanged")
        PAGE.write_text(updated)
        print(f"Updated {PAGE}: {len(data['agents'])} agents, {len(data['events'])} events, {len(data['issues'])} data issues")
    else:
        print(encoded)


if __name__ == "__main__":
    main()
