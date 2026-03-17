-- ============================================
-- TRAINING SYSTEM
-- Adaptive daily training sessions generated
-- by LLM based on SOP content, past mistakes,
-- and admin notes.
-- ============================================

-- ============================================
-- ENUM TYPES
-- ============================================
create type training_status as enum ('pending', 'in_progress', 'completed');
create type question_type as enum ('multiple_choice', 'true_false');
create type note_priority as enum ('high', 'medium', 'low');

-- ============================================
-- TRAINING SESSIONS
-- ============================================
create table training_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  sop_id uuid not null references sops(id) on delete cascade,
  status training_status not null default 'pending',
  review_content text not null,
  score integer,
  total_questions integer not null default 0,
  correct_answers integer not null default 0,
  created_by uuid references profiles(id) on delete set null,
  generated_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create index idx_training_sessions_user on training_sessions(user_id);
create index idx_training_sessions_sop on training_sessions(sop_id);
create index idx_training_sessions_status on training_sessions(status);
create index idx_training_sessions_user_status on training_sessions(user_id, status);

-- ============================================
-- TRAINING QUESTIONS
-- ============================================
create table training_questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references training_sessions(id) on delete cascade,
  question_number integer not null,
  question_text text not null,
  question_type question_type not null,
  options jsonb not null,
  correct_answer text not null,
  explanation text not null,
  related_step_id uuid references sop_steps(id) on delete set null
);

create index idx_training_questions_session on training_questions(session_id);

-- ============================================
-- TRAINING ANSWERS
-- ============================================
create table training_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references training_questions(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  selected_option text not null,
  is_correct boolean not null,
  answered_at timestamptz not null default now(),
  unique(question_id, user_id)
);

create index idx_training_answers_question on training_answers(question_id);
create index idx_training_answers_user on training_answers(user_id);

-- ============================================
-- ADMIN STAFF NOTES
-- ============================================
create table admin_staff_notes (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references profiles(id) on delete cascade,
  staff_id uuid not null references profiles(id) on delete cascade,
  sop_id uuid references sops(id) on delete cascade,
  note text not null,
  priority note_priority not null default 'medium',
  addressed boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_admin_staff_notes_staff on admin_staff_notes(staff_id);
create index idx_admin_staff_notes_sop on admin_staff_notes(sop_id);
create index idx_admin_staff_notes_addressed on admin_staff_notes(addressed);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Training Sessions
alter table training_sessions enable row level security;

create policy "Staff can view own training sessions"
  on training_sessions for select using (auth.uid() = user_id);

create policy "Admins can view all training sessions"
  on training_sessions for select using (is_admin());

create policy "Admins can insert training sessions"
  on training_sessions for insert with check (is_admin());

create policy "Staff can update own training sessions"
  on training_sessions for update using (auth.uid() = user_id);

create policy "Admins can update any training session"
  on training_sessions for update using (is_admin());

create policy "Service role can manage training sessions"
  on training_sessions for all using (auth.role() = 'service_role');

-- Training Questions
alter table training_questions enable row level security;

create policy "Staff can view questions for own sessions"
  on training_questions for select using (
    exists (
      select 1 from training_sessions
      where training_sessions.id = training_questions.session_id
        and training_sessions.user_id = auth.uid()
    )
  );

create policy "Admins can view all training questions"
  on training_questions for select using (is_admin());

create policy "Admins can insert training questions"
  on training_questions for insert with check (is_admin());

create policy "Service role can manage training questions"
  on training_questions for all using (auth.role() = 'service_role');

-- Training Answers
alter table training_answers enable row level security;

create policy "Staff can view own answers"
  on training_answers for select using (auth.uid() = user_id);

create policy "Staff can insert own answers"
  on training_answers for insert with check (auth.uid() = user_id);

create policy "Admins can view all answers"
  on training_answers for select using (is_admin());

create policy "Service role can manage training answers"
  on training_answers for all using (auth.role() = 'service_role');

-- Admin Staff Notes
alter table admin_staff_notes enable row level security;

create policy "Admins can manage staff notes"
  on admin_staff_notes for all using (is_admin());
