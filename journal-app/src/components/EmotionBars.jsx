export default function EmotionBars({ faceEmotions = [], voiceEmotions = [] }) {
  const topFace = [...faceEmotions].sort((a, b) => b.score - a.score).slice(0, 10)
  const topVoice = [...voiceEmotions].sort((a, b) => b.score - a.score).slice(0, 10)
  const faceMax = topFace[0]?.score || 1
  const voiceMax = topVoice[0]?.score || 1

  const renderBars = (emotions, max, color) => (
    emotions.length === 0
      ? <p style={{ fontSize: 13, color: 'var(--text-hint)' }}>No data</p>
      : emotions.map(e => (
        <div key={e.name}>
          <div className="emotion-bar-label">
            <span style={{ color: 'var(--text)', fontSize: 13 }}>{e.name}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{(e.score * 100).toFixed(1)}%</span>
          </div>
          <div className="emotion-bar-track">
            <div
              className="emotion-bar-fill"
              style={{ width: `${(e.score / max) * 100}%`, background: color }}
            />
          </div>
        </div>
      ))
  )

  return (
    <div className="two-col">
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--face)', display: 'inline-block', flexShrink: 0 }} />
          <span className="section-label" style={{ margin: 0 }}>Face emotions</span>
        </div>
        {renderBars(topFace, faceMax, 'var(--face)')}
      </div>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--voice)', display: 'inline-block', flexShrink: 0 }} />
          <span className="section-label" style={{ margin: 0 }}>Voice emotions</span>
        </div>
        {renderBars(topVoice, voiceMax, 'var(--voice)')}
      </div>
    </div>
  )
}
