import { Upload, Database, FileText, TrendingUp, Eye, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const ACTIONS = [
  {
    icon: Upload,
    label: '上傳報價單',
    sub: '支援 PDF · Excel · Word · JPG',
    to: '/upload',
    iconBg: 'linear-gradient(135deg, #0ABAB5 0%, #068884 100%)',
    cardBg: '#e6f9f9',
    border: '#b2efec',
    shadow: 'rgba(10,186,181,0.15)',
  },
  {
    icon: Database,
    label: '主檔料料庫',
    sub: '管理材料基準價格與規格',
    to: '/materials',
    iconBg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    cardBg: '#ecfdf5',
    border: '#a7f3d0',
    shadow: 'rgba(16,185,129,0.15)',
  },
  {
    icon: FileText,
    label: '比對報告',
    sub: '查看 AI 解析燈號結果',
    to: '/reports',
    iconBg: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    cardBg: '#f5f3ff',
    border: '#ddd6fe',
    shadow: 'rgba(139,92,246,0.15)',
  },
]

const INDICATORS = [
  { emoji: '🟢', label: '優秀', desc: '低於基準 10% 以上' },
  { emoji: '🟡', label: '合理', desc: '基準價 ±10% 以內' },
  { emoji: '🟠', label: '略高', desc: '高於基準 10～20%' },
  { emoji: '🔴', label: '偏貴', desc: '高於基準 20% 以上' },
  { emoji: '🟣', label: '無基準', desc: '主檔無參考價格' },
  { emoji: '⚪', label: '未比對', desc: '主檔查無此料項' },
]

export default function DashboardPage({ guestMode }) {
  const navigate = useNavigate()

  return (
    <div className="max-w-4xl mx-auto space-y-7">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold" style={{ color: '#082a28' }}>總覽</h1>
        <p className="text-base text-slate-500 mt-1.5">
          {guestMode ? '訪客試用模式 — 以下為展示資料' : 'ProcureAI 工程報價比對分析系統 v5'}
        </p>
      </div>

      {/* Guest banner */}
      {guestMode && (
        <div className="flex items-start gap-4 rounded-2xl px-6 py-5 border border-amber-200"
          style={{ background: '#fffbeb' }}>
          <Eye size={20} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <div className="text-base font-semibold text-amber-800 mb-1">你正在使用訪客試用模式</div>
            <div className="text-[15px] text-amber-600 leading-relaxed">
              可瀏覽主檔料料庫（20 筆展示材料）與一份示範比對報告。上傳與修改功能須登入正式帳號。
            </div>
          </div>
        </div>
      )}

      {/* Action cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {ACTIONS.map(({ icon: Icon, label, sub, to, iconBg, cardBg, border, shadow }) => (
          <button key={to} onClick={() => navigate(to)}
            className="group rounded-2xl p-6 text-left border transition-all duration-200 cursor-pointer"
            style={{ background: cardBg, borderColor: border }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 8px 24px ${shadow}`; e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none' }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 shadow-md"
              style={{ background: iconBg }}>
              <Icon size={22} className="text-white" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold text-base text-slate-800 truncate">{label}</div>
                <div className="text-sm text-slate-500 mt-0.5 leading-snug">{sub}</div>
              </div>
              <ArrowRight size={16} className="text-slate-400 shrink-0 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        ))}
      </div>

      {/* Indicator legend */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm"
            style={{ background: 'linear-gradient(135deg, #0ABAB5 0%, #068884 100%)' }}>
            <TrendingUp size={16} className="text-white" />
          </div>
          <h3 className="text-base font-semibold text-slate-800">燈號比對說明</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
          {INDICATORS.map(({ emoji, label, desc }) => (
            <div key={emoji} className="flex items-center gap-3">
              <span className="text-2xl leading-none shrink-0">{emoji}</span>
              <div>
                <div className="text-[15px] font-semibold text-slate-800">{label}</div>
                <div className="text-sm text-slate-400 mt-0.5">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
