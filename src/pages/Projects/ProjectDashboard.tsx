import { useEffect, useState, type ReactElement } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import * as XLSX from 'xlsx'
import './ProjectDashboard.css'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProjectAttributes {
  name: string
  extension?: { type?: string }
}

interface Project {
  id: string
  type: string
  attributes: ProjectAttributes
}

type FilterType = 'all' | 'acc' | 'bim360'

// ── Helpers ───────────────────────────────────────────────────────────────────

type ProjKind = 'bim360' | 'acc' | 'default'

function projectKind(p: Project): ProjKind {
  const ext = (p.attributes.extension?.type ?? '').toLowerCase()
  // Autodesk API values:
  //   BIM 360 → "autodesk.bim360:Project"
  //   ACC     → "autodesk.core:Project"
  if (ext.includes('bim360')) return 'bim360'
  if (ext.includes('autodesk.core') || ext.includes('autodesk.acc')) return 'acc'
  return 'default'
}

// ACC SVG icon (Construction Cloud style)
const ACC_ICON = (
  <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <rect width="32" height="32" rx="6" fill="#FF6A00"/>
    <path d="M16 5L6 26h4.5L16 13.5 21.5 26H26L16 5z" fill="white"/>
    <path d="M11 26h10l-5-9L11 26z" fill="rgba(255,255,255,0.6)"/>
  </svg>
)

// BIM 360 SVG icon (blue grid style)
const BIM360_ICON = (
  <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <rect width="32" height="32" rx="6" fill="#0696D7"/>
    <text x="5" y="22" fontFamily="Arial" fontWeight="bold" fontSize="11" fill="white">BIM</text>
    <text x="4" y="30" fontFamily="Arial" fontWeight="bold" fontSize="10" fill="white">360</text>
  </svg>
)

const DEFAULT_ICON = (
  <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <rect width="32" height="32" rx="6" fill="#6B7280"/>
    <path d="M8 10h10l2 3h4v10H8V10z" fill="white" opacity="0.9"/>
  </svg>
)

const KIND_ICON: Record<ProjKind, ReactElement> = {
  bim360:  BIM360_ICON,
  acc:     ACC_ICON,
  default: DEFAULT_ICON,
}

const KIND_BADGE: Record<ProjKind, { label: string; cls: string }> = {
  bim360:  { label: 'BIM 360', cls: 'badge-bim360' },
  acc:     { label: 'ACC',     cls: 'badge-acc' },
  default: { label: 'Hub',     cls: 'badge-default' },
}

// ── Export helper ─────────────────────────────────────────────────────────────

