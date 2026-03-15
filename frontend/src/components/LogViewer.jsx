import { useEffect, useRef } from 'react'

function getLineColor(line) {
  if (line.startsWith('❌') || line.includes('Error') || line.includes('error')) return '#dc2626'
  if (line.startsWith('✅'))                      return '#16a34a'
  if (line.startsWith('⚠') || line.startsWith('⏳') || line.includes('flaky')) return '#d97706'
  if (line.startsWith('⚡') || line.startsWith('🚀')) return '#2563eb'
  if (line.startsWith('🔁'))                      return '#7c3aed'
  if (line.startsWith('['))                       return '#09090b'
  return '#71717a'
}

export default function LogViewer({ logs, isLive }) {
  const bottomRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  return (
    <div style={{ position: 'relative' }}>
      {/* Terminal chrome */}
      <div style={{
        background:   '#18181b',
        borderRadius: '8px 8px 0 0',
        padding:      '10px 16px',
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #27272a',
      }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#52525b', marginLeft: '8px' }}>
            pipeline output
          </span>
        </div>
        {isLive && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            fontFamily: 'var(--font-mono)', fontSize: '10px',
            color: '#22c55e', fontWeight: '600',
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: '#22c55e',
              boxShadow: '0 0 6px #22c55e',
              display: 'inline-block',
              animation: 'pulse 1s ease-in-out infinite',
            }} />
            LIVE
          </div>
        )}
      </div>

      {/* Log content */}
      <div
        ref={containerRef}
        style={{
          background:   '#09090b',
          borderRadius: '0 0 8px 8px',
          padding:      '16px',
          fontFamily:   'var(--font-mono)',
          fontSize:     '12px',
          lineHeight:   '1.8',
          minHeight:    '240px',
          maxHeight:    '520px',
          overflowY:    'auto',
        }}
      >
        {logs.length === 0 ? (
          <span style={{ color: '#52525b' }}>
            {isLive ? '▌ Waiting for output...' : 'No logs recorded.'}
          </span>
        ) : (
          logs.map((line, i) => (
            <div
              key={i}
              style={{
                color:      getLineColor(line),
                whiteSpace: 'pre-wrap',
                wordBreak:  'break-all',
                animation:  'fadeUp 0.15s ease both',
              }}
            >
              <span style={{ color: '#3f3f46', userSelect: 'none', marginRight: '12px' }}>
                {String(i + 1).padStart(3, ' ')}
              </span>
              {line}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}