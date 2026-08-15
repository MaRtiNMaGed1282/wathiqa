'use strict';

const db = require('../config/sqlite');
const logActivity = require('../utils/activityLogger');
const { createNotification } = require('../utils/notificationService');
const { isValidMoney } = require('../utils/validation');

function run(sql, params = []) { return new Promise((resolve, reject) => db.run(sql, params, function (err) { if (err) reject(err); else resolve(this); })); }
function get(sql, params = []) { return new Promise((resolve, reject) => db.get(sql, params, (err, row) => err ? reject(err) : resolve(row || null))); }
function all(sql, params = []) { return new Promise((resolve, reject) => db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows || []))); }
function validId(value) { return /^\d+$/.test(String(value)) && Number(value) > 0; }
function normalizeMoney(value) { return Math.round(Number(value) * 100) / 100; }

async function ensureInvoiceTables() {
  await run(`CREATE TABLE IF NOT EXISTS invoices (
    invoice_id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_number TEXT NOT NULL UNIQUE,
    client_id INTEGER NOT NULL,
    case_id INTEGER,
    service_id INTEGER,
    issue_date TEXT NOT NULL,
    due_date TEXT,
    status TEXT NOT NULL DEFAULT 'issued',
    subtotal REAL NOT NULL DEFAULT 0,
    discount REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    notes TEXT,
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(client_id) REFERENCES clients(id),
    FOREIGN KEY(case_id) REFERENCES legal_cases(case_id),
    FOREIGN KEY(service_id) REFERENCES legal_services(service_id),
    FOREIGN KEY(created_by) REFERENCES users(id)
  )`);
  await run(`CREATE TABLE IF NOT EXISTS invoice_items (
    invoice_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL,
    description TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 1,
    unit_price REAL NOT NULL DEFAULT 0,
    line_total REAL NOT NULL DEFAULT 0,
    FOREIGN KEY(invoice_id) REFERENCES invoices(invoice_id) ON DELETE CASCADE
  )`);
  const columns = await all(`PRAGMA table_info(payments)`);
  if (!columns.some((column) => column.name === 'invoice_id')) await run(`ALTER TABLE payments ADD COLUMN invoice_id INTEGER`);
}

ensureInvoiceTables().catch((error) => console.error('Invoice schema initialization failed:', error.message));

function buildNumber() {
  const year = new Date().getFullYear();
  return get(`SELECT invoice_number FROM invoices WHERE invoice_number LIKE ? ORDER BY invoice_id DESC LIMIT 1`, [`INV-${year}-%`]).then((last) => {
    const sequence = last ? Number(String(last.invoice_number).split('-').pop()) + 1 : 1;
    return `INV-${year}-${String(sequence).padStart(5, '0')}`;
  });
}

