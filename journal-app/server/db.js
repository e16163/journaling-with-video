const Database = require('better-sqlite3')
const path = require('path')

const db = new Database(path.join(__dirname, 'journal.db'))

db.exec(`
  CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    video_path TEXT,
    transcript TEXT,
    summary TEXT,
    themes TEXT,
    mood_score REAL,
    face_emotions TEXT,
    voice_emotions TEXT,
    status TEXT DEFAULT 'processing',
    created_at TEXT DEFAULT (datetime('now'))
  )
`)

module.exports = db
