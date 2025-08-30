import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import * as schema from './schema';

const sqlite = new Database('database.sqlite');
export const db = drizzle({ client: sqlite, schema });

// Enable foreign keys
sqlite.run('PRAGMA foreign_keys = ON');

// Initialize database with tables if they don't exist
try {
  // Create datasets table
  sqlite.run(`
    CREATE TABLE IF NOT EXISTS datasets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Create videos table
  sqlite.run(`
    CREATE TABLE IF NOT EXISTS videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dataset_id INTEGER NOT NULL REFERENCES datasets(id),
      filename TEXT NOT NULL,
      filepath TEXT NOT NULL,
      duration REAL NOT NULL,
      original_width INTEGER NOT NULL,
      original_height INTEGER NOT NULL,
      start_time REAL NOT NULL DEFAULT 0.0,
      resolution TEXT NOT NULL DEFAULT '1280x720' CHECK (resolution IN ('1280x720', '720x1280', '768x768')),
      crop_x INTEGER NOT NULL DEFAULT 0,
      crop_y INTEGER NOT NULL DEFAULT 0,
      crop_width INTEGER NOT NULL,
      crop_height INTEGER NOT NULL,
      fps INTEGER,
      frame_count INTEGER,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'error'))
    )
  `);
  
  console.log('Database initialized successfully');
} catch (error) {
  console.error('Error initializing database:', error);
}
