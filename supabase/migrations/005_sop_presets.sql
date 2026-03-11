-- ============================================
-- SOP PRESETS
-- A preset is a named collection of SOPs meant to be read together
-- ============================================

create table sop_presets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  emoji text not null default '📚',
  status sop_status not null default 'draft',
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_sop_presets_status on sop_presets(status);
create index idx_sop_presets_created_by on sop_presets(created_by);

-- ============================================
-- SOP PRESET ITEMS
-- The ordered list of SOPs belonging to a preset
-- ============================================

create table sop_preset_items (
  id uuid primary key default gen_random_uuid(),
  preset_id uuid not null references sop_presets(id) on delete cascade,
  sop_id uuid not null references sops(id) on delete cascade,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (preset_id, sop_id)
);

create index idx_sop_preset_items_preset on sop_preset_items(preset_id);
create index idx_sop_preset_items_sop on sop_preset_items(sop_id);

-- Auto-update updated_at on sop_presets
create or replace function update_sop_preset_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_sop_presets_updated_at
  before update on sop_presets
  for each row execute function update_sop_preset_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table sop_presets enable row level security;

create policy "Authenticated users can view published presets"
  on sop_presets for select using (
    auth.uid() is not null
    and (status = 'published' or is_admin())
  );

create policy "Admins can manage presets"
  on sop_presets for all using (is_admin());

-- Preset items

alter table sop_preset_items enable row level security;

create policy "Users can view items of accessible presets"
  on sop_preset_items for select using (
    auth.uid() is not null
    and exists (
      select 1 from sop_presets
      where sop_presets.id = sop_preset_items.preset_id
        and (sop_presets.status = 'published' or is_admin())
    )
  );

create policy "Admins can manage preset items"
  on sop_preset_items for all using (is_admin());
