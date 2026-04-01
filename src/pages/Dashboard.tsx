import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import './Dashboard.css'

const SCOPE_LABELS: Record<string, string> = {
  'data:read':    'Read Data',
  'data:write':   'Write Data',
  'data:create':  'Create Data',
  'account:read': 'Read Account',
  'account:write':'Write Account',
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button className="copy-btn" onClick={copy} title="Copy to clipboard" aria-label="Copy token">
      {copied ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
      )}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

export default function Dashboard() {
  const { isAuthenticated, tokenData, isLoading, isRefreshing, logout, refreshToken } = useAuth()
  const navigate = useNavigate()
  const [showRawToken, setShowRawToken] = useState(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/', { replace: true })
    }
  }, [isAuthenticated, isLoading, navigate])

  if (isLoading) {
    return (
      <div className="dash-loading">
        <div className="dash-spinner" />
        <p>Loading session...</p>
      </div>
    )
  }

  if (!isAuthenticated || !tokenData) return null

  const accessToken = tokenData.access_token ?? ''
  const tokenType   = (tokenData.token_type as string) ?? 'Bearer'
  const expiryRaw   = localStorage.getItem('autodesk_token_expiry')
  const expiresAt   = expiryRaw ? new Date(parseInt(expiryRaw, 10)) : null
  const hasRefresh  = Boolean(tokenData.refresh_token)
  const scopes      = ((tokenData.scope as string) ?? 'data:create data:read data:write account:read account:write').split(' ')

  const maskedToken = `${accessToken.slice(0, 12)}${'•'.repeat(20)}${accessToken.slice(-8)}`

  return (
    <div className="dash-root">
      {/* Background */}
      <div className="dash-bg" aria-hidden="true">
        <div className="dash-glow-1" />
        <div className="dash-glow-2" />
        <div className="dash-grid"  />
      </div>

      {/* Top bar */}
      <header className="dash-topbar">
        <div className="dash-brand">
          <div className="dash-logo-icon">
            <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <path d="M16 2L3 27h6L16 11l7 16h6L16 2z" fill="white" />
              <path d="M9.5 27h13L16 16.5 9.5 27z" fill="rgba(255,255,255,0.5)" />
            </svg>
          </div>
          <div>
            <span className="dash-brand-name">Autodesk</span>
            <span className="dash-brand-product">Data Portals</span>
          </div>
        </div>

        <div className="dash-topbar-right">
          {isRefreshing && (
            <span className="dash-refreshing">
              <span className="dash-spinner-sm" /> Refreshing token...
            </span>
          )}
          <button className="dash-logout-btn" onClick={logout}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign out
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="dash-main">

        {/* Welcome banner */}
        <section className="dash-banner">
          <div className="dash-banner-icon" aria-hidden="true">✓</div>
          <div>
            <h1 className="dash-welcome">Authentication successful</h1>
            <p className="dash-welcome-sub">Your Autodesk session is active. Token auto-refreshes every 50 minutes.</p>
          </div>
          <div className="dash-status-pill">
            <span className="dash-status-dot" aria-hidden="true" />
            Active session
          </div>
        </section>

        {/* Cards grid */}
        <div className="dash-grid-cards">

          {/* Access Token card */}
          <section className="dash-card">
            <div className="dash-card-header">
              <span className="dash-card-icon" aria-hidden="true">🔑</span>
              <h2 className="dash-card-title">Access Token</h2>
              <span className="dash-token-type-badge">{tokenType}</span>
            </div>
            <div className="dash-token-display">
              <code className="dash-token-code">
                {showRawToken ? accessToken : maskedToken}
              </code>
            </div>
            <div className="dash-token-actions">
              <button
                className="dash-ghost-btn"
                onClick={() => setShowRawToken(v => !v)}
              >
                {showRawToken ? (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                    Hide
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    Reveal
                  </>
                )}
              </button>
              <CopyButton text={accessToken} />
            </div>
          </section>

          {/* Session info card */}
          <section className="dash-card">
            <div className="dash-card-header">
              <span className="dash-card-icon" aria-hidden="true">⏱</span>
              <h2 className="dash-card-title">Session Info</h2>
            </div>
            <dl className="dash-info-list">
              <div className="dash-info-row">
                <dt>Expires at</dt>
                <dd>{expiresAt ? expiresAt.toLocaleString() : '—'}</dd>
              </div>
              <div className="dash-info-row">
                <dt>Refresh token</dt>
                <dd>
                  <span className={`dash-pill ${hasRefresh ? 'dash-pill-green' : 'dash-pill-red'}`}>
                    {hasRefresh ? 'Available' : 'Not available'}
                  </span>
                </dd>
              </div>
              <div className="dash-info-row">
                <dt>Auto-refresh</dt>
                <dd>
                  <span className="dash-pill dash-pill-blue">Every 50 min</span>
                </dd>
              </div>
              <div className="dash-info-row">
                <dt>Token type</dt>
                <dd>{tokenType}</dd>
              </div>
            </dl>
            <button
              className="dash-refresh-btn"
              onClick={() => refreshToken()}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <><span className="dash-spinner-sm" /> Refreshing...</>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <polyline points="23 4 23 10 17 10" />
                    <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
                  </svg>
                  Refresh now
                </>
              )}
            </button>
          </section>

          {/* Permissions card */}
          <section className="dash-card">
            <div className="dash-card-header">
              <span className="dash-card-icon" aria-hidden="true">🛡</span>
              <h2 className="dash-card-title">Granted Permissions</h2>
            </div>
            <ul className="dash-scope-list">
              {scopes.map(s => (
                <li key={s} className="dash-scope-item">
                  <span className="dash-scope-check" aria-hidden="true">✓</span>
                  <span className="dash-scope-name">{s}</span>
                  <span className="dash-scope-label">{SCOPE_LABELS[s] ?? s}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Usage example card */}
          <section className="dash-card dash-card-wide">
            <div className="dash-card-header">
              <span className="dash-card-icon" aria-hidden="true">⚡</span>
              <h2 className="dash-card-title">Quick Usage</h2>
            </div>
            <p className="dash-card-desc">Use your access token to call Autodesk Platform Services APIs:</p>
            <div className="dash-code-block">
              <pre><code>{`fetch('https://developer.api.autodesk.com/oss/v2/buckets', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('autodesk_access_token'),
    'Content-Type':  'application/json'
  }
})`}</code></pre>
            </div>
          </section>

        </div>
      </main>
    </div>
  )
}
