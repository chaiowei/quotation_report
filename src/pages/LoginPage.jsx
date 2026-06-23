import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Zap, Mail, Lock, Eye, EyeOff } from 'lucide-react'

export default function LoginPage({ session, onGuest }) {
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (session) navigate('/', { replace: true })
  }, [session, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true); setError(''); setMessage('')
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setMessage('已發送確認信，請檢查信箱後點擊連結完成註冊')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-slate-900 via-blue-950 to-violet-950 items-center justify-center p-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #3b82f6 0%, transparent 50%), radial-gradient(circle at 80% 20%, #7c3aed 0%, transparent 50%)' }} />
        <div className="relative z-10 text-white max-w-sm">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-11 h-11 bg-gradient-to-br from-blue-400 to-violet-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Zap size={22} className="text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">ProcureAI</span>
          </div>
          <h2 className="text-3xl font-bold mb-4 leading-tight">工程報價<br/>比對分析系統</h2>
          <p className="text-slate-400 text-base leading-relaxed mb-10">
            AI 自動解析報價單，即時比對主檔材料庫，燈號一眼看出議價空間。
          </p>
          <div className="space-y-3">
            {[
              '多格式上傳：PDF · Excel · Word · JPG',
              '多人共用，即時同步資料庫',
              'Gemini AI 解析，自動學習修正',
            ].map(t => (
              <div key={t} className="flex items-center gap-3 text-slate-300 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 lg:max-w-[440px] flex items-center justify-center bg-white p-8">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl flex items-center justify-center">
              <Zap size={15} className="text-white" />
            </div>
            <span className="font-bold text-slate-900">ProcureAI</span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-1">
            {mode === 'login' ? '歡迎回來' : '建立帳號'}
          </h1>
          <p className="text-slate-500 text-sm mb-7">
            {mode === 'login' ? '請輸入你的帳號密碼登入' : '填入資料完成註冊'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">電子信箱</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">密碼</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type={showPw ? 'text' : 'password'} required value={password}
                  onChange={e => setPassword(e.target.value)} placeholder="至少 6 個字元" minLength={6}
                  className="w-full pl-10 pr-10 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-sm text-red-600">{error}</div>}
            {message && <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 text-sm text-green-600">{message}</div>}

            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-all shadow-sm shadow-blue-500/25 mt-1">
              {loading ? '處理中...' : mode === 'login' ? '登入' : '建立帳號'}
            </button>
          </form>

          <div className="mt-5 text-center">
            <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMessage('') }}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors">
              {mode === 'login' ? '還沒有帳號？點此註冊' : '已有帳號？點此登入'}
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100">
            <button onClick={() => { onGuest(); navigate('/') }}
              className="w-full py-2.5 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-500 hover:text-slate-700 rounded-xl text-sm transition-all">
              以訪客身份試用（展示資料）
            </button>
          </div>

          <p className="text-xs text-slate-400 text-center mt-5">僅限授權團隊成員使用</p>
        </div>
      </div>
    </div>
  )
}
