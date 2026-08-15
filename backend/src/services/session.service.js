'use strict';

const crypto = require('crypto');
const db = require('../config/sqlite');

const SESSION_DAYS = 7;

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function createSession({ userId, jti, token, req }) {
  return new Promise((resolve, reject) => {
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
    db.run(
      `INSERT INTO user_sessions
        (user_id, jti, token_hash, ip_address, user_agent, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        jti,
        hashToken(token),
        req?.ip || req?.socket?.remoteAddress || null,
        req?.get?.('user-agent') || null,
        expiresAt,
      ],
      function (err) {
        if (err) return reject(err);
        resolve({ id: this.lastID, expiresAt });
      },
    );
  });
}

function getActiveSession(jti, token) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT id, user_id, expires_at, revoked_at
       FROM user_sessions
       WHERE jti = ? AND token_hash = ? AND revoked_at IS NULL
         AND datetime(expires_at) > datetime('now')`,
      [jti, hashToken(token)],
      (err, row) => err ? reject(err) : resolve(row || null),
    );
  });
}

function revokeSession(jti, userId) {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE user_sessions SET revoked_at = CURRENT_TIMESTAMP
       WHERE jti = ? AND user_id = ? AND revoked_at IS NULL`,
      [jti, userId],
      function (err) { err ? reject(err) : resolve(this.changes); },
    );
  });
}

function revokeAllSessions(userId, exceptJti = null) {
  return new Promise((resolve, reject) => {
    const sql = exceptJti
      ? `UPDATE user_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = ? AND jti <> ? AND revoked_at IS NULL`
      : `UPDATE user_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = ? AND revoked_at IS NULL`;
    const params = exceptJti ? [userId, exceptJti] : [userId];
    db.run(sql, params, function (err) { err ? reject(err) : resolve(this.changes); });
  });
}

function listSessions(userId) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT id, jti, ip_address, user_agent, created_at, last_seen_at, expires_at, revoked_at
       FROM user_sessions
       WHERE user_id = ?
       ORDER BY datetime(created_at) DESC`,
      [userId],
      (err, rows) => err ? reject(err) : resolve(rows || []),
    );
  });
}

function touchSession(jti) {
  db.run(`UPDATE user_sessions SET last_seen_at = CURRENT_TIMESTAMP WHERE jti = ? AND revoked_at IS NULL`, [jti]);
}

module.exports = {
  SESSION_DAYS,
  createSession,
  getActiveSession,
  revokeSession,
  revokeAllSessions,
  listSessions,
  touchSession,
};
