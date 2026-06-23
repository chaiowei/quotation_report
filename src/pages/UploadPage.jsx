import { useState, useRef } from 'react'
import { Upload, FileText, X, Loader, CheckCircle, AlertCircle, Lock, CloudUpload, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

const ACCEPTED_EXT = ['pdf', 'xlsx', 'xls', 'docx', 'doc', 'jpg', 'jpeg', 'png']
const ACCEPTED = '.' + ACCEPTED_EXT.join(',.')
const MAX_SIZE_MB = 50

const FILE_ICON = ext => {
  if (ext === 'pdf') return { bg: '#fff1f2', color: '#ef4444' }
  if (['xlsx', 'xls'].includes(ext)) return { bg: '#f0fdf4', color: '#16a34a' }
  if (['docx', 'doc'].includes(ext)) return { bg: '#eff6ff', color: '#2563eb' }
  return { bg: '#faf5ff', color: '#7c3aed' }
}

const inputStyle = (err = false) => ({
  onFocus: e => { e.target.style.borderColor = err ? '#ef4444' : '#0ABAB5'; e.target.style.boxShadow = `0 0 0 3px ${err ? 'rgba(239,68,68,0.12)' : 'rgba(10,186,181,0.15)'}` },
  onBlur: e => { e.target.style.borderColor = err ? '#fca5a5' : '#e2e8f0'; e.target.style.boxShadow = 'none' },
})

export default function UploadPage({ session, guestMode }) {
  const navigate = useNavigate()
  const [files, setFiles] = useState([])
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [vendor, setVendor] = useState('')
  const [showNameError, setShowNameError] = useState(false)
  const inputRef = useRef()

  if (guestMode) return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold" style={{ color: '#082a28' }}>上傳報價單</h1>
        <p className="text-base text-slate-500 mt-1.5">支援 PDF、Excel、Word、JPG/PNG</p>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: '#f0fdfa' }}>
          <Lock size={32} style={{ color: '#0ABAB5' }} />
        </div>
        <p className="text-lg font-semibold text-slate-700 mb-2">上傳功能需要登入正式帳號</p>
        <p className="text-[15px] text-slate-400 mb-8">訪客模式下無法儲存檔案到資料庫</p>
        <button onClick={() => navigate('/login')}
          className="px-8 py-3.5 rounded-xl text-[15px] font-semibold text-white shadow-lg transition-all"
          style={{ background: 'linear-gradient(135deg, #0ABAB5 0%, #068884 100%)', boxShadow: '0 4px 15px rgba(10,186,181,0.35)' }}>
          前往登入
        </button>
      </div>
    </div>
  )

  function validateAndAddFiles(rawFiles) {
    const valid = []
    const rejected = []
    Array.from(rawFiles).forEach(f => {
      const ext = f.name.split('.').pop()?.toLowerCase() || ''
      if (!ACCEPTED_EXT.includes(ext)) {
        rejected.push(`${f.name}（不支援的格式）`)
      } else if (f.size > MAX_SIZE_MB * 1024 * 1024) {
        rejected.push(`${f.name}（超過 ${MAX_SIZE_MB}MB 限制）`)
      } else if (files.some(x => x.file.name === f.name && x.file.size === f.size)) {
        rejected.push(`${f.name}（已在列表中）`)
      } else {
        valid.push({ file: f, status: 'pending', error: null })
      }
    })
    if (rejected.length) alert('以下檔案已略過：\n' + rejected.join('\n'))
    if (valid.length) setFiles(prev => [...prev, ...valid])
  }

  function removeFile(idx) { setFiles(prev => prev.filter((_, i) => i !== idx)) }

  function onDrop(e) {
    e.preventDefault(); setDragging(false)
    validateAndAddFiles(e.dataTransfer.files)
  }

  function updateFileStatus(idx, status, error = null) {
    setFiles(prev => prev.map((f, i) => i === idx ? { ...f, status, error } : f))
  }

  function resetAll() {
    setFiles([]); setProjectName(''); setVendor(''); setShowNameError(false)
  }

  async function handleUpload() {
    if (!projectName.trim()) { setShowNameError(true); return }
    if (!files.length) return
    setShowNameError(false)
    setUploading(true)
    const userId = session?.user?.id
    const now = Date.now()
    for (let i = 0; i < files.length; i++) {
      if (files[i].status === 'done') continue
      updateFileStatus(i, 'uploading')
      const { file } = files[i]
      const storagePath = `${userId}/${now}_${file.name}`
      const { error: storageError } = await supabase.storage
        .from('quotations').upload(storagePath, file, { cacheControl: '3600', upsert: false })
      if (storageError) { updateFileStatus(i, 'error', storageError.message); continue }
      const { error: dbError } = await supabase.from('quotations').insert({
        project_name: projectName.trim(), vendor: vendor.trim() || null,
        file_name: file.name, storage_path: storagePath, status: 'pending', created_by: userId,
      })
      updateFileStatus(i, dbError ? 'error' : 'done', dbError?.message)
    }
    setUploading(false)
  }

  function StatusIcon({ status, error }) {
    if (status === 'uploading') return <Loader size={17} className="animate-spin" style={{ color: '#0ABAB5' }} />
    if (status === 'done') return <CheckCircle size={17} style={{ color: '#10b981' }} />
    if (status === 'error') return <AlertCircle size={17} className="text-red-500" title={error} />
    return null
  }

  const allDone = files.length > 0 && files.every(f => f.status === 'done')
  const hasPending = files.some(f => f.status === 'pending' || f.status === 'error')

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#082a28' }}>上傳報價單</h1>
          <p className="text-base text-slate-500 mt-1.5">上傳後存入資料庫，可在報告頁觸發 AI 解析</p>
        </div>
        {files.length > 0 && (
          <button onClick={resetAll}
            className="flex items-center gap-2 text-[15px] text-slate-500 hover:text-slate-700 border border-slate-200 bg-white px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-all shrink-0 whitespace-nowrap">
            <RefreshCw size={14} /> 重設
          </button>
        )}
      </div>

      {/* Project info */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        <h2 className="text-base font-semibold text-slate-700">報價單資訊</h2>
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-2">
            專案名稱 <span className="text-red-400 font-normal">（必填）</span>
          </label>
          <input type="text" value={projectName}
            onChange={e => { setProjectName(e.target.value); if (e.target.value.trim()) setShowNameError(false) }}
            placeholder="例：春武里廠 N2 管線工程 2026-06"
            className="w-full px-4 py-3.5 text-[15px] border rounded-xl bg-slate-50 focus:bg-white focus:outline-none transition-all"
            style={{ borderColor: showNameError ? '#fca5a5' : '#e2e8f0' }}
            onFocus={e => { e.target.style.borderColor = showNameError ? '#ef4444' : '#0ABAB5'; e.target.style.boxShadow = `0 0 0 3px ${showNameError ? 'rgba(239,68,68,0.12)' : 'rgba(10,186,181,0.15)'}` }}
            onBlur={e => { e.target.style.borderColor = showNameError ? '#fca5a5' : '#e2e8f0'; e.target.style.boxShadow = 'none' }} />
          {showNameError && <p className="text-red-500 text-sm mt-2">請輸入專案名稱後再上傳</p>}
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-2">廠商名稱</label>
          <input type="text" value={vendor} onChange={e => setVendor(e.target.value)}
            placeholder="例：永豐管業有限公司"
            className="w-full px-4 py-3.5 text-[15px] border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none transition-all"
            {...inputStyle()} />
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current.click()}
        className="border-2 border-dashed rounded-2xl p-14 text-center cursor-pointer transition-all"
        style={{
          borderColor: dragging ? '#0ABAB5' : '#99e7e5',
          background: dragging ? '#e0f7f6' : '#f8fffe',
          transform: dragging ? 'scale(1.01)' : 'none',
        }}>
        <input ref={inputRef} type="file" multiple accept={ACCEPTED} className="hidden"
          onChange={e => validateAndAddFiles(e.target.files)} />
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 transition-all"
          style={{ background: dragging ? '#ccf3f2' : '#e0f7f6' }}>
          <CloudUpload size={30} style={{ color: dragging ? '#068884' : '#0ABAB5' }} />
        </div>
        <p className="text-lg font-semibold text-slate-700">拖曳檔案到這裡，或點擊選擇</p>
        <p className="text-[15px] text-slate-400 mt-2">PDF · Excel · Word · JPG / PNG（最大 {MAX_SIZE_MB}MB）</p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {files.map(({ file, status, error }, idx) => {
            const ext = file.name.split('.').pop()?.toLowerCase() || ''
            const ico = FILE_ICON(ext)
            return (
              <div key={idx} className="flex items-center gap-4 px-5 py-4 border-b border-slate-100 last:border-0">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: ico.bg }}>
                  <FileText size={16} style={{ color: ico.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] text-slate-700 truncate font-medium" title={file.name}>{file.name}</p>
                  {error && <p className="text-sm text-red-500 mt-0.5 truncate">{error}</p>}
                </div>
                <span className="text-sm text-slate-400 font-mono shrink-0">{(file.size / 1024).toFixed(0)} KB</span>
                <StatusIcon status={status} error={error} />
                {status !== 'uploading' && status !== 'done' && (
                  <button onClick={() => removeFile(idx)} className="text-slate-300 hover:text-red-400 transition-colors ml-1 shrink-0 p-1">
                    <X size={16} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {allDone && (
        <div className="flex items-center gap-4 rounded-2xl px-6 py-5 border border-emerald-200"
          style={{ background: '#f0fdf4' }}>
          <CheckCircle size={22} className="text-emerald-500 shrink-0" />
          <div className="text-[15px] text-emerald-700 flex-1">
            所有檔案已上傳完成！
            <button onClick={() => navigate('/reports')}
              className="font-semibold underline ml-1 text-emerald-700">
              前往比對報告 →
            </button>
          </div>
          <button onClick={resetAll}
            className="text-sm text-emerald-700 border border-emerald-300 px-3 py-2 rounded-xl hover:bg-emerald-100 transition-all shrink-0 whitespace-nowrap">
            繼續上傳
          </button>
        </div>
      )}

      {files.length > 0 && hasPending && (
        <button onClick={handleUpload} disabled={uploading}
          className="w-full py-4 rounded-xl text-[15px] font-semibold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
          style={{ background: 'linear-gradient(135deg, #0ABAB5 0%, #068884 100%)', boxShadow: '0 4px 15px rgba(10,186,181,0.35)' }}>
          {uploading ? <><Loader size={17} className="animate-spin" /> 上傳中...</> : <><Upload size={17} /> 上傳到資料庫</>}
        </button>
      )}
    </div>
  )
}
