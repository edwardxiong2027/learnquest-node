'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.LEARNQUEST_DB ||
  path.join(__dirname, '..', 'database', 'learnquest.db');

let db = null;

/**
 * Initialize the database connection and run schema migrations.
 * Creates the database directory if it does not exist.
 * Sets pragmas for performance and correctness.
 */
function initDatabase() {
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(DB_PATH);

  // Performance and correctness pragmas
  db.pragma('journal_mode = OFF');
  db.pragma('synchronous = OFF');
  db.pragma('foreign_keys = ON');

  // Read and execute the schema file
  const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema file not found: ${schemaPath}`);
  }

  const schema = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schema);

  return db;
}

/**
 * Return the singleton database connection.
 * Throws if initDatabase() has not been called first.
 */
function getDb() {
  if (!db) {
    throw new Error(
      'Database not initialized. Call initDatabase() before getDb().'
    );
  }
  return db;
}

module.exports = { initDatabase, getDb };
