import { Upload, Database, FileText, TrendingUp, Eye, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const ACTIONS = [
  {
    icon: Upload,
    label: '上傳報價單',
    sub: '支援 PDF · Excel · Word · JPG',
    to: '/upload',
    gradient: 'from-blue-500 to-blue-600',
    bg: 'from-blue-50 to-blue-100/50',
    border: 'border-blue-100',
    hover: 'hover:border-blue-200 hover:shadow-blue-100',
  },
  {
    icon: Database,
    label: '主檔料料庫',
    sub: '管理材料基準價格與規格',
    to: '/materials',
    gradient: 'from-emerald-500 to-teal-600',
    bg: 'from-emerald-50 to-teal-50',
    border: 'border-emerald-100',
    hover: 'hover:border-emerald-200 hover:shadow-emerald-100',
  },
  {
    icon: FileText,
    label: '比對報告',
    sub: '查看 AI 解析燈號結果',
    to: '/reports',
    gradient: 'from-violet-500 to-purple-600',
    bg: 'from-violet-50 to-purple-50',
    border: 'border-violet-100',
    hover: 'hover:border-violet-200 hover:shadow-violet-100',
  },
]

const INDICATORS = [
  { emoji: '🟢', label: '優秀', desc: '低於基準 10% 以上' },
  { emoji: '🟡', label: '合理', desc: '基準價 ±10% 以內' },
  { emoji: '🟠', label: '略高', desc: '高於基準 10-20%' },
  { emoji: '🔴', label: '偏貴', desc: '高於基準 20% 以上' },
  { emoji: '🟣', label: '無基準', desc: '主檔無參考價格' },
  { emoji: '⚪', label: '未比對', desc: '主檔查無此料項' },
]

export default function DashboardPage({ guestMode }) {
  const navigate = useNavigate()

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">總覽</h1>
          <p className="text-slate-500 text-sm mt-1">
            {guestMode ? '訪客試用模式 — 以下為展示資料' : 'ProcureAI 工程報價比對分析系統 v5'}
          </p>
        </div>
      </div>

      {/* Guest banner */}
      {guestMode && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
          <Eye size={18} className="text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-semibold text-amber-800 mb-0.5">你正在使用訪客試用模式</div>
            <div className="text-amber-600">可瀏覽主檔料料庫（20 筆展示材料）與一份示範比對報告。上傳與修改功能須登入正式帳號。</div>
          </div>
        </div>
      )}

      {/* Action cards */}
      <div className="grid grid-cols-3 gap-4">
        {ACTIONS.map(({ icon: Icon, label, sub, to, gradient, bg, border, hover }) => (
          <button key={to} onClick={() => navigate(to)}
            className={`group bg-gradient-to-br ${bg} border ${border} ${hover} rounded-2xl p-5 text-left hover:shadow-md transition-all duration-200`}>
            <div className={`w-10 h-10 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center mb-4 shadow-sm group-hover:scale-105 transition-transform`}>
              <Icon size={19} className="text-white" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-800 text-sm">{label}</div>
                <div className="text-xs text-slate-500 mt-0.5">{sub}</div>
              </div>
              <ArrowRight size={14} className="text-slate-400 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all" />
            </div>
          </button>
        ))}
      </div>

      {/* Indicator legend */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-violet-600 rounded-lg flex items-center justify-center">
            <TrendingUp size={14} className="text-white" />
          </div>
          <h3 className="font-semibold text-slate-800 text-sm">燈號比對說明</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {INDICATORS.map(({ emoji, label, desc }) => (
            <div key={emoji} className="flex items-center gap-3">
              <span className="text-xl leading-none shrink-0">{emoji}</span>
              <div>
                <div className="text-slate-800 font-medium text-sm">{label}</div>
                <div className="text-slate-400 text-xs mt-0.5">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
