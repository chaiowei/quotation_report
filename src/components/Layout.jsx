import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { LayoutDashboard, Upload, Database, FileText, LogOut, LogIn, Eye } from 'lucide-react'

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

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200">
          <h1 className="text-base font-bold text-slate-800">ProcureAI</h1>
          <p className="text-xs text-slate-500 mt-0.5">工程報價分析系統</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-200">
          {guestMode ? (
            <>
              <div className="flex items-center gap-2 px-3 mb-2">
                <Eye size={12} className="text-amber-500" />
                <span className="text-xs text-amber-600 font-medium">訪客模式</span>
              </div>
              <button
                onClick={handleLogin}
                className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-blue-600 hover:bg-blue-50 transition-colors font-medium"
              >
                <LogIn size={16} />
                登入正式帳號
              </button>
            </>
          ) : (
            <>
              <div className="text-xs text-slate-500 px-3 mb-2 truncate">
                {session?.user?.email}
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <LogOut size={16} />
                登出
              </button>
            </>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Guest banner */}
        {guestMode && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-sm text-amber-700">
              <Eye size={14} />
              <span>訪客試用模式 — 顯示展示資料，不會儲存任何操作</span>
            </div>
            <button
              onClick={handleLogin}
              className="text-xs font-medium text-blue-600 hover:underline"
            >
              登入正式帳號 →
            </button>
          </div>
        )}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
