import { Upload, Database, FileText, TrendingUp, Eye } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const INDICATORS = [
  { color: '🟢', label: '低於最低價', desc: '最優惠' },
  { color: '🔴', label: '高於最高價', desc: '偏貴' },
  { color: '🟡', label: '接近最低價', desc: '良好' },
  { color: '🟠', label: '接近最高價', desc: '偏高' },
  { color: '🟣', label: '無法比對', desc: '規格不符' },
  { color: '⚪', label: '主檔無此料', desc: '新品項' },
]

export default function DashboardPage({ guestMode }) {
  const navigate = useNavigate()

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">總覽</h2>
        <p className="text-slate-500 text-sm mt-1">
          {guestMode ? '訪客試用模式 — 以下為展示資料' : '工程報價比對分析系統 v5'}
        </p>
      </div>

      {guestMode && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <Eye size={18} className="text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-700">
            <div className="font-medium mb-1">你正在使用訪客試用模式</div>
            <div className="text-amber-600">可瀏覽主檔料料庫（20 筆展示材料）與一份示範比對報告。上傳功能及資料修改須登入正式帳號。</div>
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: Upload, label: '上傳報價單', sub: '支援 PDF / Excel / Word / JPG', to: '/upload', color: 'blue' },
          { icon: Database, label: '主檔料料庫', sub: '管理材料基準價格', to: '/materials', color: 'emerald' },
          { icon: FileText, label: '比對報告', sub: '查看歷史分析結果', to: '/reports', color: 'violet' },
        ].map(({ icon: Icon, label, sub, to, color }) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            className={`bg-white rounded-xl border border-slate-200 p-5 text-left hover:border-${color}-300 hover:shadow-sm transition-all group`}
          >
            <div className={`w-10 h-10 rounded-lg bg-${color}-50 flex items-center justify-center mb-3`}>
              <Icon size={20} className={`text-${color}-600`} />
            </div>
            <div className="font-medium text-slate-800 text-sm">{label}</div>
            <div className="text-xs text-slate-500 mt-0.5">{sub}</div>
          </button>
        ))}
      </div>

      {/* Indicator legend */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <TrendingUp size={16} />
          燈號說明
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {INDICATORS.map(({ color, label, desc }) => (
            <div key={color} className="flex items-center gap-2 text-sm">
              <span className="text-lg leading-none">{color}</span>
              <div>
                <div className="text-slate-700 font-medium">{label}</div>
                <div className="text-slate-400 text-xs">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
