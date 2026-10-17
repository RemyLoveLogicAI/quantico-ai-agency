# Mesh Observatory

Open `../mesh-observatory.html` from Cube's artifact sidebar. It is a standalone,
offline snapshot with light/dark themes, capability matching, inventory filters,
and an event evidence ledger. It does not contact or dispatch agents.

Refresh the snapshot, then reload the page:

```sh
/usr/bin/python3 /Users/lovelogic/agent-mesh/observatory.py --refresh
```

Omit `--refresh` to print JSON without changing files. Requires the existing
PyYAML installation available to `/usr/bin/python3`. No dependency was installed.
The collector reads the registry, local JSONL events, acknowledgements, the
heartbeat plist and launchd's job listing. Refresh modifies only the HTML file.

Health means a valid, non-expired Mac-to-WALDO heartbeat no older than two
scheduling intervals plus five minutes. Future timestamps beyond five minutes
are excluded. A local acknowledgement is a recorded claim, not authenticated
proof that the remote runtime received the event. Registry capabilities and
statuses are not independently verified.

The exported snapshot omits event payloads, registry descriptions, contact
details, device IDs and authentication fields. Agent names and capabilities
remain present; this is a local artifact, not a public publishing workflow.

## Findings from the initial inspection

- The heartbeat is loaded and a local event exists. WALDO's receipt is unconfirmed
  in the local mirror. `bus-sync-live` is a registry claim; the reviewed mesh
  directory contains no sync implementation. A sync could exist elsewhere.
- Three descriptions in `agent-registry/registry.yaml` contain unquoted `: `,
  making the document invalid YAML. The inspector quotes these descriptions in
  memory, reports the integrity issue and leaves the original file untouched.
- `agent-bus/bus.py` accepts unchecked acknowledgement IDs as path components and
  uses a read/modify/write acknowledgement sequence without locking. The review
  also found that publish accepts non-object JSON and unregistered addresses.
  These existing bus behaviors were inspected but not modified in this demo.

## Verification

```sh
cd /Users/lovelogic/agent-mesh
/usr/bin/python3 -m unittest -v test_observatory.py
```

Seven fixture tests cover missing/stale/future/expired heartbeats, malformed
envelopes, duplicates, acknowledgement validation, timestamp ordering, payload
exclusion and invalid registry prose without source modification.

Browser opening of the local file was denied by the browser URL security policy;
visual rendering has not been verified. Python dependency auditing could not run
because `pip_audit` is not installed. No packages or production services changed.
