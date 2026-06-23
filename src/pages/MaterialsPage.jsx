import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Search, Loader } from 'lucide-react'

const CATEGORIES = ['配管', '儀電', '土木', '鋼構', '共用', '工費']

export default function MaterialsPage() {
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')

  useEffect(() => {
    fetchMaterials()
  }, [])

  async function fetchMaterials() {
    setLoading(true)
    // TODO M6: query supabase materials table
    // const { data } = await supabase.from('materials').select('*').order('category')
    await new Promise(r => setTimeout(r, 500))
    setMaterials([]) // placeholder until Supabase is connected
    setLoading(false)
  }

  const filtered = materials.filter(m =>
    (!category || m.category === category) &&
    (!search || m.name?.includes(search) || m.spec?.includes(search))
  )

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">主檔料料庫</h2>
          <p className="text-slate-500 text-sm mt-1">管理材料基準價格與規格</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> 新增材料
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="搜尋材料名稱或規格..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">所有分類</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {['分類', '材料名稱', '規格', '單位', '基準價', '更新者', '更新日'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={7} className="py-10 text-center text-slate-400">
                <Loader size={20} className="animate-spin mx-auto mb-2" />載入中...
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="py-10 text-center text-slate-400">
                尚無資料，請連接 Supabase 後匯入
              </td></tr>
            ) : filtered.map((m, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="px-4 py-3"><span className="px-2 py-0.5 bg-slate-100 rounded text-xs">{m.category}</span></td>
                <td className="px-4 py-3 font-medium">{m.name}</td>
                <td className="px-4 py-3 text-slate-500">{m.spec}</td>
                <td className="px-4 py-3">{m.unit}</td>
                <td className="px-4 py-3 font-mono">{m.ref_price?.toLocaleString()}</td>
                <td className="px-4 py-3 text-slate-500">{m.updated_by}</td>
                <td className="px-4 py-3 text-slate-500">{m.updated_at?.slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
