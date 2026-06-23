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

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Sidebar */}
      <aside className="w-60 bg-slate-900 flex flex-col shrink-0">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/50 shrink-0">
              <Zap size={18} className="text-white" />
            </div>
            <div>
              <div className="text-white font-bold text-sm leading-tight">ProcureAI</div>
              <div className="text-slate-500 text-xs mt-0.5">工程報價分析</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white font-medium shadow-sm shadow-blue-900/50'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User / Guest */}
        <div className="px-3 py-4 border-t border-slate-800">
          {guestMode ? (
            <>
              <div className="flex items-center gap-2 px-3 py-1.5 mb-1">
                <Eye size={12} className="text-amber-400" />
                <span className="text-xs text-amber-400 font-medium">訪客模式</span>
              </div>
              <button onClick={handleLogin}
                className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm text-blue-400 hover:bg-slate-800 hover:text-blue-300 transition-all font-medium">
                <LogIn size={15} />
                登入正式帳號
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3 px-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {userInitial}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-slate-400 truncate">{session?.user?.email}</div>
              </div>
              <button onClick={handleLogout} title="登出"
                className="text-slate-600 hover:text-red-400 transition-colors p-1">
                <LogOut size={15} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {guestMode && (
          <div className="flex items-center justify-between px-6 py-2.5 bg-amber-50 border-b border-amber-200 shrink-0">
            <div className="flex items-center gap-2 text-sm text-amber-700">
              <Eye size={14} />
              訪客試用模式 — 顯示展示資料，操作不會儲存
            </div>
            <button onClick={handleLogin}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">
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
