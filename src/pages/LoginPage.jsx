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
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ background: '#f0fdfa' }}>
      {/* Left panel — hidden on small screens */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] shrink-0 flex-col items-center justify-center relative overflow-hidden p-14"
        style={{ background: 'linear-gradient(145deg, #082a28 0%, #0d3d3a 40%, #0a2e2b 100%)' }}>
        {/* Decorative circles */}
        <div className="absolute top-[-80px] right-[-80px] w-72 h-72 rounded-full opacity-10"
          style={{ background: '#0ABAB5' }} />
        <div className="absolute bottom-[-60px] left-[-60px] w-56 h-56 rounded-full opacity-10"
          style={{ background: '#068884' }} />
        <div className="absolute top-1/2 left-[-30px] w-32 h-32 rounded-full opacity-5"
          style={{ background: '#2dd4bf' }} />

        {/* Content */}
        <div className="relative z-10 w-full max-w-sm">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl shrink-0"
              style={{ background: 'linear-gradient(135deg, #0ABAB5 0%, #068884 100%)' }}>
              <Zap size={24} className="text-white" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">ProcureAI</span>
          </div>

          <h2 className="text-4xl font-bold text-white mb-5 leading-snug">
            工程報價<br />比對分析系統
          </h2>
          <p className="text-lg leading-relaxed mb-10" style={{ color: '#7ececa' }}>
            AI 自動解析報價單，即時比對主檔材料庫，燈號一眼看出議價空間。
          </p>

          <div className="space-y-4">
            {[
              '多格式上傳：PDF · Excel · Word · JPG',
              '多人共用，即時同步資料庫',
              'Gemini AI 解析，自動學習修正',
            ].map(t => (
              <div key={t} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full mt-2 shrink-0" style={{ background: '#0ABAB5' }} />
                <span className="text-base" style={{ color: '#9fdddb' }}>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center bg-white p-8 min-h-screen lg:min-h-0">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #0ABAB5 0%, #068884 100%)' }}>
              <Zap size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold" style={{ color: '#082a28' }}>ProcureAI</span>
          </div>

          <h1 className="text-3xl font-bold mb-2" style={{ color: '#082a28' }}>
            {mode === 'login' ? '歡迎回來' : '建立帳號'}
          </h1>
          <p className="text-base text-slate-500 mb-8">
            {mode === 'login' ? '請輸入帳號密碼登入系統' : '填入資料完成帳號建立'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-2">電子信箱</label>
              <div className="relative">
                <Mail size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full pl-11 pr-4 py-3.5 text-base border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none transition-all"
                  style={{ '--tw-ring-color': 'rgba(10,186,181,0.3)' }}
                  onFocus={e => { e.target.style.borderColor = '#0ABAB5'; e.target.style.boxShadow = '0 0 0 3px rgba(10,186,181,0.15)' }}
                  onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' }} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-2">密碼</label>
              <div className="relative">
                <Lock size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type={showPw ? 'text' : 'password'} required value={password}
                  onChange={e => setPassword(e.target.value)} placeholder="至少 6 個字元" minLength={6}
                  className="w-full pl-11 pr-12 py-3.5 text-base border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none transition-all"
                  onFocus={e => { e.target.style.borderColor = '#0ABAB5'; e.target.style.boxShadow = '0 0 0 3px rgba(10,186,181,0.15)' }}
                  onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' }} />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl px-4 py-3 text-[15px] text-red-700 bg-red-50 border border-red-200">{error}</div>
            )}
            {message && (
              <div className="rounded-xl px-4 py-3 text-[15px] text-emerald-700 bg-emerald-50 border border-emerald-200">{message}</div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl text-base font-semibold text-white transition-all disabled:opacity-60 shadow-lg mt-2"
              style={{ background: loading ? '#94a3b8' : 'linear-gradient(135deg, #0ABAB5 0%, #068884 100%)', boxShadow: '0 4px 15px rgba(10,186,181,0.35)' }}>
              {loading ? '處理中...' : mode === 'login' ? '登入' : '建立帳號'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMessage('') }}
              className="text-base font-medium transition-colors"
              style={{ color: '#0ABAB5' }}>
              {mode === 'login' ? '還沒有帳號？點此註冊' : '已有帳號？點此登入'}
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100">
            <button onClick={() => { onGuest(); navigate('/') }}
              className="w-full py-3.5 border-2 border-slate-200 hover:border-teal-300 rounded-xl text-base text-slate-500 hover:text-slate-700 transition-all font-medium"
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#99f6e4'; e.currentTarget.style.background = '#f0fdfa' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = 'transparent' }}>
              以訪客身份試用（展示資料）
            </button>
          </div>

          <p className="text-sm text-slate-400 text-center mt-5">僅限授權團隊成員使用</p>
        </div>
      </div>
    </div>
  )
}
