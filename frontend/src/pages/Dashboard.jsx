import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import StatusBadge from '../components/StatusBadge'
import StatsBar from '../components/Statsbar'

const API = 'http://127.0.0.1:8000'

function timeAgo(dateStr) {
  if (!dateStr) return '—'
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 60)   return `${Math.floor(diff)}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function RepoFilter({ runs, selected, onChange }) {
  const repos = ['all', ...new Set(runs.map(r => r.repo))]
  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      {repos.map(repo => (
        <button
          key={repo}
          onClick={() => onChange(repo)}
          style={{
            padding:      '4px 12px',
            borderRadius: '20px',
            border:       `1px solid ${selected === repo ? 'var(--text)' : 'var(--border)'}`,
            background:   selected === repo ? 'var(--text)' : 'var(--surface)',
            color:        selected === repo ? '#fff' : 'var(--muted)',
            fontFamily:   'var(--font-mono)',
            fontSize:     '11px',
            fontWeight:   '500',
            cursor:       'pointer',
            transition:   'all 0.15s',
          }}
        >
          {repo}
        </button>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [runs,        setRuns]        = useState([])
  const [loading,     setLoading]     = useState(true)
  const [repoFilter,  setRepoFilter]  = useState('all')
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchRuns = async () => {
    try {
      const res  = await fetch(`${API}/runs/`)
      const data = await res.json()
      setRuns(data)
      setLastUpdated(new Date())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRuns()
    const interval = setInterval(fetchRuns, 5000)
    return () => clearInterval(interval)
  }, [])

  const filtered = repoFilter === 'all'
    ? runs
    : runs.filter(r => r.repo === repoFilter)

  const hasActive = runs.some(r => r.status === 'running')

  return (
    <div style={{
      maxWidth: '960px',
      margin:   '0 auto',
      padding:  '40px 24px 80px',
      position: 'relative',
      zIndex:   1,
    }}>

      {/* Page header */}
      <div style={{
        display:       'flex',
        justifyContent: 'space-between',
        alignItems:    'flex-end',
        marginBottom:  '28px',
        animation:     'fadeUp 0.25s ease both',
      }}>
        <div>
          <p style={{
            fontFamily:    'var(--font-mono)',
            fontSize:      '11px',
            color:         'var(--muted)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom:  '6px',
          }}>
            {hasActive && (
              <span style={{ color: 'var(--blue)', marginRight: '8px' }}>
                <span style={{ animation: 'pulse 1s infinite', display: 'inline-block' }}>●</span> pipeline running
              </span>
            )}
            {lastUpdated && `Updated ${timeAgo(lastUpdated)}`}
          </p>
          <h1 style={{
            fontFamily:    'var(--font-mono)',
            fontSize:      '26px',
            fontWeight:    '700',
            letterSpacing: '-0.03em',
            color:         'var(--text)',
          }}>
            Run History
          </h1>
        </div>

        <button
          onClick={fetchRuns}
          style={{
            padding:      '7px 14px',
            background:   'var(--surface)',
            border:       '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            fontFamily:   'var(--font-mono)',
            fontSize:     '12px',
            color:        'var(--muted)',
            cursor:       'pointer',
            transition:   'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--text)'; e.currentTarget.style.color = 'var(--text)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)' }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* Stats */}
      {!loading && <StatsBar runs={runs} />}

      {/* Filters */}
      {!loading && runs.length > 0 && (
        <div style={{ marginBottom: '16px', animation: 'fadeUp 0.3s ease 0.1s both' }}>
          <RepoFilter runs={runs} selected={repoFilter} onChange={setRepoFilter} />
        </div>
      )}

      {/* Table */}
      <div style={{
        background:    'var(--surface)',
        border:        '1px solid var(--border)',
        borderRadius:  'var(--radius)',
        overflow:      'hidden',
        boxShadow:     'var(--shadow)',
        animation:     'fadeUp 0.3s ease 0.15s both',
      }}>

        {/* Column headers */}
        <div style={{
          display:              'grid',
          gridTemplateColumns:  '56px 1fr 110px 80px 100px 90px',
          padding:              '10px 20px',
          borderBottom:         '1px solid var(--border)',
          background:           'var(--surface-2)',
          fontFamily:           'var(--font-mono)',
          fontSize:             '10px',
          letterSpacing:        '0.1em',
          textTransform:        'uppercase',
          color:                'var(--muted)',
        }}>
          <span>Run</span>
          <span>Repository</span>
          <span>Branch</span>
          <span>Commit</span>
          <span>Status</span>
          <span style={{ textAlign: 'right' }}>When</span>
        </div>

        {loading ? (
          // Skeleton rows
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{
              display:             'grid',
              gridTemplateColumns: '56px 1fr 110px 80px 100px 90px',
              padding:             '14px 20px',
              borderBottom:        '1px solid var(--border)',
              gap:                 '12px',
            }}>
              {Array.from({ length: 6 }).map((_, j) => (
                <div key={j} style={{
                  height:     '14px',
                  borderRadius: '4px',
                  background: 'linear-gradient(90deg, var(--surface-2) 25%, var(--border) 50%, var(--surface-2) 75%)',
                  backgroundSize: '200% 100%',
                  animation: `shimmer 1.5s infinite ${i * 0.1}s`,
                  width: j === 1 ? '70%' : '60%',
                }} />
              ))}
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div style={{
            padding:    '60px 20px',
            textAlign:  'center',
            color:      'var(--muted)',
            fontFamily: 'var(--font-mono)',
            fontSize:   '13px',
          }}>
            {runs.length === 0
              ? 'No runs yet — push to a connected repo to trigger a pipeline'
              : 'No runs match this filter'}
          </div>
        ) : (
          filtered.map((run, idx) => {
            const isRunning = run.status === 'running'
            return (
              <Link
                to={`/runs/${run.id}`}
                key={run.id}
                style={{
                  display:             'grid',
                  gridTemplateColumns: '56px 1fr 110px 80px 100px 90px',
                  padding:             '13px 20px',
                  borderBottom:        idx < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                  alignItems:          'center',
                  transition:          'background 0.1s',
                  background:          isRunning ? 'rgba(37,99,235,0.02)' : 'transparent',
                  animation:           `fadeUp 0.2s ease ${idx * 0.04}s both`,
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                onMouseLeave={e => e.currentTarget.style.background = isRunning ? 'rgba(37,99,235,0.02)' : 'transparent'}
              >
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize:   '12px',
                  color:      'var(--muted)',
                  fontWeight: '500',
                }}>
                  #{run.id}
                </span>

                <div style={{ minWidth: 0 }}>
                  <span style={{
                    fontFamily:   'var(--font-mono)',
                    fontSize:     '13px',
                    color:        'var(--text)',
                    fontWeight:   '500',
                    display:      'block',
                    overflow:     'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace:   'nowrap',
                  }}>
                    {run.repo}
                  </span>
                </div>

                <span style={{
                  fontFamily:   'var(--font-mono)',
                  fontSize:     '12px',
                  color:        'var(--blue)',
                  overflow:     'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace:   'nowrap',
                }}>
                  {run.branch}
                </span>

                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize:   '12px',
                  color:      'var(--muted)',
                  background: 'var(--surface-2)',
                  border:     '1px solid var(--border)',
                  borderRadius: '4px',
                  padding:    '1px 6px',
                  display:    'inline-block',
                }}>
                  {run.commit_sha}
                </span>

                <StatusBadge status={run.status} />

                <span style={{
                  fontFamily:  'var(--font-mono)',
                  fontSize:    '11px',
                  color:       'var(--muted)',
                  textAlign:   'right',
                }}>
                  {timeAgo(run.created_at)}
                </span>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}