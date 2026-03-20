import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import StatusBadge from '../components/StatusBadge'
import LogViewer from '../components/LogViewer'

const API    = 'http://127.0.0.1:8000'
const WS_API = 'ws://127.0.0.1:8000'

function DurationBar({ steps }) {
  if (!steps || steps.length === 0) return null
  const maxDuration = Math.max(...steps.map(s => s.duration || 0), 0.1)

  return (
    <div style={{
      background:   'var(--surface)',
      border:       '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      overflow:     'hidden',
      boxShadow:    'var(--shadow)',
      marginBottom: '20px',
    }}>
      <div style={{
        padding:      '12px 20px',
        borderBottom: '1px solid var(--border)',
        background:   'var(--surface-2)',
        fontFamily:   'var(--font-mono)',
        fontSize:     '10px',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color:        'var(--muted)',
      }}>
        Step Duration
      </div>
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {steps.map(step => {
          const pct = ((step.duration || 0) / maxDuration * 100).toFixed(1)
          const color = step.status === 'success' ? 'var(--success)'
                      : step.status === 'failed'  ? 'var(--danger)'
                      : step.status === 'flaky'   ? 'var(--warning)'
                      : step.status === 'skipped' ? 'var(--muted)'
                      : 'var(--blue)'
          return (
            <div key={step.name} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize:   '12px',
                color:      'var(--text)',
                width:      '140px',
                flexShrink: 0,
                overflow:   'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {step.name}
              </span>
              <div style={{
                flex:         1,
                height:       '6px',
                background:   'var(--surface-2)',
                borderRadius: '3px',
                overflow:     'hidden',
              }}>
                <div style={{
                  width:        `${pct}%`,
                  height:       '100%',
                  background:   color,
                  borderRadius: '3px',
                  transition:   'width 0.6s cubic-bezier(0.4,0,0.2,1)',
                  boxShadow:    step.status === 'success' ? '0 0 6px rgba(22,163,74,0.4)' : 'none',
                }} />
              </div>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize:   '11px',
                color:      'var(--muted)',
                width:      '44px',
                textAlign:  'right',
                flexShrink: 0,
              }}>
                {step.duration ? `${step.duration.toFixed(2)}s` : '—'}
              </span>
              <StatusBadge status={step.status} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function timeAgo(dateStr) {
  if (!dateStr) return '—'
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 60)    return `${Math.floor(diff)}s ago`
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function RunDetail() {
  const { id }                = useParams()
  const [run,     setRun]     = useState(null)
  const [logs,    setLogs]    = useState([])
  const [isLive,  setIsLive]  = useState(false)
  const [loading, setLoading] = useState(true)
  const wsRef                 = useRef(null)

  const fetchRun = async () => {
    try {
      const res  = await fetch(`${API}/runs/${id}`)
      const data = await res.json()
      setRun(data)
      return data
    } catch (e) {
      console.error(e)
    }
  }

  const connectWS = () => {
    if (wsRef.current) return
    const ws = new WebSocket(`${WS_API}/ws/runs/${id}/logs`)
    wsRef.current = ws

    ws.onopen  = () => setIsLive(true)
    ws.onmessage = (e) => setLogs(prev => [...prev, e.data])
    ws.onclose = () => { setIsLive(false); wsRef.current = null }
    ws.onerror = () => setIsLive(false)
  }

  useEffect(() => {
    const init = async () => {
    const data = await fetchRun()
    setLoading(false)

    if (data && !['pending', 'running'].includes(data.status)) {
      if (data.steps && data.steps.length > 0) {
        const existingLogs = []
        data.steps.forEach(step => {
          existingLogs.push(`▶ Starting step: ${step.name}`)
          if (step.logs && step.logs.length > 0) {
            step.logs.forEach(line => {
              if (line.trim()) existingLogs.push(`[${step.name}] ${line}`)
            })
          }
          existingLogs.push(`${step.status === 'success' ? '✅' : '❌'} ${step.name} finished in ${step.duration?.toFixed(2)}s`)
        })
        setLogs(existingLogs)
      }
      connectWS()
      return
    }

    connectWS()

    if (data && ['pending', 'running'].includes(data.status)) {
      const interval = setInterval(async () => {
        const updated = await fetchRun()
        if (!['pending', 'running'].includes(updated?.status)) {
          clearInterval(interval)
          
          if (updated?.steps) {
            const finalLogs = []
            updated.steps.forEach(step => {
              if (step.logs) {
                step.logs.forEach(line => {
                  if (line.trim()) finalLogs.push(`[${step.name}] ${line}`)
                })
              }
            })
            setLogs(prev => prev.length > 0 ? prev : finalLogs)
          }
        }
      }, 2000)
      return () => clearInterval(interval)
    }
  }
    init()
    return () => { wsRef.current?.close(); wsRef.current = null }
  }, [id])

  if (loading) return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '60vh', fontFamily: 'var(--font-mono)', fontSize: '13px',
      color: 'var(--muted)',
    }}>
      <div style={{
        width: 16, height: 16,
        border: '2px solid var(--border)',
        borderTopColor: 'var(--text)',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
        marginRight: '10px',
      }} />
      Loading run...
    </div>
  )

  if (!run) return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '60vh', fontFamily: 'var(--font-mono)', fontSize: '13px',
      color: 'var(--danger)',
    }}>
      Run #{id} not found
    </div>
  )

  const totalDuration = run.steps
    ? run.steps.reduce((sum, s) => sum + (s.duration || 0), 0)
    : 0

  return (
    <div style={{
      maxWidth: '960px',
      margin:   '0 auto',
      padding:  '40px 24px 80px',
      position: 'relative',
      zIndex:   1,
    }}>

      {/* Back */}
      <Link
        to="/"
        style={{
          display:    'inline-flex',
          alignItems: 'center',
          gap:        '6px',
          fontFamily: 'var(--font-mono)',
          fontSize:   '12px',
          color:      'var(--muted)',
          marginBottom: '28px',
          transition: 'color 0.15s',
          animation:  'fadeUp 0.2s ease both',
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
      >
        ← All runs
      </Link>

      {/* Run header card */}
      <div style={{
        background:    'var(--surface)',
        border:        '1px solid var(--border)',
        borderRadius:  'var(--radius)',
        overflow:      'hidden',
        boxShadow:     'var(--shadow)',
        marginBottom:  '20px',
        animation:     'fadeUp 0.25s ease 0.05s both',
      }}>
        {/* Top bar */}
        <div style={{
          padding:        '16px 24px',
          borderBottom:   '1px solid var(--border)',
          display:        'flex',
          justifyContent: 'space-between',
          alignItems:     'center',
          background:     'var(--surface-2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{
              fontFamily:    'var(--font-mono)',
              fontSize:      '18px',
              fontWeight:    '700',
              letterSpacing: '-0.02em',
              color:         'var(--text)',
            }}>
              Run <span style={{ color: 'var(--muted)' }}>#{run.id}</span>
            </h1>
            <StatusBadge status={run.status} size="lg" />
          </div>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize:   '12px',
            color:      'var(--muted)',
          }}>
            {timeAgo(run.created_at)}
          </span>
        </div>

        {/* Meta row */}
        <div style={{
          padding: '14px 24px',
          display: 'flex',
          gap:     '32px',
          flexWrap: 'wrap',
        }}>
          {[
            { label: 'Repository', value: run.repo    },
            { label: 'Branch',     value: run.branch  },
            { label: 'Commit',     value: run.commit_sha?.slice(0, 7) },
            { label: 'Duration',   value: totalDuration > 0 ? `${totalDuration.toFixed(1)}s` : '—' },
            { label: 'Steps',      value: run.steps?.length ?? 0 },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{
                fontFamily:    'var(--font-mono)',
                fontSize:      '10px',
                color:         'var(--muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom:  '2px',
              }}>
                {label}
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize:   '13px',
                fontWeight: '600',
                color:      'var(--text)',
              }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Duration chart */}
      {run.steps && run.steps.length > 0 && (
        <div style={{ animation: 'fadeUp 0.25s ease 0.1s both' }}>
          <DurationBar steps={run.steps} />
        </div>
      )}

      {/* Log viewer */}
      <div style={{
        animation: 'fadeUp 0.25s ease 0.15s both',
      }}>
        <div style={{
          display:        'flex',
          justifyContent: 'space-between',
          alignItems:     'center',
          marginBottom:   '10px',
        }}>
          <span style={{
            fontFamily:    'var(--font-mono)',
            fontSize:      '10px',
            color:         'var(--muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}>
            Pipeline Output
          </span>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize:   '11px',
            color:      'var(--muted)',
          }}>
            {logs.length} lines
          </span>
        </div>
        <LogViewer logs={logs} isLive={isLive} />
      </div>

    </div>
  )
}