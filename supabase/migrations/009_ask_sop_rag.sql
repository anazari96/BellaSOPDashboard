-- ============================================
-- Bella SOP Dashboard — Ask Me Anything (RAG)
-- Migration 009
-- ============================================

-- Enable pgvector extension (must be done once per project)
create extension if not exists vector;

-- ============================================
-- SOP EMBEDDINGS
-- Stores text chunks from published SOPs with
-- their vector embeddings for semantic search.
-- ============================================
create table sop_embeddings (
  id          uuid primary key default gen_random_uuid(),
  sop_id      uuid not null references sops(id) on delete cascade,
  chunk_text  text not null,
  embedding   vector(1536),           -- OpenAI text-embedding-3-small dimension
  created_at  timestamptz not null default now()
);

create index idx_sop_embeddings_sop on sop_embeddings(sop_id);

-- Enable ivfflat index for fast ANN search (optional, helps at scale)
-- create index on sop_embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 100);

alter table sop_embeddings enable row level security;

-- Any authenticated user can read embeddings (we expose only chunk text in API context building)
create policy "Authenticated users can read embeddings"
  on sop_embeddings for select
  using (auth.uid() is not null);

-- Only service role (API routes) can insert/update/delete
create policy "Service role can manage embeddings"
  on sop_embeddings for all
  using (auth.role() = 'service_role');

-- ============================================
-- SOP QA LOG
-- Persists every question + answer for admin
-- analytics and staff question history.
-- ============================================
create table sop_qa_log (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles(id) on delete cascade,
  question        text not null,
  answer          text not null,
  sop_references  jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now()
);

create index idx_sop_qa_log_user on sop_qa_log(user_id);
create index idx_sop_qa_log_created on sop_qa_log(created_at desc);

alter table sop_qa_log enable row level security;

create policy "Users can insert own QA log"
  on sop_qa_log for insert
  with check (auth.uid() = user_id);

create policy "Users can view own QA log"
  on sop_qa_log for select
  using (auth.uid() = user_id);

create policy "Admins can view all QA logs"
  on sop_qa_log for select
  using (is_admin());

-- ============================================
-- MATCH SOP CHUNKS
-- RPC function for cosine similarity search.
-- Called from the API route with the embedded
-- query vector.
-- ============================================
create or replace function match_sop_chunks(
  query_embedding   vector(1536),
  match_threshold   float   default 0.70,
  match_count       int     default 5
)
returns table (
  id          uuid,
  sop_id      uuid,
  chunk_text  text,
  similarity  float
)
language sql stable
as $$
  select
    sop_embeddings.id,
    sop_embeddings.sop_id,
    sop_embeddings.chunk_text,
    1 - (sop_embeddings.embedding <=> query_embedding) as similarity
  from sop_embeddings
  where 1 - (sop_embeddings.embedding <=> query_embedding) > match_threshold
  order by sop_embeddings.embedding <=> query_embedding
  limit match_count;
$$;
