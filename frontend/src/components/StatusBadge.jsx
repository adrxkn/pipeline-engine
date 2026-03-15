const CONFIG = {
  success: { color: '#3fb950', bg: 'rgba(63,185,80,0.1)',  border: 'rgba(63,185,80,0.3)',  icon: '✓', label: 'success' },
  failed:  { color: '#f85149', bg: 'rgba(248,81,73,0.1)',  border: 'rgba(248,81,73,0.3)',  icon: '✗', label: 'failed'  },
  running: { color: '#58a6ff', bg: 'rgba(88,166,255,0.1)', border: 'rgba(88,166,255,0.3)', icon: '●', label: 'running' },
  pending: { color: '#6e7681', bg: 'rgba(110,118,129,0.1)',border: 'rgba(110,118,129,0.3)',icon: '○', label: 'pending' },
  skipped: { color: '#6e7681', bg: 'rgba(110,118,129,0.1)',border: 'rgba(110,118,129,0.3)',icon: '–', label: 'skipped' },
  flaky:   { color: '#d29922', bg: 'rgba(210,153,34,0.1)', border: 'rgba(210,153,34,0.3)', icon: '⚠', label: 'flaky'  },
  timeout: { color: '#f85149', bg: 'rgba(248,81,73,0.1)',  border: 'rgba(248,81,73,0.3)',  icon: '⏱', label: 'timeout'},
}

export default function StatusBadge({ status, size = 'sm' }) {
  const c = CONFIG[status] || CONFIG.pending
  const isRunning = status === 'running'
  const pad = size === 'lg' ? '4px 12px' : '2px 8px'
  const fs  = size === 'lg' ? '12px' : '11px'

  return (
    <span style={{
      display:       'inline-flex',
      alignItems:    'center',
      gap:           '4px',
      padding:       pad,
      borderRadius:  '20px',
      border:        `1px solid ${c.border}`,
      background:    c.bg,
      color:         c.color,
      fontFamily:    'var(--font-mono)',
      fontSize:      fs,
      fontWeight:    '600',
      letterSpacing: '0.03em',
      whiteSpace:    'nowrap',
    }}>
      <span style={{
        fontSize:  isRunning ? '7px' : '9px',
        animation: isRunning ? 'pulse 1.2s ease-in-out infinite' : 'none',
        display:   'inline-block',
      }}>
        {c.icon}
      </span>
      {c.label}
    </span>
  )
}