exports.list = async (req, res) => {
  try {
    const type = String(req.query.status || '').trim();
    const search = String(req.query.search || '').trim();
    const params = [];
    const where = [];
    if (type) { where.push('i.status = ?'); params.push(type); }
    if (search) { where.push('(i.invoice_number LIKE ? OR c.full_name LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
    const rows = await all(`SELECT i.*, c.full_name AS client_name, lc.court_case_number AS case_number, ls.service_title AS service_name,
      COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.invoice_id = i.invoice_id),0) AS paid
      FROM invoices i LEFT JOIN clients c ON c.id=i.client_id LEFT JOIN legal_cases lc ON lc.case_id=i.case_id LEFT JOIN legal_services ls ON ls.service_id=i.service_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY i.invoice_id DESC`, params);
    res.json(rows.map((row) => ({ ...row, remaining: normalizeMoney(Math.max(0, Number(row.total) - Number(row.paid))), computed_status: Number(row.paid) <= 0 ? row.status : Number(row.paid) >= Number(row.total) ? 'paid' : 'partial' })));
  } catch (error) { console.error('Invoice list failed:', error); res.status(500).json({ message: 'فشل تحميل الفواتير' }); }
};

exports.get = async (req, res) => {
  try {
    const id = Number(req.params.id); if (!validId(id)) return res.status(400).json({ message: 'رقم الفاتورة غير صالح' });
    const invoice = await get(`SELECT i.*, c.full_name AS client_name, c.phone AS client_phone, c.address AS client_address, c.national_id, lc.court_case_number AS case_number, lc.case_title, ls.service_title AS service_name FROM invoices i LEFT JOIN clients c ON c.id=i.client_id LEFT JOIN legal_cases lc ON lc.case_id=i.case_id LEFT JOIN legal_services ls ON ls.service_id=i.service_id WHERE i.invoice_id=?`, [id]);
    if (!invoice) return res.status(404).json({ message: 'الفاتورة غير موجودة' });
    invoice.items = await all(`SELECT * FROM invoice_items WHERE invoice_id=? ORDER BY invoice_item_id ASC`, [id]);
    invoice.payments = await all(`SELECT payment_id, amount, payment_date, payment_method, notes FROM payments WHERE invoice_id=? ORDER BY payment_date DESC, payment_id DESC`, [id]);
    invoice.paid = normalizeMoney(invoice.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0));
    invoice.remaining = normalizeMoney(Math.max(0, Number(invoice.total) - invoice.paid));
    res.json(invoice);
  } catch (error) { console.error('Invoice get failed:', error); res.status(500).json({ message: 'فشل تحميل الفاتورة' }); }
};

exports.create = async (req, res) => {
  const { client_id, case_id, service_id, issue_date, due_date, discount, notes, items } = req.body || {};
  try {
    if (!validId(client_id)) return res.status(400).json({ message: 'الموكل مطلوب' });
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ message: 'يجب إضافة بند واحد على الأقل' });
    if (case_id && service_id) return res.status(400).json({ message: 'الفاتورة ترتبط بقضية أو خدمة واحدة فقط' });
    if (case_id && !validId(case_id)) return res.status(400).json({ message: 'رقم القضية غير صالح' });
    if (service_id && !validId(service_id)) return res.status(400).json({ message: 'رقم الخدمة غير صالح' });
    const client = await get('SELECT id, full_name FROM clients WHERE id=?', [Number(client_id)]); if (!client) return res.status(404).json({ message: 'الموكل غير موجود' });
    if (case_id) { const row = await get('SELECT case_id, client_id FROM legal_cases WHERE case_id=?', [Number(case_id)]); if (!row) return res.status(404).json({ message: 'القضية غير موجودة' }); if (Number(row.client_id) !== Number(client_id)) return res.status(400).json({ message: 'القضية لا تخص الموكل المحدد' }); }
    if (service_id) { const row = await get('SELECT service_id, client_id FROM legal_services WHERE service_id=?', [Number(service_id)]); if (!row) return res.status(404).json({ message: 'الخدمة غير موجودة' }); if (Number(row.client_id) !== Number(client_id)) return res.status(400).json({ message: 'الخدمة لا تخص الموكل المحدد' }); }

    const cleanItems = items.map((item) => {
      const description = String(item.description || '').trim(); const quantity = Number(item.quantity); const unitPrice = Number(item.unit_price);
      if (!description || !Number.isFinite(quantity) || quantity <= 0 || !isValidMoney(unitPrice)) throw Object.assign(new Error('بيانات بنود الفاتورة غير صالحة'), { status: 400 });
      const lineTotal = normalizeMoney(quantity * unitPrice); return { description, quantity, unitPrice, lineTotal };
    });
    const subtotal = normalizeMoney(cleanItems.reduce((sum, item) => sum + item.lineTotal, 0));
    const cleanDiscount = discount === undefined || discount === null || discount === '' ? 0 : Number(discount);
    if (!Number.isFinite(cleanDiscount) || cleanDiscount < 0 || cleanDiscount > subtotal) return res.status(400).json({ message: 'الخصم غير صالح' });
    const total = normalizeMoney(subtotal - cleanDiscount);
    const invoiceNumber = await buildNumber();

    await run('BEGIN IMMEDIATE');
    try {
      const result = await run(`INSERT INTO invoices (invoice_number, client_id, case_id, service_id, issue_date, due_date, status, subtotal, discount, total, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, 'issued', ?, ?, ?, ?, ?)`, [invoiceNumber, Number(client_id), case_id ? Number(case_id) : null, service_id ? Number(service_id) : null, issue_date || new Date().toISOString().slice(0,10), due_date || null, subtotal, cleanDiscount, total, notes || null, req.user.id]);
      for (const item of cleanItems) await run(`INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, line_total) VALUES (?, ?, ?, ?, ?)`, [result.lastID, item.description, item.quantity, item.unitPrice, item.lineTotal]);
      await run('COMMIT');
      logActivity({ module: 'invoice', record_id: result.lastID, action: 'created', description: `تم إنشاء الفاتورة ${invoiceNumber}`, user_id: req.user.id });
      createNotification({ title: 'فاتورة جديدة', message: `تم إنشاء الفاتورة ${invoiceNumber} للموكل ${client.full_name}`, type: 'info', module: 'invoice', record_id: result.lastID, user_id: req.user.id }).catch(() => {});
      return res.status(201).json({ message: 'تم إنشاء الفاتورة بنجاح', invoice_id: result.lastID, invoice_number: invoiceNumber });
    } catch (error) { await run('ROLLBACK').catch(() => {}); throw error; }
  } catch (error) { console.error('Invoice create failed:', error); return res.status(error.status || 500).json({ message: error.status ? error.message : 'فشل إنشاء الفاتورة' }); }
};

