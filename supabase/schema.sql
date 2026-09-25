-- 在 Supabase SQL Editor 里整段运行。
-- 打卡日界是上海时间凌晨 4 点，由客户端写入 log_date，这里不另做定时任务。

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  invite_code text not null unique check (invite_code ~ '^[0-9]{6}$'),
  name text not null,
  current_target_furniture text,
  target_progress integer not null default 0,
  unlocked_ids text[] not null default '{}',
  cat_outfit_id text,
  goal_set_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  name text not null,
  avatar_color text not null
);

create table if not exists public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  category text not null check (category in ('work', 'study', 'sport')),
  status text not null check (status in ('done', 'skipped')),
  log_date date not null,
  blueprint_id text,
  created_at timestamptz not null default now(),
  unique (user_id, category, log_date)
);

create table if not exists public.nudges (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  from_user_id uuid not null references public.users (id) on delete cascade,
  to_user_id uuid not null references public.users (id) on delete cascade,
  from_name text not null,
  created_at timestamptz not null default now()
);

alter table public.rooms enable row level security;
alter table public.users enable row level security;
alter table public.daily_logs enable row level security;
alter table public.nudges enable row level security;

-- users.id 使用 Supabase Auth 的用户 id（auth.uid()），这样换设备登录仍是同一行。
-- 轻量邀请码。知道 anon key 的人仍可读写这些表。
create policy "rooms anon" on public.rooms for all to anon, authenticated using (true) with check (true);
create policy "users anon" on public.users for all to anon, authenticated using (true) with check (true);
create policy "logs anon" on public.daily_logs for all to anon, authenticated using (true) with check (true);
create policy "nudges anon" on public.nudges for all to anon, authenticated using (true) with check (true);

alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.users;
alter publication supabase_realtime add table public.daily_logs;
alter publication supabase_realtime add table public.nudges;
