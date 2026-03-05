-- Fix the handle_new_user function to ensure it runs with correct search_path
-- and has proper type casting for the role enum.
-- This resolves "Database error saving new user" during registration by fixing type resolution issues in the trigger.

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Team Member'),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'staff'::public.user_role)
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Ensure necessary permissions (idempotent)
grant usage on schema public to service_role;
grant all on public.profiles to service_role;
