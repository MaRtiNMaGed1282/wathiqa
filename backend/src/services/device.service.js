const crypto = require("crypto");
const os = require("os");
const db = require("../config/sqlite");

const DEVICE_OFFLINE_AFTER_MS = 150000;

function ensureDeviceTable() {
  db.run(`CREATE TABLE IF NOT EXISTS office_devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL UNIQUE,
    device_token_hash TEXT NOT NULL UNIQUE,
    device_name TEXT NOT NULL,
    device_role TEXT NOT NULL DEFAULT 'client',
    ip_address TEXT,
    platform TEXT,
    app_version TEXT,
    first_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL DEFAULT 'offline',
    revoked_at DATETIME
  )`);
}

ensureDeviceTable();

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

function createDeviceCredentials() {
  return {
    deviceId: crypto.randomUUID(),
    deviceToken: crypto.randomBytes(32).toString("base64url"),
  };
}

function registerDevice({ deviceName, deviceId, deviceToken, ipAddress, platform, appVersion }) {
  return new Promise((resolve, reject) => {
    const id = deviceId || crypto.randomUUID();
    const token = deviceToken || crypto.randomBytes(32).toString("base64url");
    const name = String(deviceName || os.hostname()).trim().slice(0, 120) || "Wathiqa Client";
    const tokenHash = hashToken(token);
    db.run(
      `INSERT INTO office_devices
        (device_id, device_token_hash, device_name, device_role, ip_address, platform, app_version, status, revoked_at)
       VALUES (?, ?, ?, 'client', ?, ?, ?, 'online', NULL)
       ON CONFLICT(device_id) DO UPDATE SET
        device_token_hash = excluded.device_token_hash,
        device_name = excluded.device_name,
        ip_address = excluded.ip_address,
        platform = excluded.platform,
        app_version = excluded.app_version,
        status = 'online',
        last_seen_at = CURRENT_TIMESTAMP,
        revoked_at = NULL`,
      [id, tokenHash, name, ipAddress || null, platform || null, appVersion || null],
      function (error) {
        if (error) return reject(error);
        resolve({ deviceId: id, deviceToken: token, deviceName: name });
      }
    );
  });
}

function touchDevice(deviceToken, metadata = {}) {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE office_devices
       SET last_seen_at = CURRENT_TIMESTAMP,
           status = 'online',
           ip_address = COALESCE(?, ip_address),
           platform = COALESCE(?, platform),
           app_version = COALESCE(?, app_version)
       WHERE device_token_hash = ? AND revoked_at IS NULL`,
      [metadata.ipAddress || null, metadata.platform || null, metadata.appVersion || null, hashToken(deviceToken)],
      function (error) {
        if (error) return reject(error);
        resolve(this.changes > 0);
      }
    );
  });
}

function listDevices() {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT device_id AS deviceId, device_name AS deviceName, device_role AS deviceRole,
              ip_address AS ipAddress, platform, app_version AS appVersion,
              first_seen_at AS firstSeenAt, last_seen_at AS lastSeenAt,
              status, revoked_at AS revokedAt
       FROM office_devices
       ORDER BY last_seen_at DESC`,
      [],
      (error, rows) => {
        if (error) return reject(error);
        const now = Date.now();
        resolve(rows.map((row) => {
          if (row.status === "revoked") return row;
          const lastSeen = Date.parse(row.lastSeenAt || "");
          const isRecent = Number.isFinite(lastSeen) && now - lastSeen <= DEVICE_OFFLINE_AFTER_MS;
          return { ...row, status: isRecent ? "online" : "offline" };
        }));
      }
    );
  });
}

function revokeDevice(deviceId) {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE office_devices SET revoked_at = CURRENT_TIMESTAMP, status = 'revoked' WHERE device_id = ?`,
      [deviceId],
      function (error) {
        if (error) return reject(error);
        resolve(this.changes > 0);
      }
    );
  });
}

module.exports = {
  createDeviceCredentials,
  registerDevice,
  touchDevice,
  listDevices,
  revokeDevice,
  DEVICE_OFFLINE_AFTER_MS,
};
