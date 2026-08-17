import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Layout } from './components/Layout'
import { LoadingBlock } from './components/ui'
import { useAuth } from './lib/auth'
import { useI18n, useT } from './lib/i18n'
import Barter from './pages/Barter'
import Chat from './pages/Chat'
import CropDoctor from './pages/CropDoctor'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Market from './pages/Market'
import Notifications from './pages/Notifications'
import Orders from './pages/Orders'
import Produce from './pages/Produce'
import ProduceDetail from './pages/ProduceDetail'
import Profile from './pages/Profile'
import Schemes from './pages/Schemes'

export default function App() {
  const { isAuthenticated, booting, user } = useAuth()
  const { language, setLanguage } = useI18n()
  const t = useT()
  const location = useLocation()

  // Adopt the language stored on the account once we know who is signed in,
  // so a farmer who set Marathi on their phone gets Marathi on a new device.
  useEffect(() => {
    if (user?.preferredLanguage && user.preferredLanguage !== language) {
      setLanguage(user.preferredLanguage)
    }
    // Only react to the account value; local switches must not be overridden.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingBlock label={t('loading')} />
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/market" element={<Market />} />
        <Route path="/produce" element={<Produce />} />
        <Route path="/produce/:id" element={<ProduceDetail />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/barter" element={<Barter />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/crop" element={<CropDoctor />} />
        <Route path="/schemes" element={<Schemes />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
