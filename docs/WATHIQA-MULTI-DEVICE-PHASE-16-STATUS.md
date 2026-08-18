# Wathiqa Multi-Device — Phase 16 Status

## Status

Implementation complete for production server/client packaging structure.

## Packages

### Server

Build command:

```text
npm run build:server
```

Output directory:

```text
dist-server/
```

Artifact:

```text
Wathiqa-Server-Installer.exe
```

The server package contains the backend, Electron server runtime, frontend, and the initial database resource required to bootstrap the authoritative server database.

### Client

Build command:

```text
npm run build:client
```

Output directory:

```text
dist-client/
```

Artifact:

```text
Wathiqa-Client-Installer.exe
```

The client package deliberately excludes:

- backend source
- bundled SQLite database
- server-only runtime resources
- server secrets
- database credentials
- private signing material

The client starts in client mode only after deployment configuration is supplied by Wathiqa Office Setup.

### Office Setup

Build command:

```text
npm run build:office-setup
```

Artifact:

```text
Wathiqa-Office-Setup-Installer.exe
```

## Production build sequence

1. `npm ci`
2. `npm run test:deployment`
3. `npm run test:multi-device`
4. `npm run build:server`
5. `npm run build:client`
6. `npm run build:office-setup`
7. Install all three artifacts on clean Windows test machines.
8. Execute the complete two-PC/three-PC acceptance plan.

## Security boundary

The client artifact must not contain:

```text
JWT_SECRET
LICENSE_SECRET
server-secrets.json
wathiqa.db
```

The server artifact may contain the bootstrap database resource, but the live database is copied to Electron user data and is the authoritative office database.

## Frontend restriction

No existing Wathiqa business frontend files were changed for Phase 16.

## Release gate

A production release must not be declared until the Windows build completes successfully and the physical two-PC acceptance tests pass.
