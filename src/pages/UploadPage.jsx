import { useState, useRef } from 'react'
import { Upload, FileText, X, Loader, CheckCircle, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

const ACCEPTED = '.pdf,.xlsx,.xls,.docx,.doc,.jpg,.jpeg,.png'

export default function UploadPage({ session }) {
  const [files, setFiles] = useState([])
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [vendor, setVendor] = useState('')
  const inputRef = useRef()

  function addFiles(newFiles) {
    const arr = Array.from(newFiles).map(f => ({ file: f, status: 'pending', error: null }))
    setFiles(prev => [...prev, ...arr])
  }

  function removeFile(idx) {
    setFiles(prev => prev.filter((_, i) => i !== idx))
  }

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }

  function updateFileStatus(idx, status, error = null) {
    setFiles(prev => prev.map((f, i) => i === idx ? { ...f, status, error } : f))
  }

  async function handleUpload() {
    if (files.length === 0 || !projectName.trim()) return
    setUploading(true)

    const userId = session?.user?.id
    const now = Date.now()

    for (let i = 0; i < files.length; i++) {
      if (files[i].status === 'done') continue
      updateFileStatus(i, 'uploading')
      const { file } = files[i]
      const storagePath = `${userId}/${now}_${file.name}`

      const { error: storageError } = await supabase.storage
        .from('quotations')
        .upload(storagePath, file, { cacheControl: '3600', upsert: false })

      if (storageError) {
        updateFileStatus(i, 'error', storageError.message)
        continue
      }

      const { error: dbError } = await supabase.from('quotations').insert({
        project_name: projectName.trim(),
        vendor: vendor.trim() || null,
        file_name: file.name,
        storage_path: storagePath,
        status: 'pending',
        created_by: userId,
      })

      if (dbError) {
        updateFileStatus(i, 'error', dbError.message)
      } else {
        updateFileStatus(i, 'done')
      }
    }

    setUploading(false)
  }

  function statusIcon(status, error) {
    if (status === 'uploading') return <Loader size={14} className="animate-spin text-blue-500" />
    if (status === 'done') return <CheckCircle size={14} className="text-green-500" />
    if (status === 'error') return <AlertCircle size={14} className="text-red-500" title={error} />
    return null
  }

  const allDone = files.length > 0 && files.every(f => f.status === 'done')
  const hasPending = files.some(f => f.status === 'pending' || f.status === 'error')

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">上傳報價單</h2>
        <p className="text-slate-500 text-sm mt-1">支援 PDF、Excel、Word、JPG/PNG，上傳後存入資料庫</p>
      </div>

      {/* 專案 / 廠商資訊 */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            專案名稱 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={projectName}
            onChange={e => setProjectName(e.target.value)}
            placeholder="例：台積電 N2 管線報價 2026-06"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">廠商名稱</label>
          <input
            type="text"
            value={vendor}
            onChange={e => setVendor(e.target.value)}
            placeholder="例：永豐管業"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
      </div>

      {/* 拖曳上傳區 */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current.click()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
          dragging ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED}
          className="hidden"
          onChange={e => addFiles(e.target.files)}
        />
        <Upload className="mx-auto mb-3 text-slate-400" size={32} />
        <p className="text-slate-600 font-medium">拖曳檔案到這裡，或點擊選擇</p>
        <p className="text-slate-400 text-sm mt-1">PDF · Excel · Word · JPG/PNG</p>
      </div>

      {/* 檔案清單 */}
      {files.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {files.map(({ file, status, error }, idx) => (
            <div key={idx} className="flex items-center gap-3 px-4 py-3">
              <FileText size={16} className="text-slate-400 shrink-0" />
              <span className="text-sm text-slate-700 flex-1 truncate" title={error || file.name}>{file.name}</span>
              <span className="text-xs text-slate-400">{(file.size / 1024).toFixed(0)} KB</span>
              {statusIcon(status, error)}
              {status !== 'uploading' && status !== 'done' && (
                <button onClick={() => removeFile(idx)} className="text-slate-300 hover:text-red-500 transition-colors">
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {allDone && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700">
          ✅ 所有檔案已上傳完成，AI 解析將在 M5 階段啟用。
        </div>
      )}

      {files.length > 0 && hasPending && (
        <button
          onClick={handleUpload}
          disabled={uploading || !projectName.trim()}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {uploading
            ? <><Loader size={16} className="animate-spin" /> 上傳中...</>
            : '上傳到資料庫'}
        </button>
      )}
    </div>
  )
}
