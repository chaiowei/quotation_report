# Supabase 設定說明

## 1. 執行 Schema（必做）

Supabase Dashboard → SQL Editor → 貼上 `schema.sql` 全部內容 → Run

建立的資源：
- `materials` 表（主檔料料庫）
- `quotations` 表（報價紀錄，含 storage_path 欄位）
- `corrections` 表（AI 學習記錄）
- RLS 政策（全部表）
- `quotations` Storage Bucket（私有，登入才能存取）

## 2. 關閉 Email 確認信（小團隊建議關閉）

Supabase Dashboard → Authentication → Providers → Email → **Confirm email：OFF**

## 3. 設定 Site URL

Supabase Dashboard → Authentication → URL Configuration

- **Site URL**：`https://chaiowei.github.io/quotation_report`
- **Redirect URLs 加入**：`https://chaiowei.github.io/quotation_report/*`

## 4. Storage Bucket 確認

Dashboard → Storage → 確認有 `quotations` bucket（執行 schema.sql 後自動建立）

若 schema.sql 的 Storage 段落執行失敗，可手動建立：
1. Dashboard → Storage → New bucket
2. Name: `quotations`、Public: OFF
