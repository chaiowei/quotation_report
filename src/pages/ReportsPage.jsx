import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { FileText, Loader, ChevronDown, ChevronUp, Zap } from 'lucide-react'

const INDICATOR = {
  green:  { emoji: '🟢', label: '優秀（≤90%）',  textClass: 'text-green-700',  bgClass: 'bg-green-50' },
  yellow: { emoji: '🟡', label: '合理（90-100%）', textClass: 'text-yellow-700', bgClass: 'bg-yellow-50' },
  orange: { emoji: '🟠', label: '略高（100-110%）',textClass: 'text-orange-700', bgClass: 'bg-orange-50' },
  red:    { emoji: '🔴', label: '偏貴（>110%）',  textClass: 'text-red-700',    bgClass: 'bg-red-50' },
  purple: { emoji: '🟣', label: '無基準價',        textClass: 'text-purple-700', bgClass: 'bg-purple-50' },
  white:  { emoji: '⚪', label: '未比對到',        textClass: 'text-slate-600',  bgClass: 'bg-slate-50' },
}

const STATUS_BADGE = {
  pending:  { label: '待解析', cls: 'bg-yellow-100 text-yellow-700' },
  analyzed: { label: '已解析', cls: 'bg-green-100 text-green-700' },
  error:    { label: '解析失敗', cls: 'bg-red-100 text-red-700' },
}

function getIndicator(quotedPrice, refPrice) {
  if (refPrice === null || refPrice === undefined) return 'purple'
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
  parsedItems.forEach(item => {
    const mat = matchMaterial(item, materials)
    counts[getIndicator(item.price, mat?.ref_price)]++
  })
  return counts
}

export default function ReportsPage() {
  const [quotations, setQuotations] = useState([])
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [analyzing, setAnalyzing] = useState(null)

  useEffect(() => {
    Promise.all([
      supabase.from('quotations').select('*').order('upload_date', { ascending: false }),
      supabase.from('materials').select('id,name,spec,ref_price,category'),
    ]).then(([qRes, mRes]) => {
      if (!qRes.error) setQuotations(qRes.data || [])
      if (!mRes.error) setMaterials(mRes.data || [])
      setLoading(false)
    })
  }, [])

  async function handleAnalyze(q) {
    setAnalyzing(q.id)
    try {
      const { data, error } = await supabase.functions.invoke('analyze-quotation', {
        body: { quotation_id: q.id, storage_path: q.storage_path, file_name: q.file_name },
      })
      if (error) throw error
      setQuotations(prev => prev.map(item => item.id === q.id
        ? { ...item, status: 'analyzed', parsed_items: data.parsed_items }
        : item
      ))
    } catch (err) {
      alert('解析失敗：' + (err.message || '請確認 Edge Function 已部署'))
      setQuotations(prev => prev.map(item => item.id === q.id ? { ...item, status: 'error' } : item))
    }
    setAnalyzing(null)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800">比對報告</h2>
        <p className="text-slate-500 text-sm mt-1">AI 解析後的燈號比對結果</p>
      </div>

      <div className="flex gap-4 flex-wrap text-xs text-slate-600">
        {Object.entries(INDICATOR).map(([k, { emoji, label }]) => (
          <span key={k} className="flex items-center gap-1">{emoji} {label}</span>
        ))}
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400">
          <Loader size={24} className="animate-spin mx-auto mb-3" />載入中...
        </div>
      ) : quotations.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 py-20 text-center">
          <FileText size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">尚無報告</p>
          <p className="text-slate-400 text-sm mt-1">先到「上傳報價單」頁面上傳檔案</p>
        </div>
      ) : (
        <div className="space-y-3">
          {quotations.map(q => {
            const badge = STATUS_BADGE[q.status] || STATUS_BADGE.pending
            const counts = summarizeCounts(q.parsed_items, materials)
            const isOpen = expanded === q.id
            const isAnalyzing = analyzing === q.id

            return (
              <div key={q.id} className="bg-white rounded-xl border border-slate-200">
                <div className="flex items-center gap-3 p-4">
                  <FileText size={20} className="text-slate-400 shrink-0" />
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => setExpanded(isOpen ? null : q.id)}
                  >
                    <div className="font-medium text-slate-800">{q.project_name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{q.vendor || '未填廠商'} · {q.file_name} · {q.upload_date?.slice(0, 10)}</div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${badge.cls}`}>{badge.label}</span>
                  {counts && (
                    <div className="flex gap-1 text-sm shrink-0">
                      {Object.entries(counts).filter(([, v]) => v > 0).map(([k, v]) => (
                        <span key={k}>{INDICATOR[k].emoji}{v}</span>
                      ))}
                    </div>
                  )}
                  {q.status === 'pending' && (
                    <button
                      onClick={() => handleAnalyze(q)}
                      disabled={!!analyzing}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-60 shrink-0"
                    >
                      {isAnalyzing ? <Loader size={12} className="animate-spin" /> : <Zap size={12} />}
                      AI 解析
                    </button>
                  )}
                  <button onClick={() => setExpanded(isOpen ? null : q.id)} className="text-slate-400 shrink-0">
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>

                {isOpen && (
                  <div className="border-t border-slate-100 p-4">
                    {!q.parsed_items?.length ? (
                      <p className="text-slate-400 text-sm text-center py-6">
                        {q.status === 'analyzed' ? '無解析項目' : '點擊「AI 解析」按鈕後，燈號比對結果將顯示在這裡'}
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-xs text-slate-500 border-b border-slate-100">
                              <th className="text-left pb-2 pr-3 w-8"></th>
                              <th className="text-left pb-2 pr-4">規格</th>
                              <th className="text-left pb-2 pr-4">單位</th>
                              <th className="text-right pb-2 pr-4">數量</th>
                              <th className="text-right pb-2 pr-4">報價單價</th>
                              <th className="text-right pb-2 pr-4">基準價</th>
                              <th className="text-right pb-2">差異%</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {q.parsed_items.map((item, i) => {
                              const mat = matchMaterial(item, materials)
                              const ind = getIndicator(item.price, mat?.ref_price)
                              const { emoji, bgClass, textClass } = INDICATOR[ind]
                              const pct = mat?.ref_price && item.price
                                ? (((item.price - mat.ref_price) / mat.ref_price) * 100).toFixed(1)
                                : null
                              return (
                                <tr key={i} className={bgClass}>
                                  <td className="py-2 pr-3 text-base">{emoji}</td>
                                  <td className={`py-2 pr-4 ${textClass}`}>{item.spec || item.name}</td>
                                  <td className="py-2 pr-4 text-slate-500">{item.unit}</td>
                                  <td className="py-2 pr-4 text-right">{item.qty}</td>
                                  <td className="py-2 pr-4 text-right font-mono">{item.price?.toLocaleString()}</td>
                                  <td className="py-2 pr-4 text-right font-mono text-slate-500">{mat?.ref_price?.toLocaleString() ?? '—'}</td>
                                  <td className={`py-2 text-right font-mono text-xs ${pct > 0 ? 'text-red-600' : 'text-green-600'}`}>
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
