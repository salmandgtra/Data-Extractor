import { useCallback, useEffect, useRef, useState } from 'react'

// Use env var if set, otherwise derive from current hostname so LAN access works automatically
const API_URL = import.meta.env.VITE_API_URL ?? `http://${globalThis.location.hostname}:8080`

// Required when backend is behind ngrok — bypasses the browser warning interstitial
const BACKEND_HEADERS = {
  'Content-Type': 'application/json',
  'ngrok-skip-browser-warning': 'true',
}

/** 50 minutes in milliseconds — refresh before Autodesk's 60-min expiry */
const REFRESH_INTERVAL_MS = 50 * 60 * 1000


export interface TokenData {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
  [key: string]: unknown
}

// ── localStorage helpers ──────────────────────────────────────────────────────

function storeTokens(data: TokenData): void {
  const expiresAt = Date.now() + data.expires_in * 1000
  localStorage.setItem('autodesk_access_token', data.access_token)
  localStorage.setItem('autodesk_refresh_token', data.refresh_token ?? '')
  localStorage.setItem('autodesk_token_expiry', expiresAt.toString())
  localStorage.setItem('autodesk_token_data', JSON.stringify(data))
}

function readStoredTokens(): TokenData | null {
  const token = localStorage.getItem('autodesk_access_token')
  const expiry = localStorage.getItem('autodesk_token_expiry')
  const raw = localStorage.getItem('autodesk_token_data')
  if (!token || !expiry || !raw) return null
  if (Date.now() > Number.parseInt(expiry, 10)) return null // expired
  return JSON.parse(raw) as TokenData
}

function clearStoredTokens(): void {
  localStorage.removeItem('autodesk_access_token')
  localStorage.removeItem('autodesk_refresh_token')
  localStorage.removeItem('autodesk_token_expiry')
  localStorage.removeItem('autodesk_token_data')
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [tokenData, setTokenData] = useState<TokenData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Refresh ────────────────────────────────────────────────────────────────
  const refreshToken = useCallback(async (): Promise<boolean> => {
    const storedRefresh = localStorage.getItem('autodesk_refresh_token')
    if (!storedRefresh) return false

    setIsRefreshing(true)
    try {
      const res = await fetch(`${API_URL}/oauth/refresh`, {
        method: 'POST',
        headers: BACKEND_HEADERS,
        body: JSON.stringify({ refresh_token: storedRefresh }),
      })

      if (!res.ok) throw new Error(`Refresh HTTP ${res.status}`)

      const newData: TokenData = await res.json()
      storeTokens(newData)
      setTokenData(newData)
      setIsAuthenticated(true)
      console.log('[useAuth] Token refreshed successfully')
      return true
    } catch (err) {
      console.error('[useAuth] Token refresh failed:', err)
      logout()
      return false
    } finally {
      setIsRefreshing(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    clearStoredTokens()
    setIsAuthenticated(false)
    setTokenData(null)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // ── Start refresh interval ─────────────────────────────────────────────────
  const startRefreshInterval = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      console.log('[useAuth] Running scheduled token refresh (50 min)')
      refreshToken()
    }, REFRESH_INTERVAL_MS)
  }, [refreshToken])

  // ── Bootstrap on mount ─────────────────────────────────────────────────────
  useEffect(() => {
    const stored = readStoredTokens()
    if (stored) {
      setTokenData(stored)
      setIsAuthenticated(true)
      startRefreshInterval()
    }
    setIsLoading(false)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [startRefreshInterval])

  // ── Login — backend generates PKCE + auth URL, frontend just redirects ──────
  const login = useCallback(async () => {
    const res = await fetch(`${API_URL}/auth/authorize`, { headers: BACKEND_HEADERS })
    if (!res.ok) throw new Error(`Failed to get auth URL: ${res.status}`)
    const { url } = await res.json()
    globalThis.location.href = url
  }, [])

  return {
    isAuthenticated,
    tokenData,
    isLoading,
    isRefreshing,
    login,
    logout,
    refreshToken,
  }
}
