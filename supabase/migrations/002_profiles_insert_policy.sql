-- Allow profile creation on signup (trigger insert runs in new user context)
-- Fixes "Database error saving new user" when handle_new_user() inserts into profiles
create policy "Users can insert own profile on signup"
  on profiles for insert
  with check (auth.uid() = id);
