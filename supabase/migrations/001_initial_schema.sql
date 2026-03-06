-- ============================================
-- Bella SOP Dashboard - Initial Schema
-- ============================================

-- ============================================
-- ENUM TYPES
-- ============================================
create type user_role as enum ('admin', 'staff');
create type sop_importance as enum ('critical', 'high', 'medium', 'low');
create type sop_status as enum ('draft', 'published');
create type media_type as enum ('image', 'video');

-- ============================================
-- PROFILES
-- ============================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role user_role not null default 'staff',
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Team Member'),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'staff')
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- CATEGORIES
-- ============================================
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  emoji text not null default '📋',
  description text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================
-- SOPS
-- ============================================
create table sops (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category_id uuid not null references categories(id) on delete restrict,
  importance sop_importance not null default 'medium',
  status sop_status not null default 'draft',
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_sops_category on sops(category_id);
create index idx_sops_status on sops(status);
create index idx_sops_importance on sops(importance);

-- ============================================
-- SOP STEPS
-- ============================================
create table sop_steps (
  id uuid primary key default gen_random_uuid(),
  sop_id uuid not null references sops(id) on delete cascade,
  step_number int not null,
  title text not null,
  content text not null,
  tip text,
  warning text,
  created_at timestamptz not null default now(),
  unique(sop_id, step_number)
);

create index idx_sop_steps_sop on sop_steps(sop_id);

-- ============================================
-- STEP MEDIA
-- ============================================
create table step_media (
  id uuid primary key default gen_random_uuid(),
  step_id uuid not null references sop_steps(id) on delete cascade,
  media_url text not null,
  media_type media_type not null default 'image',
  caption text,
  sort_order int not null default 0
);

create index idx_step_media_step on step_media(step_id);

-- ============================================
-- STAFF PROGRESS
-- ============================================
create table staff_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  sop_id uuid not null references sops(id) on delete cascade,
  step_id uuid not null references sop_steps(id) on delete cascade,
  completed boolean not null default false,
  completed_at timestamptz,
  unique(user_id, sop_id, step_id)
);

create index idx_staff_progress_user on staff_progress(user_id);
create index idx_staff_progress_sop on staff_progress(sop_id);

-- ============================================
-- AUTO-UPDATE updated_at
-- ============================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger sops_updated_at
  before update on sops
  for each row execute function update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Helper to check admin role
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer;

-- PROFILES
alter table profiles enable row level security;

create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can insert own profile on signup"
  on profiles for insert with check (auth.uid() = id);

create policy "Admins can view all profiles"
  on profiles for select using (is_admin());

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Admins can update any profile"
  on profiles for update using (is_admin());

-- CATEGORIES
alter table categories enable row level security;

create policy "Anyone authenticated can view categories"
  on categories for select using (auth.uid() is not null);

create policy "Admins can manage categories"
  on categories for all using (is_admin());

-- SOPS
alter table sops enable row level security;

create policy "Staff can view published SOPs"
  on sops for select using (
    auth.uid() is not null and (status = 'published' or is_admin())
  );

create policy "Admins can manage SOPs"
  on sops for all using (is_admin());

-- SOP STEPS
alter table sop_steps enable row level security;

create policy "Users can view steps of accessible SOPs"
  on sop_steps for select using (
    auth.uid() is not null and exists (
      select 1 from sops where sops.id = sop_steps.sop_id
        and (sops.status = 'published' or is_admin())
    )
  );

create policy "Admins can manage steps"
  on sop_steps for all using (is_admin());

-- STEP MEDIA
alter table step_media enable row level security;

create policy "Users can view media of accessible steps"
  on step_media for select using (
    auth.uid() is not null and exists (
      select 1 from sop_steps
        join sops on sops.id = sop_steps.sop_id
        where sop_steps.id = step_media.step_id
        and (sops.status = 'published' or is_admin())
    )
  );

create policy "Admins can manage media"
  on step_media for all using (is_admin());

-- STAFF PROGRESS
alter table staff_progress enable row level security;

create policy "Users can view own progress"
  on staff_progress for select using (auth.uid() = user_id);

create policy "Users can manage own progress"
  on staff_progress for insert with check (auth.uid() = user_id);

create policy "Users can update own progress"
  on staff_progress for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Admins can view all progress"
  on staff_progress for select using (is_admin());

-- ============================================
-- SEED DEFAULT CATEGORIES
-- ============================================
insert into categories (name, emoji, description, sort_order) values
  ('Opening', '🌅', 'Morning opening checklists and startup procedures', 1),
  ('Closing', '🌙', 'End-of-day closing checklists and shutdown procedures', 2),
  ('Brewing', '☕', 'Espresso, pour-over, cold brew, and tea preparation', 3),
  ('Recipes', '📖', 'Drink recipes, food recipes, and seasonal specials', 4),
  ('Kitchen Prep', '🍳', 'Mise en place, food safety, and storage guidelines', 5),
  ('Desserts', '🍰', 'Pastry preparation, plating, and storage', 6),
  ('Cleaning', '🧹', 'Daily, weekly, and deep cleaning procedures', 7),
  ('Customer Service', '😊', 'Greeting, handling complaints, upselling techniques', 8);

-- ============================================
-- STORAGE BUCKET
-- ============================================
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'storage' and table_name = 'buckets'
  ) then
    insert into storage.buckets (id, name, public)
    values ('sop-media', 'sop-media', true)
    on conflict (id) do nothing;
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'storage' and table_name = 'objects'
  ) then
    if not exists (
      select 1 from pg_policies where policyname = 'Anyone authenticated can view media'
    ) then
      create policy "Anyone authenticated can view media"
        on storage.objects for select using (
          bucket_id = 'sop-media' and auth.uid() is not null
        );
    end if;

    if not exists (
      select 1 from pg_policies where policyname = 'Admins can upload media'
    ) then
      create policy "Admins can upload media"
        on storage.objects for insert with check (
          bucket_id = 'sop-media' and is_admin()
        );
    end if;

    if not exists (
      select 1 from pg_policies where policyname = 'Admins can delete media'
    ) then
      create policy "Admins can delete media"
        on storage.objects for delete using (
          bucket_id = 'sop-media' and is_admin()
        );
    end if;
  end if;
end $$;
