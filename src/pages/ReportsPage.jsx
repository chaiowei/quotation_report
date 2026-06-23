import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { FileText, Loader } from 'lucide-react'

const INDICATOR_COLORS = {
  green: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', emoji: '🟢' },
  red: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', emoji: '🔴' },
  yellow: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', emoji: '🟡' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', emoji: '🟠' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', emoji: '🟣' },
  white: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', emoji: '⚪' },
}

export default function ReportsPage() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    fetchReports()
  }, [])

  async function fetchReports() {
    setLoading(true)
    // TODO M7: query supabase quotations table
    await new Promise(r => setTimeout(r, 500))
    setReports([]) // placeholder
    setLoading(false)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800">比對報告</h2>
        <p className="text-slate-500 text-sm mt-1">AI 解析後的燈號比對結果</p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400">
          <Loader size={24} className="animate-spin mx-auto mb-3" />載入中...
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 py-20 text-center">
          <FileText size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">尚無報告</p>
          <p className="text-slate-400 text-sm mt-1">上傳報價單並完成 AI 解析後，結果會顯示在這裡</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-medium text-slate-800">{r.project_name}</div>
                  <div className="text-sm text-slate-500">{r.vendor} · {r.upload_date?.slice(0, 10)}</div>
                </div>
                <div className="flex gap-1 text-lg">
                  {Object.values(INDICATOR_COLORS).map(({ emoji }) => (
                    <span key={emoji}>{emoji}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
