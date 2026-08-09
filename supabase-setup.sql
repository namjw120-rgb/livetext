-- LIVE TEXT - Supabase 초기 설정 SQL
-- Supabase 대시보드 > SQL Editor에서 실행하세요

-- 1. 메시지 테이블 생성
create table if not exists messages (
  id uuid default gen_random_uuid() primary key,
  event_id text not null default 'default',
  content text not null check (char_length(content) <= 200),
  nickname text not null default '익명',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  is_displaying boolean not null default false,
  created_at timestamptz default now(),
  approved_at timestamptz
);

-- 2. Row Level Security 활성화
alter table messages enable row level security;

-- 3. 정책 설정 (누구나 읽기/쓰기/수정 가능)
create policy "Allow public insert" on messages
  for insert with check (true);

create policy "Allow public read" on messages
  for select using (true);

create policy "Allow public update" on messages
  for update using (true);

-- 4. Realtime 활성화
alter publication supabase_realtime add table messages;
