# Wathiqa Multi-Device — Phase 15 Status

## Scope

Phase 15 is the functional verification layer for the multi-device deployment architecture.

The frozen deployment plan requires three scenarios:

1. Two devices: server + client.
2. Three devices: server + two clients.
3. Concurrent access between server and clients.

The plan requires verifying shared records, centralized files, payments, updates, and consistent server state.

## Implemented in this phase

- Added `backend/scripts/multi-device-functional-test.js`.
- Added `npm run test:multi-device`.
- The harness verifies:
  - server health;
  - server identity and reported Wathiqa version;
  - server information;
  - compatible client version acceptance;
  - incompatible major-version rejection;
  - paired-device heartbeat when `WATHIQA_TEST_DEVICE_TOKEN` is supplied;
  - concurrent system requests against the same server.
- The harness is read-only unless a real paired device token is supplied for the heartbeat test.
- No frontend files were modified.

## Running the automated server checks

Start a Wathiqa server in the intended server mode, then run:

```powershell
npm run test:multi-device
```

Optional server URL:

```powershell
$env:WATHIQA_TEST_SERVER_URL='http://192.168.1.100:5000'
npm run test:multi-device
```

Optional paired device token:

```powershell
$env:WATHIQA_TEST_DEVICE_TOKEN='<device-token>'
npm run test:multi-device
```

## Required physical acceptance tests

### Scenario 1 — Two devices

- PC1 = Server.
- PC2 = Client.
- Pair PC2 with PC1.
- Create a case on PC2.
- Verify the case on PC1.
- Upload a document on PC1.
- Open it from PC2.
- Add a payment on PC2.
- Verify it on PC1.
- Update the case on PC1.
- Refresh PC2 and verify the update.

### Scenario 2 — Three devices

- PC1 = Server.
- PC2 = Client.
- PC3 = Client.
- Pair both clients with PC1.
- Perform simultaneous reads/writes from PC2 and PC3.
- Verify the resulting records exist once in the server database.

### Scenario 3 — Concurrent edits

- PC2 creates a record.
- PC3 reads the record.
- PC1 updates the record.
- PC2 refreshes.
- Verify all devices observe the server-authoritative state.

## Important release rule

The physical scenarios above cannot be marked PASS from source inspection alone. They require actual Windows machines on the same LAN and verification of the resulting database/file state.

Until those tests are executed, Phase 15 remains **implementation complete / physical acceptance pending**.
