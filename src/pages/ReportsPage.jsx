import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { GUEST_MATERIALS, GUEST_QUOTATION } from '../lib/guestData'
import { FileText, Loader, ChevronDown, ChevronUp, Zap, BarChart3 } from 'lucide-react'

const INDICATOR = {
  green:  { emoji: '🟢', label: '優秀',  textColor: '#059669', rowBg: '#f0fdf4', badgeBg: '#d1fae5', badgeText: '#065f46' },
  yellow: { emoji: '🟡', label: '合理',  textColor: '#a16207', rowBg: '#fefce8', badgeBg: '#fef9c3', badgeText: '#713f12' },
  orange: { emoji: '🟠', label: '略高',  textColor: '#c2410c', rowBg: '#fff7ed', badgeBg: '#fed7aa', badgeText: '#9a3412' },
  red:    { emoji: '🔴', label: '偏貴',  textColor: '#dc2626', rowBg: '#fff1f2', badgeBg: '#fecdd3', badgeText: '#9f1239' },
  purple: { emoji: '🟣', label: '無基準', textColor: '#7c3aed', rowBg: '#faf5ff', badgeBg: '#e9d5ff', badgeText: '#5b21b6' },
  white:  { emoji: '⚪', label: '未比對', textColor: '#64748b', rowBg: '#f8fafc', badgeBg: '#e2e8f0', badgeText: '#475569' },
}

