# Daily Journal

A video journaling app with AI emotion analysis, transcription, and mood tracking.

## Setup

**1. Install dependencies**
```bash
npm install
```

**2. Set up API keys**
```bash
cp .env.example .env
```
Then open `.env` and fill in your keys:
- `HUME_API_KEY` — from [hume.ai](https://hume.ai) (free tier available)
- `OPENAI_API_KEY` — from [platform.openai.com](https://platform.openai.com) (for Whisper transcription)
- `ANTHROPIC_API_KEY` — from [console.anthropic.com](https://console.anthropic.com) (for summaries)

**3. Run in development**
```bash
npm run dev
```
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## How it works

1. Record a short video talking about your day
2. The video is saved locally and sent to:
   - **Hume AI** — analyzes face + voice emotions simultaneously (48 emotion dimensions each)
   - **OpenAI Whisper** — transcribes what you said
   - **Claude** — summarizes your entry and gives a mood score (1–10)
3. Results appear on the entry page once processing completes (~1–3 min)
4. The dashboard shows all your entries, mood over time, and your streak

## Notes

- Videos are saved to `server/uploads/`
- Database is a single file at `server/journal.db`
- Hume's Expression Measurement API is being sunset June 14, 2026 — check their docs for the replacement

## Project structure

```
├── server/
│   ├── index.js      # Express API server
│   ├── db.js         # SQLite database
│   ├── pipeline.js   # Hume + Whisper + Claude pipeline
│   └── uploads/      # Saved videos
└── src/
    ├── pages/
    │   ├── Dashboard.jsx   # Entry list + mood chart
    │   ├── Record.jsx      # Video recording
    │   └── EntryView.jsx   # Single entry detail
    └── components/
        ├── EmotionBars.jsx  # Face + voice emotion bars
        └── MoodChart.jsx    # Recharts mood over time
```
