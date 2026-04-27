require('dotenv').config()
const express = require('express')
const cors = require('cors')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const db = require('./db')
const { processEntry } = require('./pipeline')

const app = express()
app.use(cors())
app.use(express.json())

// Serve uploaded videos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// Serve built frontend
app.use(express.static(path.join(__dirname, '../dist')))

// Multer config - save videos to server/uploads/
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.webm'
    cb(null, `${Date.now()}${ext}`)
  }
})
const upload = multer({ storage, limits: { fileSize: 200 * 1024 * 1024 } }) // 200MB

// --- Routes ---

// Create a new entry (upload video)
app.post('/api/entries', upload.single('video'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No video uploaded' })

  const today = new Date().toISOString().split('T')[0]
  const videoPath = req.file.path

  const result = db.prepare(`
    INSERT INTO entries (date, video_path, status) VALUES (?, ?, 'processing')
  `).run(today, videoPath)

  const entryId = result.lastInsertRowid

  // Run AI pipeline in background (don't await)
  processEntry(entryId, videoPath).catch(console.error)

  res.json({ id: entryId, status: 'processing' })
})

// Get all entries (for dashboard)
app.get('/api/entries', (req, res) => {
  const entries = db.prepare(`
    SELECT id, date, summary, mood_score, themes, status, created_at
    FROM entries ORDER BY created_at DESC
  `).all()

  res.json(entries.map(e => ({
    ...e,
    themes: e.themes ? JSON.parse(e.themes) : []
  })))
})

// Get a single entry (full detail)
app.get('/api/entries/:id', (req, res) => {
  const entry = db.prepare('SELECT * FROM entries WHERE id = ?').get(req.params.id)
  if (!entry) return res.status(404).json({ error: 'Not found' })

  res.json({
    ...entry,
    themes: entry.themes ? JSON.parse(entry.themes) : [],
    face_emotions: entry.face_emotions ? JSON.parse(entry.face_emotions) : [],
    voice_emotions: entry.voice_emotions ? JSON.parse(entry.voice_emotions) : []
  })
})

// Delete an entry
app.delete('/api/entries/:id', (req, res) => {
  const entry = db.prepare('SELECT video_path FROM entries WHERE id = ?').get(req.params.id)
  if (entry?.video_path && fs.existsSync(entry.video_path)) {
    fs.unlinkSync(entry.video_path)
  }
  db.prepare('DELETE FROM entries WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

// Catch-all for frontend routing
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, '../dist/index.html')
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath)
  } else {
    res.status(200).send('Run `npm run build` to serve the frontend, or use `npm run dev` for development.')
  }
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))
