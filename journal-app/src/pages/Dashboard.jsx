import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import MoodChart from '../components/MoodChart'

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

function avgMood(entries) {
  const valid = entries.filter(e => e.mood_score != null)
  if (!valid.length) return null
  return (valid.reduce((s, e) => s + e.mood_score, 0) / valid.length).toFixed(1)
}

function streak(entries) {
  const complete = entries.filter(e => e.status === 'complete').map(e => e.date).sort().reverse()
  if (!complete.length) return 0
  let count = 0
  let cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  for (const d of complete) {
    const entryDate = new Date(d)
    entryDate.setHours(0, 0, 0, 0)
    const diff = (cursor - entryDate) / (1000 * 60 * 60 * 24)
    if (diff <= 1) { count++; cursor = entryDate }
    else break
  }
  return count
}

export default function Dashboard() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetch('/api/entries')
      .then(r => r.json())
      .then(data => { setEntries(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <div className="spinner" />
      </div>
    )
  }

  const avg = avgMood(entries)
  const currentStreak = streak(entries)
  const complete = entries.filter(e => e.status === 'complete').length

  return (
    <div className="page">
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, marginBottom: 6 }}>Your journal</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>
          {entries.length === 0
            ? 'Start recording to see your emotional journey over time.'
            : `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'} recorded`}
        </p>
      </div>

      {entries.length > 0 && (
        <>
          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Average mood', value: avg ? `${avg} / 10` : '—' },
              { label: 'Day streak', value: currentStreak ? `${currentStreak} day${currentStreak > 1 ? 's' : ''}` : '—' },
              { label: 'Entries complete', value: `${complete} / ${entries.length}` }
            ].map(s => (
              <div key={s.label} className="card" style={{ padding: '16px 20px' }}>
                <div style={{ fontSize: 11, color: 'var(--text-hint)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontSize: 22, fontFamily: 'Lora, serif', fontWeight: 500 }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Mood chart */}
          <div className="card" style={{ padding: '20px 24px', marginBottom: 24 }}>
            <div className="section-label">Mood over time</div>
            <MoodChart entries={entries} />
          </div>
        </>
      )}

      {/* Entry list */}
      {entries.length === 0 ? (
        <div className="empty">
          <h2>Nothing here yet</h2>
          <p>Record your first video journal entry to get started.</p>
          <button className="btn btn-primary" onClick={() => navigate('/record')}>
            Record today's entry
          </button>
        </div>
      ) : (
        <>
          <div className="section-label">All entries</div>
          <div className="entry-list">
            {entries.map(entry => {
              const date = new Date(entry.date)
              const day = date.toLocaleDateString('en-US', { day: 'numeric' })
              const month = date.toLocaleDateString('en-US', { month: 'short' })
              return (
                <div
                  key={entry.id}
                  className="card entry-item"
                  onClick={() => navigate(`/entry/${entry.id}`)}
                >
                  <div className="entry-date-col">
                    <div className="entry-date-day">{day}</div>
                    <div className="entry-date-month">{month}</div>
                  </div>

                  <div className="entry-content">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className={`status-dot ${entry.status}`} />
                      <span style={{ fontSize: 13, color: 'var(--text-hint)', textTransform: 'capitalize' }}>
                        {entry.status === 'processing' ? 'Processing…' : entry.status}
                      </span>
                    </div>
                    {entry.summary && (
                      <p className="entry-summary">{entry.summary}</p>
                    )}
                    {entry.themes?.length > 0 && (
                      <div className="entry-tags">
                        {entry.themes.slice(0, 4).map(t => (
                          <span key={t} className="tag">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="entry-mood">
                    {entry.mood_score != null && (
                      <div className="mood-pill" style={{ background: moodBg(entry.mood_score), color: moodColor(entry.mood_score) }}>
                        <span style={{ fontSize: 16, fontFamily: 'Lora, serif' }}>{entry.mood_score.toFixed(1)}</span>
                        <span style={{ fontSize: 11 }}>/ 10</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
