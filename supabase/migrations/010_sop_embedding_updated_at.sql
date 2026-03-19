-- ============================================
-- Migration 010: Track sop_updated_at in embeddings
-- so we can detect stale embeddings when SOPs change
-- ============================================
alter table sop_embeddings
  add column if not exists sop_updated_at timestamptz;
