export default function StatsBar({ runs }) {
  if (!runs.length) return null

  const total      = runs.length
  const succeeded  = runs.filter(r => r.status === 'success').length
  const failed     = runs.filter(r => r.status === 'failed').length
  const running    = runs.filter(r => r.status === 'running').length
  const successRate = total ? Math.round((succeeded / total) * 100) : 0

  const stats = [
    { label: 'Total Runs',    value: total,                        color: 'var(--text)'    },
    { label: 'Success Rate',  value: `${successRate}%`,            color: successRate >= 80 ? 'var(--success)' : successRate >= 50 ? 'var(--warning)' : 'var(--danger)' },
    { label: 'Passed',        value: succeeded,                    color: 'var(--success)' },
    { label: 'Failed',        value: failed,                       color: failed > 0 ? 'var(--danger)' : 'var(--muted)' },
    { label: 'Active',        value: running,                      color: running > 0 ? 'var(--blue)' : 'var(--muted)' },
  ]

  return (
    <div style={{
      display:      'grid',
      gridTemplateColumns: 'repeat(5, 1fr)',
      gap:          '1px',
      background:   'var(--border)',
      border:       '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      overflow:     'hidden',
      marginBottom: '24px',
      boxShadow:    'var(--shadow)',
      animation:    'fadeUp 0.3s ease both',
    }}>
      {stats.map(({ label, value, color }) => (
        <div key={label} style={{
          background: 'var(--surface)',
          padding:    '16px 20px',
          display:    'flex',
          flexDirection: 'column',
          gap:        '4px',
        }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize:   '22px',
            fontWeight: '700',
            color,
            letterSpacing: '-0.03em',
            lineHeight: 1,
          }}>
            {value}
          </span>
          <span style={{
            fontFamily: 'var(--font-sans)',
            fontSize:   '11px',
            color:      'var(--muted)',
            fontWeight: '500',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}>
            {label}
          </span>
        </div>
      ))}
    </div>
  )
}