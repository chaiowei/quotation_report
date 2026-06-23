import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import UploadPage from './pages/UploadPage'
import MaterialsPage from './pages/MaterialsPage'
import ReportsPage from './pages/ReportsPage'

function ProtectedRoute({ session, guestMode, children }) {
  if (!session && !guestMode) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [guestMode, setGuestMode] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) setGuestMode(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-500 text-lg">載入中...</div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage session={session} onGuest={() => setGuestMode(true)} />} />
      <Route path="/" element={
        <ProtectedRoute session={session} guestMode={guestMode}>
          <Layout session={session} guestMode={guestMode} onExitGuest={() => setGuestMode(false)} />
        </ProtectedRoute>
      }>
        <Route index element={<DashboardPage guestMode={guestMode} />} />
        <Route path="upload" element={<UploadPage session={session} guestMode={guestMode} />} />
        <Route path="materials" element={<MaterialsPage session={session} guestMode={guestMode} />} />
        <Route path="reports" element={<ReportsPage guestMode={guestMode} />} />
      </Route>
    </Routes>
  )
}
