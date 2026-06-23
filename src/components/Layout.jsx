import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { LayoutDashboard, Upload, Database, FileText, LogOut, LogIn, Eye, Zap } from 'lucide-react'

const navItems = [
  { to: '/', label: '總覽', icon: LayoutDashboard, end: true },
  { to: '/upload', label: '上傳報價單', icon: Upload },
  { to: '/materials', label: '主檔料料庫', icon: Database },
  { to: '/reports', label: '比對報告', icon: FileText },
]

export default function Layout({ session, guestMode, onExitGuest }) {
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  function handleLogin() {
    onExitGuest()
    navigate('/login')
  }

  const userInitial = session?.user?.email?.[0]?.toUpperCase() || '?'
  const userEmail = session?.user?.email || ''

  return (
    <div className="flex h-screen bg-teal-50" style={{ background: '#f0fdfa' }}>
      {/* Sidebar */}
      <aside className="w-64 flex flex-col shrink-0 shadow-xl" style={{ background: '#082a28' }}>
        {/* Logo */}
        <div className="px-5 py-5 border-b" style={{ borderColor: '#0d3d3a' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg shrink-0"
              style={{ background: 'linear-gradient(135deg, #0ABAB5 0%, #068884 100%)' }}>
              <Zap size={20} className="text-white" />
            </div>
            <div>
              <div className="text-white font-bold text-base leading-tight tracking-tight">ProcureAI</div>
              <div className="text-sm mt-0.5" style={{ color: '#4da8a4' }}>工程報價分析</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5 space-y-1.5">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-medium transition-all ${
                  isActive
                    ? 'text-white shadow-lg'
                    : 'text-teal-300 hover:text-white'
                }`
              }
              style={({ isActive }) => isActive
                ? { background: 'linear-gradient(135deg, #0ABAB5 0%, #068884 100%)', boxShadow: '0 4px 12px rgba(10,186,181,0.3)' }
                : { color: '#5bbdb9' }
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} style={{ color: isActive ? '#fff' : '#5bbdb9' }} />
                  <span style={{ color: isActive ? '#fff' : '#5bbdb9' }}>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User / Guest */}
        <div className="px-3 py-4 border-t" style={{ borderColor: '#0d3d3a' }}>
          {guestMode ? (
            <>
              <div className="flex items-center gap-2 px-3 py-2 mb-1 rounded-lg" style={{ background: 'rgba(245,158,11,0.15)' }}>
                <Eye size={14} className="text-amber-400 shrink-0" />
                <span className="text-sm text-amber-400 font-medium">訪客試用模式</span>
              </div>
              <button onClick={handleLogin}
                className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-[15px] font-medium transition-all"
                style={{ color: '#0ABAB5' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(10,186,181,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <LogIn size={17} />
                <span>登入正式帳號</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3 px-2 py-1">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
                style={{ background: 'linear-gradient(135deg, #0ABAB5 0%, #068884 100%)' }}>
                {userInitial}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate" style={{ color: '#5bbdb9' }}>{userEmail}</div>
              </div>
              <button onClick={handleLogout} title="登出"
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: '#3d7a77' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(248,113,113,0.1)' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#3d7a77'; e.currentTarget.style.background = 'transparent' }}>
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {guestMode && (
          <div className="flex items-center justify-between px-6 py-3 shrink-0 border-b border-amber-200"
            style={{ background: '#fffbeb' }}>
            <div className="flex items-center gap-2 text-[15px] text-amber-700 font-medium">
              <Eye size={16} />
              訪客試用模式 — 顯示展示資料，操作不會儲存
            </div>
            <button onClick={handleLogin}
              className="text-sm font-semibold transition-colors px-3 py-1.5 rounded-lg"
              style={{ color: '#0ABAB5' }}
              onMouseEnter={e => e.currentTarget.style.background = '#e6f9f9'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              登入正式帳號 →
            </button>
          </div>
        )}
        <main className="flex-1 overflow-auto p-7">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
