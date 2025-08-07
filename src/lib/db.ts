import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.resolve(process.cwd(), 'local.db');

let db: import('better-sqlite3').Database;

try {
  db = new Database(dbPath);
  console.log('Connected to the SQLite database.');

  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS scraped_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL UNIQUE,
      content TEXT NOT NULL,
      scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      liked BOOLEAN DEFAULT FALSE,
      status TEXT DEFAULT 'complete'
    );
  `;
  db.exec(createTableSQL);

  // Ensure "status" column exists when upgrading from an older schema
  try {
    db.prepare('SELECT status FROM scraped_data LIMIT 1').get();
  } catch (err) {
    db.exec('ALTER TABLE scraped_data ADD COLUMN status TEXT DEFAULT "complete"');
  }
  console.log('Table "scraped_data" is ready.');
} catch (error) {
  console.error('Error connecting to the database:', error);
  process.exit(1);
}

export default db;