const STATUS = {
  pending:  { label: '待解析', bg: '#fff9e6', text: '#92400e', border: '#fde68a' },
  analyzed: { label: '已解析', bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0' },
  error:    { label: '解析失敗', bg: '#fff1f2', text: '#9f1239', border: '#fecdd3' },
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
      // Surface the actual server-side error message
      const serverErr = data?.error || error?.message
      if (serverErr) throw new Error(serverErr)
      setQuotations(prev => prev.map(item => item.id === q.id ? { ...item, status: 'analyzed', parsed_items: data.parsed_items } : item))
    } catch (err) {
      alert('AI 解析失敗：\n\n' + err.message)
      setQuotations(prev => prev.map(item => item.id === q.id ? { ...item, status: 'error' } : item))
    }
    setAnalyzing(null)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold" style={{ color: '#082a28' }}>比對報告</h1>
        <p className="text-base text-slate-500 mt-1.5">AI 解析後的燈號比對結果</p>
      </div>

      {/* Legend */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(INDICATOR).map(([k, { emoji, label, badgeBg, badgeText }]) => (
          <span key={k} className="flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-xl border"
            style={{ background: badgeBg, color: badgeText, borderColor: badgeBg }}>
            <span className="text-base">{emoji}</span> {label}
          </span>
        ))}
      </div>

      {loading ? (
        <div className="py-24 text-center text-slate-400">
          <Loader size={28} className="animate-spin mx-auto mb-3" style={{ color: '#0ABAB5' }} />
          <span className="text-[15px]">載入中...</span>
        </div>
      ) : quotations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm py-24 text-center">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: '#e0f7f6' }}>
            <BarChart3 size={34} style={{ color: '#0ABAB5' }} />
          </div>
          <p className="text-lg font-semibold text-slate-600">尚無報告</p>
          <p className="text-[15px] text-slate-400 mt-1.5">先到「上傳報價單」頁面上傳檔案</p>
        </div>
      ) : (
        <div className="space-y-4">
          {quotations.map(q => {
            const badge = STATUS[q.status] || STATUS.pending
            const counts = summarizeCounts(q.parsed_items, materials)
            const isOpen = expanded === q.id
            const isAnalyzing = analyzing === q.id

            return (
              <div key={q.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Card header */}
                <div className="flex items-center gap-4 px-6 py-5">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-md"
                    style={{ background: 'linear-gradient(135deg, #0ABAB5 0%, #068884 100%)' }}>
                    <FileText size={18} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded(isOpen ? null : q.id)}>
                    <div className="text-base font-semibold text-slate-800 truncate">{q.project_name}</div>
                    <div className="text-sm text-slate-400 mt-0.5 truncate">{q.vendor || '未填廠商'} · {q.file_name} · {q.upload_date?.slice(0, 10)}</div>
                  </div>
                  <span className="text-sm font-semibold px-3 py-1.5 rounded-lg shrink-0 border"
                    style={{ background: badge.bg, color: badge.text, borderColor: badge.border }}>
                    {badge.label}
                  </span>
                  {counts && (
                    <div className="flex gap-1.5 shrink-0">
                      {Object.entries(counts).filter(([, v]) => v > 0).map(([k, v]) => (
                        <span key={k} className="flex items-center gap-0.5">
                          <span className="text-base">{INDICATOR[k].emoji}</span>
                          <span className="text-sm text-slate-500 font-medium">{v}</span>
                        </span>
                      ))}
                    </div>
                  )}
                  {q.status === 'pending' && !guestMode && (
                    <button onClick={() => handleAnalyze(q)} disabled={!!analyzing}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60 shrink-0 whitespace-nowrap"
                      style={{ background: 'linear-gradient(135deg, #0ABAB5 0%, #068884 100%)', boxShadow: '0 3px 10px rgba(10,186,181,0.3)' }}>
                      {isAnalyzing ? <Loader size={14} className="animate-spin" /> : <Zap size={14} />}
                      AI 解析
                    </button>
                  )}
                  <button onClick={() => setExpanded(isOpen ? null : q.id)} className="text-slate-400 hover:text-slate-600 transition-colors shrink-0 p-1">
                    {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>

                {/* Expanded */}
                {isOpen && (
                  <div className="border-t border-slate-100 px-6 py-5" style={{ background: '#f8fffe' }}>
                    {!q.parsed_items?.length ? (
                      <div className="text-center py-10">
                        <Zap size={28} className="mx-auto mb-3" style={{ color: '#99e7e5' }} />
                        <p className="text-[15px] text-slate-400">
                          {q.status === 'analyzed' ? '無解析項目' : '點擊「AI 解析」按鈕後，燈號比對結果將顯示在這裡'}
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="text-sm font-semibold text-slate-500 border-b border-slate-200">
                              <th className="text-left pb-3 pr-3 w-8"></th>
                              <th className="text-left pb-3 pr-4">規格</th>
                              <th className="text-left pb-3 pr-4">單位</th>
                              <th className="text-right pb-3 pr-4">數量</th>
                              <th className="text-right pb-3 pr-4">報價單價</th>
                              <th className="text-right pb-3 pr-4">基準價</th>
                              <th className="text-right pb-3">差異 %</th>
                            </tr>
                          </thead>
                          <tbody>
                            {q.parsed_items.map((item, i) => {
                              const mat = matchMaterial(item, materials)
                              const ind = getIndicator(item.price, mat?.ref_price)
                              const { emoji, textColor, rowBg } = INDICATOR[ind]
                              const pct = mat?.ref_price && item.price
                                ? (((item.price - mat.ref_price) / mat.ref_price) * 100).toFixed(1)
                                : null
                              return (
                                <tr key={i} className="border-b border-slate-50 last:border-0 transition-colors"
                                  onMouseEnter={e => e.currentTarget.style.background = rowBg}
                                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                  <td className="py-3.5 pr-3 text-lg leading-none">{emoji}</td>
                                  <td className="py-3.5 pr-4 text-[15px] font-semibold" style={{ color: textColor }}>{item.spec || item.name}</td>
                                  <td className="py-3.5 pr-4 text-[15px] text-slate-500">{item.unit}</td>
                                  <td className="py-3.5 pr-4 text-right text-[15px] text-slate-600">{item.qty}</td>
                                  <td className="py-3.5 pr-4 text-right font-mono text-[15px] font-bold text-slate-800">{item.price?.toLocaleString()}</td>
                                  <td className="py-3.5 pr-4 text-right font-mono text-[15px] text-slate-400">{mat?.ref_price?.toLocaleString() ?? '—'}</td>
                                  <td className={`py-3.5 text-right font-mono text-sm font-bold ${pct > 0 ? 'text-red-500' : pct < 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
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
