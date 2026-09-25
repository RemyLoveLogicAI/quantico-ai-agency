import json
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path

from observatory import heartbeat_health, inspect_events, read_registry


class EvidenceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.events = self.root / "agent-bus/events"
        self.events.mkdir(parents=True)
        self.now = datetime(2026, 9, 25, 2, tzinfo=timezone.utc)

    def event(self, **updates):
        return dict({"id": "abcdef123456", "ts": "2026-09-25T01:46:36Z", "from": "mac-mini",
                     "to": "waldo", "type": "heartbeat", "payload": {}}, **updates)

    def inspect(self, rows):
        (self.events / "2026-09-25.jsonl").write_text("\n".join(json.dumps(x) for x in rows))
        return inspect_events(self.root, {"mac-mini", "waldo"}, self.now)

    def health(self, rows):
        events, _ = self.inspect(rows)
        return heartbeat_health(events, self.now, 3600)

    def test_fresh_is_not_delivered(self):
        health = self.health([self.event()])
        self.assertEqual(health["state"], "fresh")
        self.assertFalse(health["acknowledged"])

    def test_stale_missing_future_expired_and_wrong_recipient(self):
        self.assertEqual(self.health([])["state"], "missing")
        self.assertEqual(self.health([self.event(ts="2026-09-24T20:00:00Z")])["state"], "stale")
        for updates in ({"ts": "2026-09-26T01:00:00Z"}, {"ttl_hours": .01}, {"to": "unknown"}, {"to": "*"}):
            self.assertEqual(self.health([self.event(**updates)])["state"], "missing")

    def test_corrupt_envelopes_never_become_health_evidence(self):
        rows = [[], self.event(payload=[]), self.event(id="../escape"), self.event(ts="bad"),
                self.event(ts="2026-09-25T01:00:00"), self.event(ttl_hours=-1), self.event(ttl_hours=True)]
        events, issues = self.inspect(rows)
        self.assertEqual(events, [])
        self.assertEqual(len(issues), len(rows))

    def test_duplicate_and_broken_json_reported(self):
        events, issues = self.inspect([self.event(), self.event()])
        self.assertEqual(len(events), 1)
        self.assertEqual(len(issues), 1)
        with (self.events / "2026-09-25.jsonl").open("a") as handle:
            handle.write("\n{broken")
        _, issues = inspect_events(self.root, {"mac-mini", "waldo"}, self.now)
        self.assertEqual(len(issues), 2)

    def test_ack_requires_matching_id_and_registered_agent(self):
        acks = self.root / "agent-bus/acks"
        acks.mkdir()
        path = acks / "abcdef123456.json"
        for value in ({"event_id": "different", "acked_by": ["waldo"]},
                      {"event_id": "abcdef123456", "acked_by": ["unknown"]}, []):
            path.write_text(json.dumps(value))
            self.assertFalse(self.health([self.event()])["acknowledged"])
        path.write_text(json.dumps({"event_id": "abcdef123456", "acked_by": ["waldo"]}))
        self.assertTrue(self.health([self.event()])["acknowledged"])

    def test_metadata_only_and_offset_aware_order(self):
        events, _ = self.inspect([self.event(payload={"secret": "never export"}),
                                 self.event(id="123456abcdef", ts="2026-09-24T19:50:00-06:00")])
        self.assertNotIn("never export", json.dumps(events))
        self.assertEqual(events[0]["id"], "123456abcdef")

    def test_invalid_registry_prose_is_reported_without_source_change(self):
        path = self.root / "registry.yaml"
        original = 'agents:\n  - id: mac-mini\n    description: A rule: no secrets.\n'
        path.write_text(original)
        registry, issues = read_registry(path)
        self.assertEqual(registry["agents"][0]["description"], "A rule: no secrets.")
        self.assertEqual(len(issues), 1)
        self.assertEqual(path.read_text(), original)


if __name__ == "__main__":
    unittest.main()
