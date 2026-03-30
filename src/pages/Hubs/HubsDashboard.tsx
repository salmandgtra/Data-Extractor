import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './HubsDashboard.css'

// ── Autodesk API types ────────────────────────────────────────────────────────

interface HubAttributes {
  name: string
  extension?: {
    type: string
    data?: { projectType?: string }
  }
  region?: string
}

interface Hub {
  id: string
  type: string
  attributes: HubAttributes
}

interface HubsResponse {
  data: Hub[]
}

// ── Hub type helpers ──────────────────────────────────────────────────────────

type HubKind = 'bim360' | 'acc' | 'personal' | 'fusionteam' | 'default'

function hubKind(hub: Hub): HubKind {
  const ext = hub.attributes.extension?.type ?? ''
  if (ext.includes('bim360'))        return 'bim360'
  if (ext.includes('construction'))  return 'acc'
  if (ext.includes('a360'))          return 'fusionteam'
  if (ext.includes('core:Hub'))      return 'personal'
  return 'default'
}

const KIND_META: Record<HubKind, { label: string; icon: string; badgeClass: string; iconClass: string }> = {
  bim360:     { label: 'BIM 360',        icon: '🏗️', badgeClass: 'badge-bim360',     iconClass: 'hub-icon-bim360' },
  acc:        { label: 'ACC',            icon: '🏢', badgeClass: 'badge-acc',         iconClass: 'hub-icon-acc' },
  personal:   { label: 'Personal Hub',  icon: '👤', badgeClass: 'badge-personal',    iconClass: 'hub-icon-personal' },
  fusionteam: { label: 'Fusion Team',   icon: '⚙️', badgeClass: 'badge-fusionteam',  iconClass: 'hub-icon-fusionteam' },
  default:    { label: 'Hub',           icon: '📁', badgeClass: 'badge-default',     iconClass: 'hub-icon-default' },
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function HubsDashboard() {
  const navigate = useNavigate()
  const [hubs, setHubs]       = useState<Hub[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const accessToken = localStorage.getItem('autodesk_access_token')

  // Guard: redirect to login if no token
  useEffect(() => {
    if (!accessToken) {
      navigate('/', { replace: true })
    }
  }, [accessToken, navigate])

  // Fetch hubs
  useEffect(() => {
    if (!accessToken) return

    fetch('https://developer.api.autodesk.com/project/v1/hubs', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })
      .then(res => {
        if (!res.ok) throw new Error(`API error ${res.status}: ${res.statusText}`)
        return res.json() as Promise<HubsResponse>
      })
      .then(data => setHubs(data.data ?? []))
      .catch(err => setError(String(err.message)))
      .finally(() => setLoading(false))
  }, [accessToken])

  const handleLogout = () => {
    localStorage.removeItem('autodesk_access_token')
    localStorage.removeItem('autodesk_refresh_token')
    localStorage.removeItem('autodesk_token_expiry')
    localStorage.removeItem('autodesk_token_data')
    navigate('/', { replace: true })
  }

  const maskedToken = accessToken
    ? `${accessToken.slice(0, 8)}••••••••${accessToken.slice(-4)}`
    : ''

  return (
    <div className="hubs-root">

      {/* ── Top bar ─────────────────────────────────────────────── */}
      <header className="hubs-topbar">
        <div className="hubs-brand">
          <div className="hubs-logo">
            <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <path d="M16 2L3 27h6L16 11l7 16h6L16 2z" fill="white" />
              <path d="M9.5 27h13L16 16.5 9.5 27z" fill="rgba(255,255,255,0.55)" />
            </svg>
          </div>
          <span className="hubs-brand-name">Autodesk</span>
          <span className="hubs-brand-sep">/</span>
          <span className="hubs-brand-section">Hubs</span>
        </div>

        <div className="hubs-topbar-right">
          {accessToken && (
            <div className="hubs-token-badge">
              <span className="hubs-token-dot" aria-hidden="true" />
              {maskedToken}
            </div>
          )}
          <button className="hubs-logout" onClick={handleLogout} aria-label="Sign out">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign out
          </button>
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────────────── */}
      <main className="hubs-main">

        <div className="hubs-page-header">
          <div className="hubs-page-header-row">
            <div>
              <h1 className="hubs-page-title">Your Hubs</h1>
              <p className="hubs-page-subtitle">
                Select a hub to browse its projects and data.
              </p>
            </div>
            {!loading && !error && hubs.length > 0 && (
              <span className="hubs-count-badge">
                {hubs.length} hub{hubs.length !== 1 ? 's' : ''} found
              </span>
            )}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="hubs-loading">
            <div className="hubs-spinner" />
            <p>Loading hubs...</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="hubs-error">
            <h3>Failed to load hubs</h3>
            <p>{error}</p>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && hubs.length === 0 && (
          <div className="hubs-empty">
            <div className="hubs-empty-icon" aria-hidden="true">📭</div>
            <h3>No hubs found</h3>
            <p>Your account does not have access to any hubs.</p>
          </div>
        )}

        {/* Hub cards */}
        {!loading && !error && hubs.length > 0 && (
          <div className="hubs-grid">
            {hubs.map((hub, i) => {
              const kind = hubKind(hub)
              const meta = KIND_META[kind]
              const region = hub.attributes.region ?? 'US'

              return (
                <div
                  key={hub.id}
                  className="hub-card"
                  style={{ animationDelay: `${i * 60}ms` }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Open hub ${hub.attributes.name}`}
                  onClick={() => navigate(`/hubs/${hub.id}/projects`, { state: { hubName: hub.attributes.name } })}
                  onKeyDown={e => e.key === 'Enter' && navigate(`/hubs/${hub.id}/projects`, { state: { hubName: hub.attributes.name } })}
                >
                  {/* Header */}
                  <div className="hub-card-header">
                    <div className={`hub-icon ${meta.iconClass}`} aria-hidden="true">
                      {meta.icon}
                    </div>
                    <div className="hub-card-title-area">
                      <h2 className="hub-card-name">{hub.attributes.name}</h2>
                      <span className={`hub-type-badge ${meta.badgeClass}`}>
                        {meta.label}
                      </span>
                    </div>
                  </div>

                  <div className="hub-card-divider" />

                  {/* Meta */}
                  <div className="hub-card-meta">
                    <div className="hub-meta-row">
                      <span className="hub-meta-label">Hub ID</span>
                      <span className="hub-meta-value" title={hub.id}>{hub.id}</span>
                    </div>
                    {hub.attributes.extension?.type && (
                      <div className="hub-meta-row">
                        <span className="hub-meta-label">Type</span>
                        <span className="hub-meta-value" title={hub.attributes.extension.type}>
                          {hub.attributes.extension.type.split(':').pop()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="hub-card-footer">
                    <span className="hub-card-link">
                      View projects
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </span>
                    <span className="hub-region-tag">{region}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
