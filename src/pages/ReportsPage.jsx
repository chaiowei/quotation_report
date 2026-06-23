import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { GUEST_MATERIALS, GUEST_QUOTATION } from '../lib/guestData'
import { FileText, Loader, ChevronDown, ChevronUp, Zap, BarChart3 } from 'lucide-react'

const INDICATOR = {
  green:  { emoji: '🟢', label: '優秀', textClass: 'text-emerald-700', bgClass: 'bg-emerald-50',  badgeCls: 'bg-emerald-100 text-emerald-700' },
  yellow: { emoji: '🟡', label: '合理', textClass: 'text-yellow-700', bgClass: 'bg-yellow-50/60', badgeCls: 'bg-yellow-100 text-yellow-700' },
  orange: { emoji: '🟠', label: '略高', textClass: 'text-orange-700', bgClass: 'bg-orange-50/60', badgeCls: 'bg-orange-100 text-orange-700' },
  red:    { emoji: '🔴', label: '偏貴', textClass: 'text-red-700',    bgClass: 'bg-red-50/60',    badgeCls: 'bg-red-100 text-red-700' },
  purple: { emoji: '🟣', label: '無基準',textClass: 'text-purple-700',bgClass: 'bg-purple-50/40', badgeCls: 'bg-purple-100 text-purple-700' },
  white:  { emoji: '⚪', label: '未比對',textClass: 'text-slate-500', bgClass: 'bg-slate-50/60',  badgeCls: 'bg-slate-100 text-slate-600' },
}

const STATUS = {
  pending:  { label: '待解析', cls: 'bg-amber-100 text-amber-700' },
  analyzed: { label: '已解析', cls: 'bg-emerald-100 text-emerald-700' },
  error:    { label: '解析失敗', cls: 'bg-red-100 text-red-700' },
}

function getIndicator(quotedPrice, refPrice) {
  if (refPrice == null) return 'purple'
  if (!quotedPrice) return 'white'
  const r = quotedPrice / refPrice
  if (r <= 0.9) return 'green'
  if (r <= 1.0) return 'yellow'
  if (r <= 1.1) return 'orange'
  return 'red'
}

function matchMaterial(item, materials) {
  const key = (item.spec || item.name || '').toLowerCase().slice(0, 15)
  if (!key) return null
  return materials.find(m =>
    (m.spec || m.name || '').toLowerCase().includes(key) ||
    key.includes((m.spec || m.name || '').toLowerCase().slice(0, 15))
  ) || null
}

function summarizeCounts(parsedItems, materials) {
  if (!parsedItems?.length) return null
  const counts = { green: 0, yellow: 0, orange: 0, red: 0, purple: 0, white: 0 }
  parsedItems.forEach(item => { counts[getIndicator(item.price, matchMaterial(item, materials)?.ref_price)]++ })
  return counts
}

