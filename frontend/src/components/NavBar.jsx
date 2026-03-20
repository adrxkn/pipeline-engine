import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

const API = 'http://127.0.0.1:8000'

export default function Navbar() {
  const [healthy, setHealthy]       = useState(null)
  const [copied,  setCopied]        = useState(false)
  const location                    = useLocation()

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(`${API}/health`)
        setHealthy(res.ok)
      } catch {
        setHealthy(false)
      }
    }
    check()
    const interval = setInterval(check, 10000)
    return () => clearInterval(interval)
  }, [])

  const webhookUrl = `${API}/webhooks/github`

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <nav style={{
      position:     'sticky',
      top:          0,
      zIndex:       100,
      background: 'var(--text)',  
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border)',
      padding:      '0 32px',
      height:       '52px',
      display:      'flex',
      alignItems:   'center',
      justifyContent: 'space-between',
    }}>

      {/* top left side — logo + nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '24px', height: '24px',
            background: 'var(--text)',
            borderRadius: '6px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: '#42ed3dff', fontSize: '12px', fontWeight: '700', fontFamily: 'var(--font-mono)' }}>P</span>
          </div>
          <span style={{
            fontFamily:    'var(--font-mono)',
            fontWeight:    '600',
            fontSize:      '14px',
            letterSpacing: '-0.02em',
            color:         'var(--text)',
          }}>
            <span style={{ color: '#000000ff' }}>pipeline.engine</span>
          </span>
        </Link>

        <div style={{ display: 'flex', gap: '4px' }}>
          {[{ label: 'Runs', path: '/' }].map(({ label, path }) => (
            <Link
              key={path}
              to={path}
              style={{
                fontFamily:   'var(--font-sans)',
                fontSize:     '13px',
                fontWeight:   '500',
                color:        location.pathname === path ? 'var(--text)' : 'var(--muted)',
                padding:      '4px 10px',
                borderRadius: 'var(--radius)',
                background:   location.pathname === path ? 'var(--surface-2)' : 'transparent',
                transition:   'all 0.15s',
              }}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* Right — webhook URL + status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

        {/* Webhook URL copy button */}
        <button
          onClick={copyWebhook}
          title="Click to copy webhook URL"
          style={{
            display:      'flex',
            alignItems:   'center',
            gap:          '7px',
            padding:      '5px 12px',
            background:   'var(--surface-2)',
            border:       '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            cursor:       'pointer',
            transition:   'all 0.15s',
            fontFamily:   'var(--font-mono)',
            fontSize:     '11px',
            color:        copied ? 'var(--success)' : 'var(--muted)',
          }}
        >
          <span>{copied ? '✓ copied' : '⌘ webhook url'}</span>
          {!copied && (
            <span style={{
              background:   'var(--border)',
              borderRadius: '3px',
              padding:      '1px 5px',
              fontSize:     '10px',
              color:        'var(--muted)',
              maxWidth:     '160px',
              overflow:     'hidden',
              textOverflow: 'ellipsis',
              whiteSpace:   'nowrap',
            }}>
              {webhookUrl}
            </span>
          )}
        </button>

        {/* Backend status indicator */}
        <div style={{
          display:    'flex',
          alignItems: 'center',
          gap:        '5px',
          fontFamily: 'var(--font-mono)',
          fontSize:   '11px',
          color:      healthy === null ? 'var(--muted)'
                    : healthy          ? 'var(--success)'
                    :                    'var(--danger)',
        }}>
          <span style={{
            width:  6, height: 6,
            borderRadius: '50%',
            background: healthy === null ? 'var(--muted)'
                      : healthy          ? 'var(--success)'
                      :                    'var(--danger)',
            display:   'inline-block',
            animation: healthy ? 'pulse 2.5s ease-in-out infinite' : 'none',
          }} />
          {healthy === null ? 'checking' : healthy ? 'connected' : 'offline'}
        </div>

      </div>
    </nav>
  )
}