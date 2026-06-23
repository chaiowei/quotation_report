import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { GUEST_MATERIALS } from '../lib/guestData'
import { Plus, Search, Loader, Pencil, Trash2, Download, Upload as UploadIcon, X, Check } from 'lucide-react'

const CATEGORIES = ['配管', '儀電', '土木', '鋼構', '共用', '工費']
const EMPTY_FORM = { category: '配管', name: '', spec: '', unit: 'EA', ref_price: '', supplier: '' }

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
    if (guestMode) {
      setMaterials(GUEST_MATERIALS)
      setLoading(false)
      return
    }
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
    const payload = {
      ...form,
      ref_price: form.ref_price !== '' ? parseFloat(form.ref_price) : null,
      updated_at: new Date().toISOString(),
      updated_by: session?.user?.email || '',
    }
    if (modal === 'add') {
      const { error } = await supabase.from('materials').insert(payload)
      if (!error) await fetchMaterials()
    } else {
      const { error } = await supabase.from('materials').update(payload).eq('id', editId)
      if (!error) await fetchMaterials()
    }
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
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `materials_${new Date().toISOString().slice(0, 10)}.csv` })
    a.click(); URL.revokeObjectURL(a.href)
  }

  function handleImportCSV(e) {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = async ev => {
      const text = ev.target.result.replace(/^﻿/, '')
      const parseLine = line => {
        const r = []; let cur = ''; let inQ = false
        for (const c of line) {
          if (c === '"') { inQ = !inQ; continue }
          if (c === ',' && !inQ) { r.push(cur.trim()); cur = ''; continue }
          cur += c
        }
        r.push(cur.trim()); return r
      }
      const rows = text.split('\n').filter(l => l.trim()).map(parseLine)
      const h = rows[0].map(x => x.toLowerCase().trim())
      // Detect v4 export: first header "material specification"
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

  const FIELDS = [
    ['name', '材料名稱', 'text', '例：碳鋼管'],
    ['spec', '規格', 'text', '例：2" SCH40 ASTM A106 Gr.B'],
    ['unit', '單位', 'text', '例：M'],
    ['ref_price', '基準價 (THB)', 'number', ''],
    ['supplier', '供應商', 'text', ''],
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">主檔料料庫</h2>
          <p className="text-slate-500 text-sm mt-1">管理材料基準價格與規格（{materials.length} 筆）</p>
        </div>
        <div className="flex gap-2">
          {!guestMode && (
            <button onClick={() => fileRef.current.click()} className="flex items-center gap-2 px-3 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-sm transition-colors">
              <UploadIcon size={14} /> 匯入 CSV
            </button>
          )}
          <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-sm transition-colors">
            <Download size={14} /> 匯出 CSV
          </button>
          {!guestMode && (
            <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
              <Plus size={16} /> 新增材料
            </button>
          )}
        </div>
      </div>

      <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="搜尋材料名稱或規格..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300" />
        </div>
        <select value={category} onChange={e => setCategory(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300">
          <option value="">所有分類</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {['分類', '材料名稱 / 規格', '單位', '基準價 (THB)', '供應商', '更新日', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={7} className="py-10 text-center text-slate-400"><Loader size={20} className="animate-spin mx-auto mb-2" />載入中...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="py-10 text-center text-slate-400">{materials.length === 0 ? '尚無資料，請按「新增材料」或「匯入 CSV」' : '無符合條件的資料'}</td></tr>
            ) : filtered.map(m => (
              <tr key={m.id} className="hover:bg-slate-50">
                <td className="px-4 py-3"><span className="px-2 py-0.5 bg-slate-100 rounded text-xs">{m.category}</span></td>
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-800">{m.name || m.spec}</div>
                  {m.name && m.spec && <div className="text-xs text-slate-400 mt-0.5">{m.spec}</div>}
                </td>
                <td className="px-4 py-3">{m.unit}</td>
                <td className="px-4 py-3 font-mono">{m.ref_price?.toLocaleString()}</td>
                <td className="px-4 py-3 text-slate-500">{m.supplier}</td>
                <td className="px-4 py-3 text-slate-500">{m.updated_at?.slice(0, 10)}</td>
                <td className="px-4 py-3">
                  {!guestMode && (
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(m)} className="text-slate-400 hover:text-blue-500 transition-colors"><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(m.id)} className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800">{modal === 'add' ? '新增材料' : '編輯材料'}</h3>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">分類</label>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {FIELDS.map(([key, label, type, ph]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                  <input type={type} value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} placeholder={ph}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setModal(null)} className="flex-1 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50 transition-colors">取消</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                {saving ? <Loader size={14} className="animate-spin" /> : <Check size={14} />}
                {saving ? '儲存中...' : '儲存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
