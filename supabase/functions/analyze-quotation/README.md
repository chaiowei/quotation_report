# analyze-quotation Edge Function

Gemini API Proxy — 接收報價單檔案路徑，解析成結構化 JSON 後存入 `quotations` 表。

## 部署步驟（一次性）

### 1. 安裝 Supabase CLI

```powershell
# Windows (Scoop)
scoop install supabase

# 或直接下載 supabase.exe 放入 PATH
# https://github.com/supabase/cli/releases
```

### 2. 登入並連結專案

```powershell
supabase login
supabase link --project-ref fqfbzmjsjjdjontgpokv
```

### 3. 設定 Gemini API Key

在 Supabase Dashboard → Settings → Edge Functions → Secrets 新增：
- `GEMINI_API_KEY` = 你的 Gemini API Key

或用 CLI：
```powershell
supabase secrets set GEMINI_API_KEY=your_key_here
```

### 4. 部署 Function

```powershell
cd C:\AI\projects\quotation_report
supabase functions deploy analyze-quotation
```

## 取得 Gemini API Key

1. 前往 https://aistudio.google.com/app/apikey
2. 建立 API Key（免費，每分鐘有配額）
3. 填入上述步驟 3

## 測試

部署後在 Reports 頁面點擊「AI 解析」按鈕即可觸發。