exports.cancel = async (req, res) => {
  try {
    const id = Number(req.params.id); if (!validId(id)) return res.status(400).json({ message: 'رقم الفاتورة غير صالح' });
    const invoice = await get('SELECT * FROM invoices WHERE invoice_id=?', [id]); if (!invoice) return res.status(404).json({ message: 'الفاتورة غير موجودة' });
    const paid = await get('SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE invoice_id=?', [id]); if (Number(paid?.total || 0) > 0) return res.status(400).json({ message: 'لا يمكن إلغاء فاتورة عليها مدفوعات' });
    await run("UPDATE invoices SET status='cancelled', updated_at=CURRENT_TIMESTAMP WHERE invoice_id=?", [id]);
    logActivity({ module: 'invoice', record_id: id, action: 'cancelled', description: `تم إلغاء الفاتورة ${invoice.invoice_number}`, user_id: req.user.id });
    res.json({ message: 'تم إلغاء الفاتورة بنجاح' });
  } catch (error) { console.error('Invoice cancel failed:', error); res.status(500).json({ message: 'فشل إلغاء الفاتورة' }); }
};

exports.recordPayment = async (req, res) => {
  const id = Number(req.params.id); const { amount, payment_date, payment_method, notes } = req.body || {};
  try {
    if (!validId(id) || !isValidMoney(amount) || Number(amount) <= 0 || !payment_date || !String(payment_method || '').trim()) return res.status(400).json({ message: 'بيانات الدفعة غير صالحة' });
    const invoice = await get('SELECT * FROM invoices WHERE invoice_id=?', [id]); if (!invoice) return res.status(404).json({ message: 'الفاتورة غير موجودة' });
    if (invoice.status === 'cancelled') return res.status(400).json({ message: 'لا يمكن الدفع لفاتورة ملغاة' });
    const paid = await get('SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE invoice_id=?', [id]); const remaining = normalizeMoney(Number(invoice.total) - Number(paid?.total || 0));
    if (Number(amount) > remaining) return res.status(400).json({ message: 'قيمة الدفعة تتجاوز المتبقي على الفاتورة' });
    const result = await run('INSERT INTO payments (case_id, service_id, amount, payment_date, payment_method, notes, invoice_id) VALUES (?, ?, ?, ?, ?, ?, ?)', [invoice.case_id, invoice.service_id, Number(amount), payment_date, String(payment_method).trim(), notes || null, id]);
    const newPaid = normalizeMoney(Number(paid?.total || 0) + Number(amount));
    await run("UPDATE invoices SET status=?, updated_at=CURRENT_TIMESTAMP WHERE invoice_id=?", [newPaid >= Number(invoice.total) ? 'paid' : 'issued', id]);
    logActivity({ module: 'invoice', record_id: id, action: 'payment', description: `تم تسجيل دفعة على الفاتورة ${invoice.invoice_number}`, user_id: req.user.id });
    res.status(201).json({ message: 'تم تسجيل الدفعة بنجاح', payment_id: result.lastID, paid: newPaid, remaining: normalizeMoney(Number(invoice.total) - newPaid) });
  } catch (error) { console.error('Invoice payment failed:', error); res.status(500).json({ message: 'فشل تسجيل الدفعة' }); }
};
