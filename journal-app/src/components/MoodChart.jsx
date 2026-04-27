import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

function moodColor(score) {
  if (score >= 7) return '#15803D'
  if (score >= 4) return '#D97706'
  return '#B91C1C'
}

const CustomDot = (props) => {
  const { cx, cy, payload } = props
  return <circle cx={cx} cy={cy} r={5} fill={moodColor(payload.mood_score)} stroke="white" strokeWidth={2} />
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: 13,
      boxShadow: '0 4px 16px rgba(0,0,0,0.08)'
    }}>
      <div style={{ fontWeight: 500, marginBottom: 4 }}>{d.label}</div>
      <div style={{ color: moodColor(d.mood_score), fontWeight: 500 }}>
        Mood: {d.mood_score?.toFixed(1)} / 10
      </div>
    </div>
  )
}

export default function MoodChart({ entries }) {
  const data = [...entries]
    .filter(e => e.mood_score != null && e.status === 'complete')
    .reverse()
    .map(e => {
      const date = new Date(e.date)
      return {
        label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        mood_score: e.mood_score,
        id: e.id
      }
    })

  if (data.length === 0) {
    return (
      <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-hint)', fontSize: 14 }}>
        Record your first entry to see your mood over time
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 12, right: 16, left: -20, bottom: 0 }}>
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: 'var(--text-hint)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, 10]}
          ticks={[0, 2, 4, 6, 8, 10]}
          tick={{ fontSize: 11, fill: 'var(--text-hint)' }}
          axisLine={false}
          tickLine={false}
        />
        <ReferenceLine y={5} stroke="var(--border)" strokeDasharray="4 4" />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="mood_score"
          stroke="var(--accent)"
          strokeWidth={2}
          dot={<CustomDot />}
          activeDot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
