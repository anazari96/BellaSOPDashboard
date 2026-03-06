-- ============================================
-- SOP Types, Ingredients, List Items, Behaviors, Step Links
-- ============================================

-- Enum for SOP kind
create type sop_type as enum ('procedure', 'recipe', 'greeting_behavior');

-- Add sop_type to sops (default procedure for existing rows)
alter table sops
  add column if not exists sop_type sop_type not null default 'procedure';

create index if not exists idx_sops_sop_type on sops(sop_type);

-- ============================================
-- SOP INGREDIENTS (recipe)
-- ============================================
create table sop_ingredients (
  id uuid primary key default gen_random_uuid(),
  sop_id uuid not null references sops(id) on delete cascade,
  sort_order int not null default 0,
  name text not null,
  amount text not null,
  unit text,
  created_at timestamptz not null default now()
);

create index idx_sop_ingredients_sop on sop_ingredients(sop_id);

-- ============================================
-- SOP LIST ITEMS (tools / pre-requisites)
-- ============================================
create type sop_list_item_type as enum ('tool', 'prereq');

create table sop_list_items (
  id uuid primary key default gen_random_uuid(),
  sop_id uuid not null references sops(id) on delete cascade,
  type sop_list_item_type not null,
  label text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index idx_sop_list_items_sop on sop_list_items(sop_id);

-- ============================================
-- SOP BEHAVIORS (greeting_behavior scenarios)
-- ============================================
create table sop_behaviors (
  id uuid primary key default gen_random_uuid(),
  sop_id uuid not null references sops(id) on delete cascade,
  sort_order int not null default 0,
  trigger_title text not null,
  response_content text not null,
  created_at timestamptz not null default now()
);

create index idx_sop_behaviors_sop on sop_behaviors(sop_id);

-- ============================================
-- STEP LINK TO ANOTHER SOP
-- ============================================
alter table sop_steps
  add column if not exists linked_sop_id uuid references sops(id) on delete set null;

create index if not exists idx_sop_steps_linked_sop on sop_steps(linked_sop_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- SOP INGREDIENTS
alter table sop_ingredients enable row level security;

create policy "Users can view ingredients of accessible SOPs"
  on sop_ingredients for select using (
    auth.uid() is not null and exists (
      select 1 from sops where sops.id = sop_ingredients.sop_id
        and (sops.status = 'published' or is_admin())
    )
  );

create policy "Admins can manage ingredients"
  on sop_ingredients for all using (is_admin());

-- SOP LIST ITEMS
alter table sop_list_items enable row level security;

create policy "Users can view list items of accessible SOPs"
  on sop_list_items for select using (
    auth.uid() is not null and exists (
      select 1 from sops where sops.id = sop_list_items.sop_id
        and (sops.status = 'published' or is_admin())
    )
  );

create policy "Admins can manage list items"
  on sop_list_items for all using (is_admin());

-- SOP BEHAVIORS
alter table sop_behaviors enable row level security;

create policy "Users can view behaviors of accessible SOPs"
  on sop_behaviors for select using (
    auth.uid() is not null and exists (
      select 1 from sops where sops.id = sop_behaviors.sop_id
        and (sops.status = 'published' or is_admin())
    )
  );

create policy "Admins can manage behaviors"
  on sop_behaviors for all using (is_admin());
