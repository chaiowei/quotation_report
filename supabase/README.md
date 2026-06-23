# Supabase 設定說明

## 1. 執行 Schema

Supabase Dashboard → SQL Editor → 貼上 `schema.sql` 全部內容 → Run

## 2. 開啟 Google OAuth

Supabase Dashboard → Authentication → Providers → Google → Enable

需填入：
- **Client ID** 和 **Client Secret**（從 Google Cloud Console 取得）
- **Redirect URL**：填入 Supabase 提供的 callback URL

### 取得 Google OAuth 憑證步驟
1. 前往 Google Cloud Console → APIs & Services → Credentials
2. Create Credentials → OAuth 2.0 Client IDs → Web application
3. Authorized redirect URIs 加入：
   `https://fqfbzmjsjjdjontgpokv.supabase.co/auth/v1/callback`
4. 複製 Client ID 和 Client Secret 填入 Supabase

## 3. 設定 Site URL

Supabase Dashboard → Authentication → URL Configuration
- Site URL：`https://chaiowei.github.io/quotation_report`
- Redirect URLs 加入：`https://chaiowei.github.io/quotation_report/*`
