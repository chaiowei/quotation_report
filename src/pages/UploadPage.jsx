import { useState, useRef } from 'react'
import { Upload, FileText, X, Loader } from 'lucide-react'

const ACCEPTED = '.pdf,.xlsx,.xls,.docx,.doc,.jpg,.jpeg,.png'

export default function UploadPage() {
  const [files, setFiles] = useState([])
  const [dragging, setDragging] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const inputRef = useRef()

  function addFiles(newFiles) {
    const arr = Array.from(newFiles).map(f => ({ file: f, status: 'pending' }))
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

  async function handleAnalyze() {
    if (files.length === 0) return
    setAnalyzing(true)
    // TODO M5: call Supabase Edge Function → Gemini API
    await new Promise(r => setTimeout(r, 1500))
    setAnalyzing(false)
    alert('AI 解析功能建置中（M5 階段）')
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">上傳報價單</h2>
        <p className="text-slate-500 text-sm mt-1">支援 PDF、Excel、Word、JPG/PNG</p>
      </div>

      {/* Drop zone */}
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

      {/* File list */}
      {files.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {files.map(({ file, status }, idx) => (
            <div key={idx} className="flex items-center gap-3 px-4 py-3">
              <FileText size={16} className="text-slate-400 shrink-0" />
              <span className="text-sm text-slate-700 flex-1 truncate">{file.name}</span>
              <span className="text-xs text-slate-400">{(file.size / 1024).toFixed(0)} KB</span>
              <button onClick={() => removeFile(idx)} className="text-slate-300 hover:text-red-500 transition-colors">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {analyzing ? <><Loader size={16} className="animate-spin" /> 分析中...</> : '開始 AI 解析比對'}
        </button>
      )}
    </div>
  )
}
