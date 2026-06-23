-- ProcureAI v5 Database Schema
-- 在 Supabase Dashboard → SQL Editor 執行此檔案

-- ============================================================
-- 1. materials 主檔料料庫
-- ============================================================
create table if not exists public.materials (
  id           uuid primary key default gen_random_uuid(),
  category     text not null check (category in ('配管','儀電','土木','鋼構','共用','工費')),
  name         text not null,
  spec         text,
  unit         text,
  ref_price    numeric(12,2),
  price_min    numeric(12,2),
  price_max    numeric(12,2),
  supplier     text,
  updated_at   timestamptz default now(),
  updated_by   text
);

-- ============================================================
-- 2. quotations 報價紀錄
-- ============================================================
create table if not exists public.quotations (
  id            uuid primary key default gen_random_uuid(),
  project_name  text not null,
  vendor        text,
  upload_date   timestamptz default now(),
  file_name     text,
  storage_path  text,
  parsed_items  jsonb,
  status        text default 'pending' check (status in ('pending','analyzed','error')),
  created_by    uuid references auth.users(id),
  created_at    timestamptz default now()
);

-- ============================================================
-- 3. corrections AI 學習記錄
-- ============================================================
create table if not exists public.corrections (
  id             uuid primary key default gen_random_uuid(),
  original_text  text,
  corrected_text text,
  material_id    uuid references public.materials(id),
  quotation_id   uuid references public.quotations(id),
  created_by     uuid references auth.users(id),
  created_at     timestamptz default now()
);

-- ============================================================
-- RLS（Row Level Security）— 登入才能讀寫
-- ============================================================
alter table public.materials  enable row level security;
alter table public.quotations enable row level security;
alter table public.corrections enable row level security;

-- materials：登入者皆可讀，登入者皆可寫
create policy "materials_select" on public.materials for select using (auth.role() = 'authenticated');
create policy "materials_insert" on public.materials for insert with check (auth.role() = 'authenticated');
create policy "materials_update" on public.materials for update using (auth.role() = 'authenticated');
create policy "materials_delete" on public.materials for delete using (auth.role() = 'authenticated');

-- quotations：只能看自己的，或全員可看（依需求選一）
create policy "quotations_select" on public.quotations for select using (auth.role() = 'authenticated');
create policy "quotations_insert" on public.quotations for insert with check (auth.uid() = created_by);
create policy "quotations_update" on public.quotations for update using (auth.uid() = created_by);

-- corrections：登入者皆可讀寫
create policy "corrections_select" on public.corrections for select using (auth.role() = 'authenticated');
create policy "corrections_insert" on public.corrections for insert with check (auth.role() = 'authenticated');

-- ============================================================
-- 索引（加速查詢）
-- ============================================================
create index if not exists idx_materials_category on public.materials(category);
create index if not exists idx_quotations_created_by on public.quotations(created_by);
create index if not exists idx_quotations_upload_date on public.quotations(upload_date desc);

-- ============================================================
-- 4. Storage Bucket（報價單檔案儲存）
-- ============================================================
insert into storage.buckets (id, name, public)
values ('quotations', 'quotations', false)
on conflict (id) do nothing;

-- Storage RLS：登入者可上傳/讀取自己的檔案
create policy "storage_select" on storage.objects for select using (
  bucket_id = 'quotations' and auth.role() = 'authenticated'
);
create policy "storage_insert" on storage.objects for insert with check (
  bucket_id = 'quotations' and auth.role() = 'authenticated'
);
create policy "storage_delete" on storage.objects for delete using (
  bucket_id = 'quotations' and auth.uid()::text = (storage.foldername(name))[1]
);
