import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { LayoutDashboard, Upload, Database, FileText, LogOut } from 'lucide-react'

const navItems = [
  { to: '/', label: '總覽', icon: LayoutDashboard, end: true },
  { to: '/upload', label: '上傳報價單', icon: Upload },
  { to: '/materials', label: '主檔料料庫', icon: Database },
  { to: '/reports', label: '比對報告', icon: FileText },
]

export default function Layout({ session }) {
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
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
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}