function exportToExcel(projects: Project[], hubName: string) {
  const rows = projects.map(p => ({
    'Project Name': p.attributes.name,
    'Project ID':   p.id,
    'Type':         KIND_BADGE[projectKind(p)].label,
    'Extension':    p.attributes.extension?.type ?? '',
  }))

  const ws = XLSX.utils.json_to_sheet(rows)

  // Auto-width columns
  const colWidths = Object.keys(rows[0] ?? {}).map(key => ({
    wch: Math.max(key.length, ...rows.map(r => String(r[key as keyof typeof r]).length)) + 2,
  }))
  ws['!cols'] = colWidths

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Projects')
  XLSX.writeFile(wb, `${hubName.replace(/\s+/g, '_')}_projects.xlsx`)
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProjectDashboard() {
  const { hubId }  = useParams<{ hubId: string }>()
  const navigate   = useNavigate()
  const { state }  = useLocation()

  const [projects, setProjects]   = useState<Project[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [filter, setFilter]       = useState<FilterType>('all')
  const [selected, setSelected]   = useState<Project | null>(null)
  const [exporting, setExporting] = useState(false)

  // Hub name passed as router state from HubsDashboard
  const hubName = (state as { hubName?: string } | null)?.hubName ?? hubId ?? 'Hub'

  const accessToken = localStorage.getItem('autodesk_access_token')

  useEffect(() => {
    if (!accessToken) { navigate('/', { replace: true }); return }
    if (!hubId) return

    async function fetchAllProjects() {
      const all: Project[] = []
      let url: string | null =
        `https://developer.api.autodesk.com/project/v1/hubs/${hubId}/projects?page[limit]=100`

      while (url) {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        if (!res.ok) throw new Error(`API error ${res.status}: ${res.statusText}`)
        const data = await res.json()
        all.push(...(data.data ?? []))
        // Follow next page link if present
        url = data.links?.next?.href ?? null
      }
      return all
    }

    fetchAllProjects()
      .then(all => setProjects(all))
      .catch(err => setError(String(err.message)))
      .finally(() => setLoading(false))
  }, [hubId, accessToken, navigate])

  // Filtered list
  const filtered = projects.filter(p => {
    if (filter === 'all')   return true
    const k = projectKind(p)
    if (filter === 'bim360') return k === 'bim360'
    if (filter === 'acc')    return k === 'acc'
    return true
  })

  const countOf = (f: FilterType) => {
    if (f === 'all')    return projects.length
    if (f === 'bim360') return projects.filter(p => projectKind(p) === 'bim360').length
    if (f === 'acc')    return projects.filter(p => projectKind(p) === 'acc').length
    return 0
  }

  const handleExport = () => {
    if (!filtered.length) return
    setExporting(true)
    try {
      exportToExcel(filtered, hubName)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="proj-root">

      {/* ── Top bar ──────────────────────────────────────────── */}
      <header className="proj-topbar">
        <div className="proj-brand">
          <div className="proj-logo">
            <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <path d="M16 2L3 27h6L16 11l7 16h6L16 2z" fill="white" />
              <path d="M9.5 27h13L16 16.5 9.5 27z" fill="rgba(255,255,255,0.55)" />
            </svg>
          </div>
          <nav className="proj-breadcrumb" aria-label="Breadcrumb">
            <button className="proj-breadcrumb-item" onClick={() => navigate('/hubs')}>
              Hubs
            </button>
            <span className="proj-breadcrumb-sep" aria-hidden="true">›</span>
            <span className="proj-breadcrumb-current" title={hubName}>{hubName}</span>
            <span className="proj-breadcrumb-sep" aria-hidden="true">›</span>
            <span className="proj-breadcrumb-current">Projects</span>
          </nav>
        </div>

        <div className="proj-topbar-right">
          <button className="proj-back-btn" onClick={() => navigate('/hubs')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" aria-hidden="true">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to Hubs
          </button>
        </div>
      </header>

      {/* ── Layout ───────────────────────────────────────────── */}
      <div className="proj-layout">

        {/* ── Project list panel ─────────────────────────────── */}
        <section className="proj-panel" aria-label="Projects list">

          {/* Header */}
          <div className="proj-panel-head">
            <h1 className="proj-panel-title">Projects</h1>
            <p className="proj-panel-hub">{hubName}</p>

            {/* Filter tabs */}
            <div className="proj-filters" role="tablist" aria-label="Filter projects">
              {(['all', 'acc', 'bim360'] as FilterType[]).map(f => (
                <button
                  key={f}
                  role="tab"
                  aria-selected={filter === f}
                  className={`proj-filter-btn${filter === f ? ' active' : ''}`}
                  onClick={() => { setFilter(f); setSelected(null) }}
                >
                  {f === 'all' ? 'All' : f === 'acc' ? 'ACC' : 'BIM 360'}
                  <span className="proj-filter-count">{countOf(f)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="proj-list" role="listbox" aria-label="Project list">

            {loading && (
              <div className="proj-loading">
                <div className="proj-spinner" aria-hidden="true" />
                <span>Loading projects...</span>
              </div>
            )}

            {!loading && error && (
              <div className="proj-error" role="alert">{error}</div>
            )}

            {!loading && !error && filtered.length === 0 && (
              <div className="proj-empty">No projects match this filter.</div>
            )}

            {!loading && !error && filtered.map((proj, i) => {
              const kind = projectKind(proj)
              const badge = KIND_BADGE[kind]
              const isSelected = selected?.id === proj.id

              return (
                <div
                  key={proj.id}
                  role="option"
                  aria-selected={isSelected}
                  className={`proj-row${isSelected ? ' selected' : ''}`}
                  onClick={() => setSelected(isSelected ? null : proj)}
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <div className={`proj-row-icon type-${kind}`} aria-hidden="true">
                    {KIND_ICON[kind]}
                  </div>
                  <div className="proj-row-info">
                    <div className="proj-row-name">{proj.attributes.name}</div>
                    <div className="proj-row-id">{proj.id}</div>
                  </div>
                  <span className={`proj-row-badge ${badge.cls}`}>{badge.label}</span>
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div className="proj-panel-foot">
            <span className="proj-count-text">
              {loading ? 'Loading...' : `${filtered.length} project${filtered.length !== 1 ? 's' : ''}`}
            </span>
            <button
              className="proj-export-btn"
              onClick={handleExport}
              disabled={exporting || loading || filtered.length === 0}
              title="Export visible projects to Excel"
            >
              {/* Excel icon */}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="8" y1="13" x2="16" y2="13" />
                <line x1="8" y1="17" x2="16" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              {exporting ? 'Exporting...' : 'Export to Excel'}
            </button>
          </div>
        </section>

        {/* ── Detail sidebar ──────────────────────────────────── */}
        <aside className="proj-detail" aria-label="Project details">
          {!selected ? (
            <div className="proj-detail-empty">
              <div className="proj-detail-empty-icon" aria-hidden="true">📋</div>
              <p>Select a project to view details</p>
            </div>
          ) : (
            <>
              <p className="proj-detail-label-head">Selected Project</p>
              <p className="proj-detail-name">{selected.attributes.name}</p>
              <div className="proj-detail-rows">
                <div className="proj-detail-row">
                  <span className="proj-detail-key">Project ID</span>
                  <span className="proj-detail-val">{selected.id}</span>
                </div>
                <div className="proj-detail-row">
                  <span className="proj-detail-key">Type</span>
                  <span className="proj-detail-val">
                    {KIND_BADGE[projectKind(selected)].label}
                  </span>
                </div>
                {selected.attributes.extension?.type && (
                  <div className="proj-detail-row">
                    <span className="proj-detail-key">Extension</span>
                    <span className="proj-detail-val">
                      {selected.attributes.extension.type}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  )
}
