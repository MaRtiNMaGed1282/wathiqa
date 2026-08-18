# Wathiqa Multi-Device — Phase 7 Status

## Scope

Phase 7 — Windows Firewall and Network Handling.

Source plan requirements:

- Detect the active network.
- Detect whether the configured TCP port is accessible.
- Configure the Windows Firewall rule during server setup.
- Avoid broad public exposure by default.
- Provide diagnostics for firewall failures.
- Keep the server port configurable.

## Implemented

### 1. Active network detection

`electron/windows-firewall.js` now reports:

- Hostname.
- IPv4 adapters.
- Local IPv4 addresses.
- Netmasks.
- Preferred address.
- Windows connection profiles when running on Windows.
- Whether a Private network profile is available.

### 2. Firewall configuration

Server setup now automatically attempts to create/update:

```text
Wathiqa Office Server <PORT>
```

The rule is restricted to:

```text
Direction: Inbound
Protocol: TCP
LocalPort: configured Wathiqa port
Profile: Private
RemoteAddress: LocalSubnet
Action: Allow
```

This deliberately does not create a broad Internet-facing rule.

Windows elevation is requested only when the firewall rule actually needs administrative privileges.

### 3. Firewall diagnostics

Added IPC operations for:

- Inspecting the current Wathiqa firewall rule.
- Configuring/reconfiguring the rule.
- Testing local TCP port reachability.

The setup application exposes the diagnostics through its existing state/configuration bridge.

### 4. Configurable port

The existing setup port remains configurable from `1` through `65535`, and the firewall rule uses that exact configured port.

### 5. LAN discovery compatibility

The existing UDP discovery service remains enabled only for server mode. It advertises the configured Wathiqa TCP port to clients on the local network.

## Security decision

The implementation intentionally uses the Windows `Private` profile and `LocalSubnet` scope instead of allowing the Wathiqa TCP port on every network/profile.

If the active Windows network is classified as Public, setup reports that condition rather than silently broadening the firewall rule.

## Runtime verification status

Repository-side implementation is complete for Phase 7.

Actual Windows runtime verification still requires a Windows machine because this environment cannot execute Windows PowerShell / Windows Defender Firewall operations.

Required final runtime checks:

1. Run Office Setup on Windows.
2. Choose Main Server.
3. Confirm UAC elevation prompt.
4. Confirm `Wathiqa Office Server <PORT>` exists.
5. Confirm Profile is Private.
6. Confirm RemoteAddress is LocalSubnet.
7. Start Wathiqa server.
8. Test TCP connectivity from a second PC on the same LAN.
9. Test discovery from the second PC.
10. Test client connection.
11. Verify that changing the server port creates the corresponding firewall rule.
12. Verify that a Public network does not become broadly exposed.

## Frontend restriction

No existing Wathiqa business-application frontend page was modified. Changes are confined to the deployment/setup layer and backend network-discovery support.
