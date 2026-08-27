/* =====================================================================
   THE HORIZON ACADEMY — FEES MANAGEMENT SYSTEM
   Backend server: Node.js + Express + SQLite (Node's built-in node:sqlite)
   Powered by ANASH · developed by Kafeel Azam
   ===================================================================== */

let DatabaseSync;
try {
  ({ DatabaseSync } = require('node:sqlite'));
} catch (e) {
  console.error('\n✗ This app needs Node.js v22.5.0 or newer (for the built-in SQLite module).');
  console.error(`  You are running ${process.version}. Please upgrade Node.js from https://nodejs.org and try again.\n`);
  process.exit(1);
}

const express = require('express');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = path.join(DATA_DIR, 'horizon.db');

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');

db.exec(`
  CREATE TABLE IF NOT EXISTS programs (
    id TEXT PRIMARY KEY,
    category TEXT,
    name TEXT,
    fee REAL,
    admissionFee REAL
  );
  CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    studentCode TEXT,
    name TEXT,
    father TEXT,
    contact TEXT,
    photo TEXT,
    programId TEXT,
    admissionDate TEXT,
    monthlyFee REAL,
    discount REAL,
    discountReason TEXT,
    admissionFee REAL
  );
  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    receiptNo INTEGER,
    studentId TEXT,
    date TEXT,
    amount REAL,
    purpose TEXT,
    mode TEXT,
    note TEXT
  );
  CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    date TEXT,
    amount REAL,
    category TEXT,
    note TEXT
  );
  CREATE TABLE IF NOT EXISTS kv (
    k TEXT PRIMARY KEY,
    v TEXT
  );
`);

const DEFAULT_PROGRAMS = [
  { id: '9-sci',        category: 'School',       name: '9th — Science',                 fee: 2500, admissionFee: 3000 },
  { id: '9-cs',         category: 'School',       name: '9th — Computer Science',        fee: 2500, admissionFee: 3000 },
  { id: '10-sci',       category: 'School',       name: '10th — Science',                fee: 2800, admissionFee: 3000 },
  { id: '10-cs',        category: 'School',       name: '10th — Computer Science',       fee: 2800, admissionFee: 3000 },
  { id: 'fy-med',       category: 'Intermediate', name: '1st Year — Medical',            fee: 3500, admissionFee: 4000 },
  { id: 'fy-pe',        category: 'Intermediate', name: '1st Year — Pre-Engineering',    fee: 3500, admissionFee: 4000 },
  { id: 'fy-cs',        category: 'Intermediate', name: '1st Year — Computer Science',   fee: 3500, admissionFee: 4000 },
  { id: 'fy-com',       category: 'Intermediate', name: '1st Year — Commerce',           fee: 3200, admissionFee: 4000 },
  { id: 'sy-med',       category: 'Intermediate', name: '2nd Year — Medical',            fee: 3500, admissionFee: 4000 },
  { id: 'sy-pe',        category: 'Intermediate', name: '2nd Year — Pre-Engineering',    fee: 3500, admissionFee: 4000 },
  { id: 'sy-cs',        category: 'Intermediate', name: '2nd Year — Computer Science',   fee: 3500, admissionFee: 4000 },
  { id: 'sy-com',       category: 'Intermediate', name: '2nd Year — Commerce',           fee: 3200, admissionFee: 4000 },
  { id: 'comp-course',  category: 'Skills',       name: 'Computer Courses',              fee: 2000, admissionFee: 1500 },
  { id: 'eng-lang',     category: 'Skills',       name: 'English Language',              fee: 1800, admissionFee: 1500 },
];

const DEFAULT_SETTINGS = {
  receiptSeq: 1000, studentSeq: 1,
  pinEnabled: false, pinHash: null,
  dueDay: 10, lateFeePerDay: 0, lateFeeCap: 0,
  centreAddress: '', centrePhone: '', receiptFooterNote: 'Thank you. Please keep this receipt for your records.',
};

// Seed default programmes on a brand-new database only.
const programCount = db.prepare('SELECT COUNT(*) AS c FROM programs').get().c;
if (programCount === 0) {
  const insertProgram = db.prepare(
    'INSERT INTO programs (id, category, name, fee, admissionFee) VALUES (?, ?, ?, ?, ?)'
  );
  db.exec('BEGIN');
  for (const p of DEFAULT_PROGRAMS) insertProgram.run(p.id, p.category, p.name, p.fee, p.admissionFee);
  db.exec('COMMIT');
  console.log(`Seeded ${DEFAULT_PROGRAMS.length} default programmes into a fresh database.`);
}

function getKV(key, fallback) {
  const row = db.prepare('SELECT v FROM kv WHERE k = ?').get(key);
  if (!row) return fallback;
  try { return JSON.parse(row.v); } catch (e) { return fallback; }
}
function setKV(key, val) {
  db.prepare(
    'INSERT INTO kv (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v'
  ).run(key, JSON.stringify(val));
}

function getState() {
  const programs = db.prepare('SELECT * FROM programs').all();
  const students = db.prepare('SELECT * FROM students').all();
  const payments = db.prepare('SELECT * FROM payments').all();
  const expenses = db.prepare('SELECT * FROM expenses').all();
  const settings = Object.assign({}, DEFAULT_SETTINGS, getKV('settings', {}));
  const trash = getKV('trash', { students: [], payments: [], expenses: [] });
  return { programs, students, payments, expenses, settings, trash };
}

function replaceTable(table, rows, columns) {
  db.exec(`DELETE FROM ${table}`);
  if (!Array.isArray(rows) || !rows.length) return;
  const placeholders = columns.map(() => '?').join(', ');
  const stmt = db.prepare(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`);
  for (const row of rows) {
    stmt.run(...columns.map((c) => (row[c] === undefined ? null : row[c])));
  }
}

function setState(body) {
  db.exec('BEGIN');
  try {
    replaceTable('programs', body.programs, ['id', 'category', 'name', 'fee', 'admissionFee']);
    replaceTable('students', body.students, [
      'id', 'studentCode', 'name', 'father', 'contact', 'photo',
      'programId', 'admissionDate', 'monthlyFee', 'discount', 'discountReason', 'admissionFee',
    ]);
    replaceTable('payments', body.payments, ['id', 'receiptNo', 'studentId', 'date', 'amount', 'purpose', 'mode', 'note']);
    replaceTable('expenses', body.expenses, ['id', 'date', 'amount', 'category', 'note']);
    setKV('settings', body.settings || {});
    setKV('trash', body.trash || { students: [], payments: [], expenses: [] });
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

const app = express();
app.use(express.json({ limit: '20mb' })); // generous limit to allow compressed student photos
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.get('/api/state', (req, res) => {
  try {
    res.json(getState());
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/state', (req, res) => {
  try {
    setState(req.body || {});
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('');
  console.log('  The Horizon Academy — Fees Management System');
  console.log('  Powered by ANASH · developed by Kafeel Azam');
  console.log('');
  console.log(`  Server running at http://localhost:${PORT}`);
  console.log(`  Database file:    ${DB_PATH}`);
  console.log('');
  console.log('  Open the URL above in a browser. Other devices on the same');
  console.log('  network can use this computer\'s local IP instead of localhost');
  console.log('  (e.g. http://192.168.1.x:3000) to reach the same shared data.');
  console.log('');
});
