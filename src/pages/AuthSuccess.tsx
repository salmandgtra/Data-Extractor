/**
 * AuthSuccess — /auth/success
 *
 * Flow:
 *  1. FastAPI callback stores the token server-side and redirects here with ?nonce=XXX
 *  2. This page calls GET /auth/token?nonce=XXX  (CORS-allowed, same machine)
 *  3. Receives token JSON and calls localStorage.setItem at localhost:5173 origin
 *  4. Navigates to /dashboard
 *
 * Token is visible in DevTools → Application → Local Storage → http://localhost:5173
 */
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_URL = import.meta.env.VITE_API_URL ?? `http://${globalThis.location.hostname}:8080`

const BACKEND_HEADERS = {
  'Content-Type': 'application/json',
  'ngrok-skip-browser-warning': 'true',
}

export default function AuthSuccess() {
  const navigate   = useNavigate()
  const didFetch   = useRef(false)          // guard against StrictMode double-invoke
  const [error, setError]   = useState<string | null>(null)
  const [status, setStatus] = useState('Completing sign-in...')

  useEffect(() => {
    if (didFetch.current) return            // already running — skip second invocation
    didFetch.current = true

    const nonce = new URLSearchParams(globalThis.location.search).get('nonce')

    if (!nonce) {
      setError('Missing nonce in redirect URL. Please try logging in again.')
      return
    }

    setStatus('Fetching token...')

    fetch(`${API_URL}/auth/token?nonce=${nonce}`, { headers: BACKEND_HEADERS })
      .then(res => {
        if (!res.ok) throw new Error(`Server returned ${res.status}`)
        return res.json()
      })
      .then(token => {
        const expiresAt = Date.now() + (token.expires_in ?? 3600) * 1000

        // ── Write to localStorage at the frontend origin (localhost:5173) ──
        localStorage.setItem('autodesk_access_token',  token.access_token)
        localStorage.setItem('autodesk_refresh_token', token.refresh_token ?? '')
        localStorage.setItem('autodesk_token_expiry',  String(expiresAt))
        localStorage.setItem('autodesk_token_data',    JSON.stringify(token))

        setStatus('Redirecting...')
        navigate('/hubs', { replace: true })
      })
      .catch(err => {
        console.error('[AuthSuccess]', err)
        setError(`Failed to retrieve token: ${err.message}`)
      })
  }, [navigate])

  if (error) {
    return (
      <div style={containerStyle}>
        <p style={{ color: '#ff6b6b', fontSize: 14, textAlign: 'center', maxWidth: 400 }}>{error}</p>
        <a href="/" style={{ color: '#0696D7', fontSize: 13 }}>← Back to Login</a>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <div style={spinnerStyle} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>{status}</p>
    </div>
  )
}

const containerStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  justifyContent: 'center', height: '100vh', gap: 16,
  background: '#040815', fontFamily: 'system-ui, sans-serif',
}

const spinnerStyle: React.CSSProperties = {
  width: 36, height: 36,
  border: '3px solid rgba(6,150,215,0.2)',
  borderTopColor: '#0696D7', borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
}
