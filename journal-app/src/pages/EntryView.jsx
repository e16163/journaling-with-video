import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import EmotionBars from '../components/EmotionBars'

function moodColor(score) {
  if (score == null) return 'var(--text-hint)'
  if (score >= 7) return '#15803D'
  if (score >= 4) return '#D97706'
  return '#B91C1C'
}

function moodBg(score) {
  if (score == null) return '#F5F5F5'
  if (score >= 7) return '#F0FDF4'
  if (score >= 4) return '#FFFBEB'
  return '#FEF2F2'
}

export default function EntryView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [entry, setEntry] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showTranscript, setShowTranscript] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const pollRef = useRef(null)

  const fetchEntry = async () => {
    const res = await fetch(`/api/entries/${id}`)
    if (!res.ok) { navigate('/'); return }
    const data = await res.json()
    setEntry(data)
    setLoading(false)
    return data
  }

  useEffect(() => {
    fetchEntry().then(data => {
      if (data?.status === 'processing') {
        pollRef.current = setInterval(async () => {
          const updated = await fetchEntry()
          if (updated?.status !== 'processing') {
            clearInterval(pollRef.current)
          }
        }, 4000)
      }
    })
    return () => clearInterval(pollRef.current)
  }, [id])

  const deleteEntry = async () => {
    if (!confirm('Delete this entry? This cannot be undone.')) return
    setDeleting(true)
    await fetch(`/api/entries/${id}`, { method: 'DELETE' })
    navigate('/')
  }

  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <div className="spinner" />
      </div>
    )
  }

  if (!entry) return null

  const date = new Date(entry.date)
  const videoUrl = entry.video_path
    ? `/uploads/${entry.video_path.split(/[\\/]/).pop()}`
    : null

  const isProcessing = entry.status === 'processing'

  return (
    <div className="page" style={{ maxWidth: 720 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <button
            onClick={() => navigate('/')}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, marginBottom: 8, display: 'block', padding: 0 }}
          >
            ← Back
          </button>
          <h1 style={{ fontSize: 26 }}>
            {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {entry.mood_score != null && (
            <div className="mood-pill" style={{ background: moodBg(entry.mood_score), color: moodColor(entry.mood_score), fontSize: 15 }}>
              <span style={{ fontFamily: 'Lora, serif', fontSize: 20 }}>{entry.mood_score.toFixed(1)}</span>
              <span style={{ fontSize: 12 }}>/ 10</span>
            </div>
          )}
          <button className="btn btn-danger" onClick={deleteEntry} disabled={deleting}>
            {deleting ? '…' : 'Delete'}
          </button>
        </div>
      </div>

      {/* Processing state */}
      {isProcessing && (
        <div className="card" style={{ padding: '20px 24px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="spinner" />
          <div>
            <div style={{ fontWeight: 500, marginBottom: 2 }}>Analyzing your entry…</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Running Hume emotion analysis, transcribing speech, and generating summary. This can take 1–3 minutes.
            </div>
          </div>
        </div>
      )}

      {entry.status === 'error' && (
        <div className="card" style={{ padding: '16px 20px', marginBottom: 20, borderColor: '#FECACA', background: '#FEF2F2' }}>
          <div style={{ fontWeight: 500, color: 'var(--danger)', marginBottom: 4 }}>Processing failed</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{entry.summary || 'An unknown error occurred.'}</div>
        </div>
      )}

      {/* Video */}
      {videoUrl && (
        <div className="card" style={{ overflow: 'hidden', marginBottom: 20 }}>
          <video src={videoUrl} controls className="record-video" style={{ borderRadius: 'var(--radius) var(--radius) 0 0' }} />
        </div>
      )}

      {/* Summary */}
      {entry.summary && entry.status !== 'error' && (
        <div className="card" style={{ padding: '20px 24px', marginBottom: 20 }}>
          <div className="section-label">Summary</div>
          <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--text)', fontFamily: 'Lora, serif' }}>
            {entry.summary}
          </p>

          {entry.mood_score != null && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', fontSize: 14, color: 'var(--text-muted)' }}>
              <strong style={{ color: moodColor(entry.mood_score) }}>Mood score: {entry.mood_score.toFixed(1)} / 10</strong>
            </div>
          )}
        </div>
      )}

      {/* Themes */}
      {entry.themes?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {entry.themes.map(t => <span key={t} className="tag">{t}</span>)}
        </div>
      )}

      {/* Emotion breakdown */}
      {(entry.face_emotions?.length > 0 || entry.voice_emotions?.length > 0) && (
        <div className="card" style={{ padding: '20px 24px', marginBottom: 20 }}>
          <div className="section-label">Emotion breakdown</div>
          <EmotionBars faceEmotions={entry.face_emotions} voiceEmotions={entry.voice_emotions} />
        </div>
      )}

      {/* Transcript */}
      {entry.transcript && (
        <div className="card" style={{ padding: '16px 24px', marginBottom: 20 }}>
          <button
            onClick={() => setShowTranscript(v => !v)}
            style={{ background: 'none', border: 'none', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 0, fontSize: 14, color: 'var(--text-muted)' }}
          >
            <span className="section-label" style={{ margin: 0 }}>Transcript</span>
            <span>{showTranscript ? '↑ Hide' : '↓ Show'}</span>
          </button>
          {showTranscript && (
            <p style={{ marginTop: 14, fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.8, fontStyle: 'italic' }}>
              "{entry.transcript}"
            </p>
          )}
        </div>
      )}
    </div>
  )
}
