import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import './LoginPage.css'

const SCOPES = ['data:create', 'data:read', 'data:write', 'account:read', 'account:write']

const FLOATING_TAGS = [
  '⚡ BIM 360',
  '🏗️ Construction Cloud',
  '📐 AutoCAD',
  '🔩 Fusion 360',
]

// ── Particle canvas animation ─────────────────────────────────────────────────
interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  alpha: number
  hue: number
}

function useParticleCanvas(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    // Capture as non-null so TypeScript trusts them inside nested functions
    const c: HTMLCanvasElement        = canvas
    const ctx2: CanvasRenderingContext2D = ctx
    let raf = 0
    let particles: Particle[] = []
    let w = 0
    let h = 0

    function init() {
      w = c.width  = window.innerWidth
      h = c.height = window.innerHeight
      particles = Array.from({ length: 90 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        r: Math.random() * 1.6 + 0.4,
        alpha: Math.random() * 0.45 + 0.1,
        // hue: 195–220 = blues, occasionally purple (260) or cyan (185)
        hue: [195, 200, 205, 210, 185, 260][Math.floor(Math.random() * 6)],
      }))
    }

    function draw() {
      ctx2.clearRect(0, 0, w, h)

      // connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.hypot(dx, dy)
          if (dist < 120) {
            ctx2.beginPath()
            ctx2.moveTo(particles[i].x, particles[i].y)
            ctx2.lineTo(particles[j].x, particles[j].y)
            ctx2.strokeStyle = `rgba(6,150,215,${(1 - dist / 120) * 0.14})`
            ctx2.lineWidth = 0.6
            ctx2.stroke()
          }
        }
      }

      // dots
      for (const p of particles) {
        // update position
        p.x += p.vx
        p.y += p.vy
        if (p.x < -10) p.x = w + 10
        if (p.x > w + 10) p.x = -10
        if (p.y < -10) p.y = h + 10
        if (p.y > h + 10) p.y = -10

        ctx2.beginPath()
        ctx2.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx2.fillStyle = `hsla(${p.hue},80%,65%,${p.alpha})`
        ctx2.fill()
      }

      raf = requestAnimationFrame(draw)
    }

    init()
    draw()

    const onResize = () => init()
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
    }
  }, [canvasRef])
}

// ── AutodeskIcon SVG ──────────────────────────────────────────────────────────
function AutodeskIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M16 2L3 27h6L16 11l7 16h6L16 2z"
        fill="white"
      />
      <path
        d="M9.5 27h13L16 16.5 9.5 27z"
        fill="rgba(255,255,255,0.55)"
      />
    </svg>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const { isAuthenticated, isLoading, login } = useAuth()
  const navigate = useNavigate()

  useParticleCanvas(canvasRef)

  // If already authenticated, skip login
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/hubs', { replace: true })
    }
  }, [isAuthenticated, isLoading, navigate])

  const handleLogin = () => {
    setIsRedirecting(true)
    login() // async — redirects the page, no need to await
  }

  return (
    <div className="login-root">
      {/* Layer 0 — canvas */}
      <canvas ref={canvasRef} className="login-canvas" role="presentation" />

      {/* Layer 1 — grid */}
      <div className="login-grid" aria-hidden="true" />

      {/* Layer 2 — ambient glows */}
      <div className="glow-orb glow-orb-1" aria-hidden="true" />
      <div className="glow-orb glow-orb-2" aria-hidden="true" />
      <div className="glow-orb glow-orb-3" aria-hidden="true" />
      <div className="glow-orb glow-orb-4" aria-hidden="true" />

      {/* Layer 3 — floating tags */}
      {FLOATING_TAGS.map((tag, i) => (
        <div key={tag} className={`floating-tag floating-tag-${i + 1}`} aria-hidden="true">
          {tag}
        </div>
      ))}

      {/* Layer 10 — login card */}
      <main className="login-card" role="main">

        {/* Logo */}
        <div className="login-logo-area">
          <div className="login-logo-icon">
            <AutodeskIcon />
          </div>
          <div className="login-logo-text">
            <span className="brand">Autodesk</span>
            <span className="product">Data Portal</span>
          </div>
        </div>

        {/* Heading */}
        <h1 className="login-title">Welcome back</h1>
        <p className="login-subtitle">
          Sign in with your Autodesk account to access and manage your design &amp; construction data.
        </p>

        <div className="login-divider" />

        {/* Scopes */}
        <div className="scope-section">
          <div className="scope-label">Permissions requested</div>
          <div className="scope-badges">
            {SCOPES.map(s => (
              <span key={s} className="scope-badge">{s}</span>
            ))}
          </div>
        </div>

        {/* CTA */}
        <button
          className="login-btn"
          onClick={handleLogin}
          disabled={isRedirecting || isLoading}
          aria-label="Sign in with Autodesk"
        >
          {isRedirecting || isLoading ? (
            <>
              <div className="btn-spinner" />
              {isLoading ? 'Loading...' : 'Redirecting to Autodesk...'}
            </>
          ) : (
            <>
              {/* door-exit icon */}
              <svg
                className="btn-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              Sign in with Autodesk
              <svg
                className="btn-arrow"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </>
          )}
        </button>

        {/* Footer */}
        <div className="login-footer">
          <p>
            <svg
              className="footer-lock"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            <span className="status-dot" aria-hidden="true" />
            <span>OAuth 2.0 · 3-Legged Authentication</span>
          </p>
        </div>
      </main>
    </div>
  )
}
