import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api, setAuthLostHandler, tokens } from './api'
import type { AuthSession, Role, User } from './types'

interface AuthValue {
  user: User | null
  /** True until the initial `GET /api/auth/me` settles. */
  booting: boolean
  isFarmer: boolean
  isAuthenticated: boolean
  adoptSession: (session: AuthSession) => void
  setUser: (user: User) => void
  refreshUser: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null)
  const [booting, setBooting] = useState(true)

  // A failed refresh inside the API client drops us back to signed-out.
  useEffect(() => {
    setAuthLostHandler(() => setUserState(null))
  }, [])

  useEffect(() => {
    let cancelled = false
    async function boot() {
      if (!tokens.access()) {
        setBooting(false)
        return
      }
      try {
        const me = await api.me()
        if (!cancelled) setUserState(me)
      } catch {
        if (!cancelled) {
          tokens.clear()
          setUserState(null)
        }
      } finally {
        if (!cancelled) setBooting(false)
      }
    }
    void boot()
    return () => {
      cancelled = true
    }
  }, [])

  const adoptSession = useCallback((session: AuthSession) => {
    tokens.set(session.accessToken, session.refreshToken)
    setUserState(session.user)
  }, [])

  const refreshUser = useCallback(async () => {
    const me = await api.me()
    setUserState(me)
  }, [])

  const signOut = useCallback(async () => {
    const refreshToken = tokens.refresh()
    try {
      await api.logout(refreshToken)
    } catch {
      // Logout is best-effort: the local session goes away either way.
    }
    tokens.clear()
    setUserState(null)
  }, [])

  const value = useMemo<AuthValue>(
    () => ({
      user,
      booting,
      isFarmer: user?.role === 'farmer',
      isAuthenticated: !!user,
      adoptSession,
      setUser: setUserState,
      refreshUser,
      signOut,
    }),
    [user, booting, adoptSession, refreshUser, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

export const ROLES: Role[] = ['farmer', 'buyer', 'dealer']
