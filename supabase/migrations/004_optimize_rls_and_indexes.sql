-- ============================================
-- Optimize RLS policies and indexes
-- ============================================
-- 1. Replace is_admin() with a per-transaction cached version
-- 2. Split FOR ALL policies into INSERT/UPDATE/DELETE to avoid
--    redundant evaluation on SELECT queries
-- 3. Replace redundant single-column indexes with a composite index
-- 4. Add missing admin delete policy on staff_progress

-- ============================================
-- 1. CACHED is_admin() FUNCTION
-- ============================================
-- The old version queried the profiles table on every invocation.
-- With RLS, a single page load could trigger 8-10 calls to is_admin()
-- across multiple tables. This version caches the result per-transaction
-- using set_config so the profiles table is queried at most once.

create or replace function public.is_admin()
returns boolean as $$
declare
  _cached text;
  _result boolean;
begin
  _cached := current_setting('app.is_admin', true);
  if _cached is not null and _cached <> '' then
    return _cached::boolean;
  end if;

  select (role = 'admin') into _result
  from profiles
  where id = auth.uid();

  _result := coalesce(_result, false);
  perform set_config('app.is_admin', _result::text, true);

  return _result;
end;
$$ language plpgsql security definer;

-- ============================================
-- 2. SPLIT FOR ALL POLICIES
-- ============================================
-- When a table has both a SELECT policy and a FOR ALL policy,
-- PostgreSQL evaluates BOTH on every SELECT and ORs them.
-- This means is_admin() is called twice per row on reads.
-- Splitting FOR ALL into INSERT/UPDATE/DELETE removes the
-- overlap so only the single SELECT policy runs on reads.

-- CATEGORIES: drop FOR ALL, create INSERT/UPDATE/DELETE
drop policy if exists "Admins can manage categories" on categories;

create policy "Admins can insert categories"
  on categories for insert with check (is_admin());

create policy "Admins can update categories"
  on categories for update using (is_admin()) with check (is_admin());

create policy "Admins can delete categories"
  on categories for delete using (is_admin());

-- SOPS: drop FOR ALL, create INSERT/UPDATE/DELETE
drop policy if exists "Admins can manage SOPs" on sops;

create policy "Admins can insert SOPs"
  on sops for insert with check (is_admin());

create policy "Admins can update SOPs"
  on sops for update using (is_admin()) with check (is_admin());

create policy "Admins can delete SOPs"
  on sops for delete using (is_admin());

-- SOP STEPS: drop FOR ALL, create INSERT/UPDATE/DELETE
drop policy if exists "Admins can manage steps" on sop_steps;

create policy "Admins can insert steps"
  on sop_steps for insert with check (is_admin());

create policy "Admins can update steps"
  on sop_steps for update using (is_admin()) with check (is_admin());

create policy "Admins can delete steps"
  on sop_steps for delete using (is_admin());

-- STEP MEDIA: drop FOR ALL, create INSERT/UPDATE/DELETE
drop policy if exists "Admins can manage media" on step_media;

create policy "Admins can insert media"
  on step_media for insert with check (is_admin());

create policy "Admins can update media"
  on step_media for update using (is_admin()) with check (is_admin());

create policy "Admins can delete media"
  on step_media for delete using (is_admin());

-- SOP INGREDIENTS (from migration 003): drop FOR ALL, create INSERT/UPDATE/DELETE
drop policy if exists "Admins can manage ingredients" on sop_ingredients;

create policy "Admins can insert ingredients"
  on sop_ingredients for insert with check (is_admin());

create policy "Admins can update ingredients"
  on sop_ingredients for update using (is_admin()) with check (is_admin());

create policy "Admins can delete ingredients"
  on sop_ingredients for delete using (is_admin());

-- SOP LIST ITEMS (from migration 003): drop FOR ALL, create INSERT/UPDATE/DELETE
drop policy if exists "Admins can manage list items" on sop_list_items;

create policy "Admins can insert list items"
  on sop_list_items for insert with check (is_admin());

create policy "Admins can update list items"
  on sop_list_items for update using (is_admin()) with check (is_admin());

create policy "Admins can delete list items"
  on sop_list_items for delete using (is_admin());

-- SOP BEHAVIORS (from migration 003): drop FOR ALL, create INSERT/UPDATE/DELETE
drop policy if exists "Admins can manage behaviors" on sop_behaviors;

create policy "Admins can insert behaviors"
  on sop_behaviors for insert with check (is_admin());

create policy "Admins can update behaviors"
  on sop_behaviors for update using (is_admin()) with check (is_admin());

create policy "Admins can delete behaviors"
  on sop_behaviors for delete using (is_admin());

-- STAFF PROGRESS: add missing admin delete policy
create policy "Admins can delete progress"
  on staff_progress for delete using (is_admin());

-- ============================================
-- 3. OPTIMIZE INDEXES
-- ============================================
-- The common query pattern on staff_progress is
-- WHERE user_id = ? AND sop_id = ?, which benefits from a
-- composite index. The unique constraint on (user_id, sop_id, step_id)
-- covers three-column lookups but a two-column index is faster
-- for the frequent two-column filter. Drop the redundant
-- single-column indexes that the composite replaces.

drop index if exists idx_staff_progress_user;
drop index if exists idx_staff_progress_sop;

create index idx_staff_progress_user_sop on staff_progress(user_id, sop_id);