export default function ReportsPage({ guestMode }) {
  const [quotations, setQuotations] = useState([])
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [analyzing, setAnalyzing] = useState(null)

  useEffect(() => {
    if (guestMode) {
      setQuotations([GUEST_QUOTATION]); setMaterials(GUEST_MATERIALS)
      setExpanded(GUEST_QUOTATION.id); setLoading(false); return
    }
    Promise.all([
      supabase.from('quotations').select('*').order('upload_date', { ascending: false }),
      supabase.from('materials').select('id,name,spec,ref_price,category'),
    ]).then(([qRes, mRes]) => {
      if (!qRes.error) setQuotations(qRes.data || [])
      if (!mRes.error) setMaterials(mRes.data || [])
      setLoading(false)
    })
  }, [guestMode])

  async function handleAnalyze(q) {
    setAnalyzing(q.id)
    try {
      const { data, error } = await supabase.functions.invoke('analyze-quotation', {
        body: { quotation_id: q.id, storage_path: q.storage_path, file_name: q.file_name },
      })
      if (error) throw error
      setQuotations(prev => prev.map(item => item.id === q.id ? { ...item, status: 'analyzed', parsed_items: data.parsed_items } : item))
    } catch (err) {
      alert('解析失敗：' + (err.message || '請確認 Edge Function 已部署'))
      setQuotations(prev => prev.map(item => item.id === q.id ? { ...item, status: 'error' } : item))
    }
    setAnalyzing(null)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">比對報告</h1>
        <p className="text-slate-500 text-sm mt-1">AI 解析後的燈號比對結果</p>
      </div>

      {/* Legend */}
      <div className="flex gap-3 flex-wrap">
        {Object.entries(INDICATOR).map(([k, { emoji, label }]) => (
          <span key={k} className="flex items-center gap-1.5 text-xs text-slate-500 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg shadow-sm">
            {emoji} <span className="font-medium">{label}</span>
          </span>
        ))}
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400">
          <Loader size={26} className="animate-spin mx-auto mb-3" />載入中...
        </div>
      ) : quotations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm py-20 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BarChart3 size={28} className="text-slate-400" />
          </div>
          <p className="font-semibold text-slate-600">尚無報告</p>
          <p className="text-slate-400 text-sm mt-1">先到「上傳報價單」頁面上傳檔案</p>
        </div>
      ) : (
        <div className="space-y-3">
          {quotations.map(q => {
            const badge = STATUS[q.status] || STATUS.pending
            const counts = summarizeCounts(q.parsed_items, materials)
            const isOpen = expanded === q.id
            const isAnalyzing = analyzing === q.id

            return (
              <div key={q.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Card header */}
                <div className="flex items-center gap-3 px-5 py-4">
                  <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl flex items-center justify-center shrink-0">
                    <FileText size={16} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded(isOpen ? null : q.id)}>
                    <div className="font-semibold text-slate-800 truncate">{q.project_name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{q.vendor || '未填廠商'} · {q.file_name} · {q.upload_date?.slice(0, 10)}</div>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-lg font-semibold shrink-0 ${badge.cls}`}>{badge.label}</span>
                  {counts && (
                    <div className="flex gap-1 text-sm shrink-0">
                      {Object.entries(counts).filter(([, v]) => v > 0).map(([k, v]) => (
                        <span key={k} className="flex items-center gap-0.5">{INDICATOR[k].emoji}<span className="text-xs text-slate-500">{v}</span></span>
                      ))}
                    </div>
                  )}
                  {q.status === 'pending' && !guestMode && (
                    <button onClick={() => handleAnalyze(q)} disabled={!!analyzing}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white rounded-lg text-xs font-semibold transition-all disabled:opacity-60 shrink-0 shadow-sm shadow-blue-500/25">
                      {isAnalyzing ? <Loader size={12} className="animate-spin" /> : <Zap size={12} />}
                      AI 解析
                    </button>
                  )}
                  <button onClick={() => setExpanded(isOpen ? null : q.id)} className="text-slate-400 hover:text-slate-600 transition-colors shrink-0">
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>

                {/* Expanded */}
                {isOpen && (
                  <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-4">
                    {!q.parsed_items?.length ? (
                      <div className="text-center py-8">
                        <Zap size={24} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-slate-400 text-sm">
                          {q.status === 'analyzed' ? '無解析項目' : '點擊「AI 解析」按鈕後，燈號比對結果將顯示在這裡'}
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-xs text-slate-500">
                              <th className="text-left pb-3 pr-3 w-8"></th>
                              <th className="text-left pb-3 pr-4 font-semibold uppercase tracking-wide">規格</th>
                              <th className="text-left pb-3 pr-4 font-semibold uppercase tracking-wide">單位</th>
                              <th className="text-right pb-3 pr-4 font-semibold uppercase tracking-wide">數量</th>
                              <th className="text-right pb-3 pr-4 font-semibold uppercase tracking-wide">報價單價</th>
                              <th className="text-right pb-3 pr-4 font-semibold uppercase tracking-wide">基準價</th>
                              <th className="text-right pb-3 font-semibold uppercase tracking-wide">差異%</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {q.parsed_items.map((item, i) => {
                              const mat = matchMaterial(item, materials)
                              const ind = getIndicator(item.price, mat?.ref_price)
                              const { emoji, textClass } = INDICATOR[ind]
                              const pct = mat?.ref_price && item.price
                                ? (((item.price - mat.ref_price) / mat.ref_price) * 100).toFixed(1)
                                : null
                              return (
                                <tr key={i} className="hover:bg-white/80 transition-colors">
                                  <td className="py-2.5 pr-3 text-lg leading-none">{emoji}</td>
                                  <td className={`py-2.5 pr-4 font-medium ${textClass}`}>{item.spec || item.name}</td>
                                  <td className="py-2.5 pr-4 text-slate-500">{item.unit}</td>
                                  <td className="py-2.5 pr-4 text-right text-slate-600">{item.qty}</td>
                                  <td className="py-2.5 pr-4 text-right font-mono font-semibold text-slate-800">{item.price?.toLocaleString()}</td>
                                  <td className="py-2.5 pr-4 text-right font-mono text-slate-400">{mat?.ref_price?.toLocaleString() ?? '—'}</td>
                                  <td className={`py-2.5 text-right font-mono font-semibold text-xs ${pct > 0 ? 'text-red-500' : pct < 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                    {pct !== null ? `${pct > 0 ? '+' : ''}${pct}%` : '—'}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
