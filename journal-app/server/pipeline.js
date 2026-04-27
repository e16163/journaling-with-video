require('dotenv').config()
const fs = require('fs')
const FormData = require('form-data')
const Anthropic = require('@anthropic-ai/sdk')
const { OpenAI } = require('openai')
const db = require('./db')

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

function updateEntry(id, fields) {
  const keys = Object.keys(fields)
  const set = keys.map(k => `${k} = ?`).join(', ')
  db.prepare(`UPDATE entries SET ${set} WHERE id = ?`).run(...keys.map(k => fields[k]), id)
}

async function runHume(videoPath) {
  const form = new FormData()
  form.append('file', fs.createReadStream(videoPath))
  form.append('json', JSON.stringify({ models: { face: {}, prosody: {} } }))

  const submitRes = await fetch('https://api.hume.ai/v0/batch/jobs', {
    method: 'POST',
    headers: { 'X-Hume-Api-Key': process.env.HUME_API_KEY, ...form.getHeaders() },
    body: form
  })

  if (!submitRes.ok) throw new Error(`Hume submit failed: ${await submitRes.text()}`)
  const { job_id } = await submitRes.json()

  // Poll until complete
  let status = 'IN_PROGRESS'
  let attempts = 0
  while (status === 'IN_PROGRESS' || status === 'QUEUED') {
    await new Promise(r => setTimeout(r, 4000))
    attempts++
    if (attempts > 90) throw new Error('Hume timed out')
    const pollRes = await fetch(`https://api.hume.ai/v0/batch/jobs/${job_id}`, {
      headers: { 'X-Hume-Api-Key': process.env.HUME_API_KEY }
    })
    const data = await pollRes.json()
    status = data.state?.status || 'UNKNOWN'
  }

  if (status !== 'COMPLETED') throw new Error(`Hume job failed with status: ${status}`)

  const predRes = await fetch(`https://api.hume.ai/v0/batch/jobs/${job_id}/predictions`, {
    headers: { 'X-Hume-Api-Key': process.env.HUME_API_KEY }
  })
  const predData = await predRes.json()

  // Extract and average face + voice emotions
  const faceFrames = []
  const voiceSegments = []

  for (const file of predData) {
    const preds = file?.results?.predictions?.[0]
    const faceGroups = preds?.models?.face?.grouped_predictions || []
    for (const group of faceGroups) {
      for (const frame of group.predictions || []) {
        if (frame.emotions) faceFrames.push(frame.emotions)
      }
    }
    const prosodyGroups = preds?.models?.prosody?.grouped_predictions || []
    for (const group of prosodyGroups) {
      for (const seg of group.predictions || []) {
        if (seg.emotions) voiceSegments.push(seg.emotions)
      }
    }
  }

  function avgEmotions(frames) {
    const sums = {}
    const counts = {}
    for (const frame of frames) {
      for (const e of frame) {
        sums[e.name] = (sums[e.name] || 0) + e.score
        counts[e.name] = (counts[e.name] || 0) + 1
      }
    }
    return Object.keys(sums)
      .map(name => ({ name, score: sums[name] / counts[name] }))
      .sort((a, b) => b.score - a.score)
  }

  return {
    face: faceFrames.length ? avgEmotions(faceFrames) : [],
    voice: voiceSegments.length ? avgEmotions(voiceSegments) : []
  }
}

async function runWhisper(videoPath) {
  const transcription = await openai.audio.transcriptions.create({
    file: fs.createReadStream(videoPath),
    model: 'whisper-1'
  })
  return transcription.text
}

async function runClaude(transcript) {
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `You are analyzing a personal journal entry. The user recorded a video talking about their day, and here is the transcript:

"${transcript}"

Respond ONLY with a valid JSON object (no markdown, no extra text) with these exact fields:
{
  "summary": "2-3 sentence warm, empathetic summary of their day",
  "themes": ["theme1", "theme2", "theme3"],
  "mood_score": 7.2,
  "mood_reasoning": "one sentence explaining the score"
}

mood_score is 1-10 (1=very negative, 10=very positive). Be accurate and nuanced.`
    }]
  })

  const text = msg.content[0].text.trim()
  try {
    return JSON.parse(text)
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0])
    throw new Error('Claude returned invalid JSON')
  }
}

async function processEntry(entryId, videoPath) {
  try {
    // Run Hume and Whisper in parallel
    const [humeResult, whisperResult] = await Promise.allSettled([
      runHume(videoPath),
      runWhisper(videoPath)
    ])

    const emotions = humeResult.status === 'fulfilled' ? humeResult.value : null
    const transcript = whisperResult.status === 'fulfilled' ? whisperResult.value : ''

    if (whisperResult.status === 'rejected') {
      console.error('Whisper failed:', whisperResult.reason)
    }
    if (humeResult.status === 'rejected') {
      console.error('Hume failed:', humeResult.reason)
    }

    // Run Claude with transcript
    let claudeResult = { summary: '', themes: [], mood_score: null, mood_reasoning: '' }
    if (transcript) {
      try {
        claudeResult = await runClaude(transcript)
      } catch (err) {
        console.error('Claude failed:', err)
      }
    }

    updateEntry(entryId, {
      transcript,
      summary: claudeResult.summary,
      themes: JSON.stringify(claudeResult.themes || []),
      mood_score: claudeResult.mood_score,
      face_emotions: emotions ? JSON.stringify(emotions.face) : null,
      voice_emotions: emotions ? JSON.stringify(emotions.voice) : null,
      status: 'complete'
    })
  } catch (err) {
    console.error('Pipeline error:', err)
    updateEntry(entryId, { status: 'error', summary: err.message })
  }
}

module.exports = { processEntry }
