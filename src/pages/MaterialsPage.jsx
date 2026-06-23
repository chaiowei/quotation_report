import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { GUEST_MATERIALS } from '../lib/guestData'
import { Plus, Search, Loader, Pencil, Trash2, Download, Upload as UploadIcon, X, Check, Database } from 'lucide-react'

const CATEGORIES = ['配管', '儀電', '土木', '鋼構', '共用', '工費']
const EMPTY_FORM = { category: '配管', name: '', spec: '', unit: 'EA', ref_price: '', supplier: '' }
const CAT_COLOR = {
  '配管': { bg: '#e0f7f6', text: '#0ABAB5', border: '#99e7e5' },
  '儀電': { bg: '#f0f0ff', text: '#6c63ff', border: '#c4b5fd' },
  '土木': { bg: '#fef9c3', text: '#a16207', border: '#fde047' },
  '鋼構': { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
  '共用': { bg: '#f0fdf4', text: '#059669', border: '#a7f3d0' },
  '工費': { bg: '#fff1f2', text: '#e11d48', border: '#fecdd3' },
}

const FIELDS = [
  ['name', '材料名稱', 'text', '例：碳鋼管'],
  ['spec', '規格', 'text', '例：2" SCH40 ASTM A106 Gr.B'],
  ['unit', '單位', 'text', '例：M'],
  ['ref_price', '基準價 (THB)', 'number', ''],
  ['supplier', '供應商', 'text', ''],
]

function CategoryBadge({ cat }) {
  const c = CAT_COLOR[cat] || { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' }
  return (
    <span className="text-sm font-semibold px-2.5 py-1 rounded-lg whitespace-nowrap"
      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
      {cat}
    </span>
  )
}

export default function MaterialsPage({ session, guestMode }) {
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState(null)
  const fileRef = useRef()

  useEffect(() => { fetchMaterials() }, [guestMode])

  async function fetchMaterials() {
    setLoading(true)
    if (guestMode) { setMaterials(GUEST_MATERIALS); setLoading(false); return }
    const { data, error } = await supabase.from('materials').select('*').order('category').order('name')
    if (!error) setMaterials(data || [])
    setLoading(false)
  }

  const filtered = materials.filter(m =>
    (!category || m.category === category) &&
    (!search || (m.name || '').toLowerCase().includes(search.toLowerCase()) || (m.spec || '').toLowerCase().includes(search.toLowerCase()))
  )

  function openAdd() { setForm(EMPTY_FORM); setEditId(null); setModal('add') }
  function openEdit(m) {
    setForm({ category: m.category, name: m.name || '', spec: m.spec || '', unit: m.unit || 'EA', ref_price: m.ref_price ?? '', supplier: m.supplier || '' })
    setEditId(m.id); setModal('edit')
  }

  async function handleSave() {
    if (!form.name.trim() && !form.spec.trim()) return
    setSaving(true)
    const payload = { ...form, ref_price: form.ref_price !== '' ? parseFloat(form.ref_price) : null, updated_at: new Date().toISOString(), updated_by: session?.user?.email || '' }
    if (modal === 'add') { await supabase.from('materials').insert(payload) }
    else { await supabase.from('materials').update(payload).eq('id', editId) }
    await fetchMaterials()
    setSaving(false); setModal(null)
  }

  async function handleDelete(id) {
    if (!window.confirm('確定刪除此材料？')) return
    await supabase.from('materials').delete().eq('id', id)
    setMaterials(prev => prev.filter(m => m.id !== id))
  }

  function exportCSV() {
    const headers = ['分類', '材料名稱', '規格', '單位', '基準價', '供應商', '更新者', '更新日']
    const rows = materials.map(m => [m.category, m.name || '', m.spec || '', m.unit || '', m.ref_price ?? '', m.supplier || '', m.updated_by || '', (m.updated_at || '').slice(0, 10)])
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })), download: `materials_${new Date().toISOString().slice(0, 10)}.csv` })
    a.click(); URL.revokeObjectURL(a.href)
  }

  function handleImportCSV(e) {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = async ev => {
      const parseLine = line => {
        const r = []; let cur = ''; let inQ = false
        for (const c of line) { if (c === '"') { inQ = !inQ; continue } if (c === ',' && !inQ) { r.push(cur.trim()); cur = ''; continue } cur += c }
        r.push(cur.trim()); return r
      }
      const rows = ev.target.result.replace(/^﻿/, '').split('\n').filter(l => l.trim()).map(parseLine)
      const h = rows[0].map(x => x.toLowerCase().trim())
      const isV4 = h[0].includes('spec') || h[2].includes('price')
      const catMap = { piping: '配管', electrical: '儀電', civil: '土木', structural: '鋼構', common: '共用', labor: '工費' }
      const now = new Date().toISOString()
      const records = rows.slice(1).filter(r => r.length > 1 && r[0]).map(r => isV4
        ? { spec: r[0], name: r[0], unit: r[1] || 'EA', ref_price: parseFloat(r[2]) || null, category: catMap[(r[3] || 'common').toLowerCase()] || '共用', updated_at: now, updated_by: session?.user?.email || 'import' }
        : { category: r[0] || '共用', name: r[1] || '', spec: r[2] || '', unit: r[3] || 'EA', ref_price: parseFloat(r[4]) || null, supplier: r[5] || '', updated_at: now, updated_by: session?.user?.email || 'import' }
      )
      if (!records.length) return alert('CSV 無有效資料')
      const { error } = await supabase.from('materials').insert(records)
      if (error) alert('匯入失敗：' + error.message)
      else { await fetchMaterials(); alert(`已匯入 ${records.length} 筆材料`) }
    }
    reader.readAsText(file, 'utf-8'); e.target.value = ''
  }

  const inputStyle = {
    onFocus: e => { e.target.style.borderColor = '#0ABAB5'; e.target.style.boxShadow = '0 0 0 3px rgba(10,186,181,0.15)' },
    onBlur: e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' },
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#082a28' }}>主檔料料庫</h1>
          <p className="text-base text-slate-500 mt-1.5">
            管理材料基準價格與規格
            <span className="ml-2 px-2.5 py-0.5 rounded-full text-sm font-semibold"
              style={{ background: '#e0f7f6', color: '#0ABAB5' }}>
              {materials.length} 筆
            </span>
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {!guestMode && (
            <button onClick={() => fileRef.current.click()}
              className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-[15px] text-slate-600 transition-colors shadow-sm whitespace-nowrap">
              <UploadIcon size={15} /> 匯入 CSV
            </button>
          )}
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-[15px] text-slate-600 transition-colors shadow-sm whitespace-nowrap">
            <Download size={15} /> 匯出 CSV
          </button>
          {!guestMode && (
            <button onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[15px] font-semibold text-white transition-all shadow-md whitespace-nowrap"
              style={{ background: 'linear-gradient(135deg, #0ABAB5 0%, #068884 100%)', boxShadow: '0 4px 12px rgba(10,186,181,0.3)' }}>
              <Plus size={16} /> 新增材料
            </button>
          )}
        </div>
      </div>

      <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="搜尋材料名稱或規格..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 text-[15px] border border-slate-200 bg-white rounded-xl focus:outline-none shadow-sm transition-all"
            {...inputStyle} />
        </div>
        <select value={category} onChange={e => setCategory(e.target.value)}
          className="px-4 py-3 text-[15px] border border-slate-200 bg-white rounded-xl focus:outline-none shadow-sm"
          onFocus={e => { e.target.style.borderColor = '#0ABAB5'; e.target.style.boxShadow = '0 0 0 3px rgba(10,186,181,0.15)' }}
          onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' }}>
          <option value="">所有分類</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100" style={{ background: '#f8fffe' }}>
              {['分類', '材料名稱 / 規格', '單位', '基準價 (THB)', '供應商', '更新日', ''].map(h => (
                <th key={h} className="px-5 py-4 text-left text-sm font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan={7} className="py-20 text-center text-slate-400">
                <Loader size={26} className="animate-spin mx-auto mb-3" style={{ color: '#0ABAB5' }} />
                <span className="text-[15px]">載入中...</span>
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="py-20 text-center">
                <Database size={36} className="mx-auto mb-4" style={{ color: '#99e7e5' }} />
                <p className="text-[15px] font-semibold text-slate-600">{materials.length === 0 ? '尚無資料' : '無符合條件的資料'}</p>
                {materials.length === 0 && <p className="text-sm text-slate-400 mt-1">請按「新增材料」或「匯入 CSV」</p>}
              </td></tr>
            ) : filtered.map(m => (
              <tr key={m.id} className="group transition-colors"
                onMouseEnter={e => e.currentTarget.style.background = '#f8fffe'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td className="px-5 py-4">
                  <CategoryBadge cat={m.category} />
                </td>
                <td className="px-5 py-4 max-w-xs">
                  <div className="text-[15px] font-semibold text-slate-800 truncate">{m.name || m.spec}</div>
                  {m.name && m.spec && <div className="text-sm text-slate-400 mt-0.5 truncate">{m.spec}</div>}
                </td>
                <td className="px-5 py-4 text-[15px] text-slate-600">{m.unit}</td>
                <td className="px-5 py-4 font-mono text-[15px] font-semibold" style={{ color: '#0ABAB5' }}>
                  {m.ref_price?.toLocaleString() || '—'}
                </td>
                <td className="px-5 py-4 text-sm text-slate-500">{m.supplier}</td>
                <td className="px-5 py-4 text-sm font-mono text-slate-400">{m.updated_at?.slice(0, 10)}</td>
                <td className="px-5 py-4">
                  {!guestMode && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(m)} className="p-2 rounded-lg transition-all"
                        style={{ color: '#94a3b8' }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#0ABAB5'; e.currentTarget.style.background = '#e0f7f6' }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'transparent' }}>
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(m.id)} className="p-2 rounded-lg transition-all"
                        style={{ color: '#94a3b8' }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = '#fff1f2' }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'transparent' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(8,42,40,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
            <div className="flex items-center justify-between mb-7">
              <h3 className="text-xl font-bold" style={{ color: '#082a28' }}>{modal === 'add' ? '新增材料' : '編輯材料'}</h3>
              <button onClick={() => setModal(null)} className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2">分類</label>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                  className="w-full px-4 py-3 text-[15px] border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none transition-all"
                  {...inputStyle}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {FIELDS.map(([key, label, type, ph]) => (
                <div key={key}>
                  <label className="block text-sm font-semibold text-slate-600 mb-2">{label}</label>
                  <input type={type} value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} placeholder={ph}
                    className="w-full px-4 py-3 text-[15px] border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none transition-all"
                    {...inputStyle} />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-7">
              <button onClick={() => setModal(null)} className="flex-1 py-3 border-2 border-slate-200 rounded-xl text-[15px] text-slate-600 hover:bg-slate-50 transition-colors font-medium">
                取消
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-3 rounded-xl text-[15px] font-semibold text-white transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #0ABAB5 0%, #068884 100%)' }}>
                {saving ? <Loader size={15} className="animate-spin" /> : <Check size={15} />}
                {saving ? '儲存中...' : '儲存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
