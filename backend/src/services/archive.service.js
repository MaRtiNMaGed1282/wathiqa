'use strict';

const db = require('../config/sqlite');

const ENTITY_CONFIG = Object.freeze({
  client: { table: 'clients', idColumn: 'id', labelColumn: 'full_name', module: 'clients' },
  case: { table: 'legal_cases', idColumn: 'case_id', labelColumn: 'case_title', module: 'cases' },
  service: { table: 'legal_services', idColumn: 'service_id', labelColumn: 'service_title', module: 'services' },
});

function ensureArchiveTable() {
  db.run(`
    CREATE TABLE IF NOT EXISTS archived_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      record_id INTEGER NOT NULL,
      reason TEXT,
      archived_by INTEGER NOT NULL,
      archived_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      restored_by INTEGER,
      restored_at DATETIME,
      UNIQUE(entity_type, record_id),
      FOREIGN KEY(archived_by) REFERENCES users(id),
      FOREIGN KEY(restored_by) REFERENCES users(id)
    )
  `);
}

function getConfig(entityType) {
  const config = ENTITY_CONFIG[String(entityType || '').toLowerCase()];
  if (!config) {
    const error = new Error('نوع السجل غير صالح');
    error.status = 400;
    throw error;
  }
  return config;
}

function getRecord(entityType, recordId) {
  const config = getConfig(entityType);
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT ${config.idColumn} AS id, ${config.labelColumn} AS label FROM ${config.table} WHERE ${config.idColumn} = ?`,
      [recordId],
      (err, row) => err ? reject(err) : resolve(row || null),
    );
  });
}

function isArchived(entityType, recordId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT id FROM archived_records WHERE entity_type = ? AND record_id = ? AND restored_at IS NULL`,
      [entityType, recordId],
      (err, row) => err ? reject(err) : resolve(Boolean(row)),
    );
  });
}

module.exports = { ENTITY_CONFIG, ensureArchiveTable, getConfig, getRecord, isArchived };
