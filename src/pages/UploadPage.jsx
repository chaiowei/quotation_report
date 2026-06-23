import { useState, useRef } from 'react'
import { Upload, FileText, X, Loader, CheckCircle, AlertCircle, Lock, CloudUpload } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

const ACCEPTED = '.pdf,.xlsx,.xls,.docx,.doc,.jpg,.jpeg,.png'

const FILE_ICON_COLOR = ext => {
  if (['pdf'].includes(ext)) return 'text-red-500 bg-red-50'
  if (['xlsx', 'xls'].includes(ext)) return 'text-emerald-600 bg-emerald-50'
  if (['docx', 'doc'].includes(ext)) return 'text-blue-600 bg-blue-50'
  return 'text-violet-600 bg-violet-50'
}

export default function UploadPage({ session, guestMode }) {
  const navigate = useNavigate()
  const [files, setFiles] = useState([])
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [vendor, setVendor] = useState('')
  const inputRef = useRef()

  if (guestMode) return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">上傳報價單</h1>
        <p className="text-slate-500 text-sm mt-1">支援 PDF、Excel、Word、JPG/PNG</p>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Lock size={28} className="text-slate-400" />
        </div>
        <p className="font-semibold text-slate-700 mb-1">上傳功能需要登入正式帳號</p>
        <p className="text-sm text-slate-400 mb-6">訪客模式下無法儲存檔案到資料庫</p>
        <button onClick={() => navigate('/login')}
          className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm shadow-blue-500/25">
          前往登入
        </button>
      </div>
    </div>
  )

  function addFiles(newFiles) {
    const arr = Array.from(newFiles).map(f => ({ file: f, status: 'pending', error: null }))
    setFiles(prev => [...prev, ...arr])
  }
  function removeFile(idx) { setFiles(prev => prev.filter((_, i) => i !== idx)) }
  function onDrop(e) { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }
  function updateFileStatus(idx, status, error = null) {
    setFiles(prev => prev.map((f, i) => i === idx ? { ...f, status, error } : f))
  }

  async function handleUpload() {
    if (!files.length || !projectName.trim()) return
    setUploading(true)
    const userId = session?.user?.id
    const now = Date.now()
    for (let i = 0; i < files.length; i++) {
      if (files[i].status === 'done') continue
      updateFileStatus(i, 'uploading')
      const { file } = files[i]
      const storagePath = `${userId}/${now}_${file.name}`
      const { error: storageError } = await supabase.storage.from('quotations').upload(storagePath, file, { cacheControl: '3600', upsert: false })
      if (storageError) { updateFileStatus(i, 'error', storageError.message); continue }
      const { error: dbError } = await supabase.from('quotations').insert({
        project_name: projectName.trim(), vendor: vendor.trim() || null,
        file_name: file.name, storage_path: storagePath, status: 'pending', created_by: userId,
      })
      updateFileStatus(i, dbError ? 'error' : 'done', dbError?.message)
    }
    setUploading(false)
  }

  function statusIcon(status, error) {
    if (status === 'uploading') return <Loader size={15} className="animate-spin text-blue-500" />
    if (status === 'done') return <CheckCircle size={15} className="text-emerald-500" />
    if (status === 'error') return <AlertCircle size={15} className="text-red-500" title={error} />
    return null
  }

  const allDone = files.length > 0 && files.every(f => f.status === 'done')
  const hasPending = files.some(f => f.status === 'pending' || f.status === 'error')

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">上傳報價單</h1>
        <p className="text-slate-500 text-sm mt-1">上傳後存入資料庫，AI 解析將自動比對主檔材料庫</p>
      </div>

      {/* Project info */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-700">報價單資訊</h2>
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
            專案名稱 <span className="text-red-500 normal-case font-normal">（必填）</span>
          </label>
          <input type="text" value={projectName} onChange={e => setProjectName(e.target.value)}
            placeholder="例：春武里廠 N2 管線工程 2026-06"
            className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">廠商名稱</label>
          <input type="text" value={vendor} onChange={e => setVendor(e.target.value)}
            placeholder="例：永豐管業有限公司"
            className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all" />
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current.click()}
        className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
          dragging
            ? 'border-blue-400 bg-blue-50 scale-[1.01]'
            : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
        }`}
      >
        <input ref={inputRef} type="file" multiple accept={ACCEPTED} className="hidden" onChange={e => addFiles(e.target.files)} />
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors ${dragging ? 'bg-blue-100' : 'bg-slate-100'}`}>
          <CloudUpload size={26} className={dragging ? 'text-blue-500' : 'text-slate-400'} />
        </div>
        <p className="font-semibold text-slate-700">拖曳檔案到這裡，或點擊選擇</p>
        <p className="text-slate-400 text-sm mt-1.5">PDF · Excel · Word · JPG / PNG</p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {files.map(({ file, status, error }, idx) => {
            const ext = file.name.split('.').pop()?.toLowerCase() || ''
            const iconCls = FILE_ICON_COLOR(ext)
            return (
              <div key={idx} className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 last:border-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconCls}`}>
                  <FileText size={14} />
                </div>
                <span className="text-sm text-slate-700 flex-1 truncate" title={error || file.name}>{file.name}</span>
                <span className="text-xs text-slate-400 font-mono shrink-0">{(file.size / 1024).toFixed(0)} KB</span>
                {statusIcon(status, error)}
                {status !== 'uploading' && status !== 'done' && (
                  <button onClick={() => removeFile(idx)} className="text-slate-300 hover:text-red-500 transition-colors ml-1">
                    <X size={14} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {allDone && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 text-sm text-emerald-700">
          <CheckCircle size={18} className="text-emerald-500 shrink-0" />
          <span>所有檔案已上傳完成！前往<button onClick={() => navigate('/reports')} className="font-semibold underline ml-1">比對報告</button>頁面點擊「AI 解析」。</span>
        </div>
      )}

      {files.length > 0 && hasPending && (
        <button onClick={handleUpload} disabled={uploading || !projectName.trim()}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-semibold text-sm transition-all shadow-sm shadow-blue-500/25 disabled:opacity-50 flex items-center justify-center gap-2">
          {uploading ? <><Loader size={16} className="animate-spin" /> 上傳中...</> : <><Upload size={16} /> 上傳到資料庫</>}
        </button>
      )}
    </div>
  )
}
