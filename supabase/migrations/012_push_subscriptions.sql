create table if not exists public.user_push_subscriptions (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    subscription jsonb not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- set up RLS
alter table public.user_push_subscriptions enable row level security;

-- Policies
create policy "Users can view their own subscriptions"
    on public.user_push_subscriptions for select
    using (auth.uid() = user_id);

create policy "Users can insert their own subscriptions"
    on public.user_push_subscriptions for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own subscriptions"
    on public.user_push_subscriptions for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "Users can delete their own subscriptions"
    on public.user_push_subscriptions for delete
    using (auth.uid() = user_id);

-- Admins can view all subscriptions (to send notifications)
create policy "Admins can view all subscriptions"
    on public.user_push_subscriptions for select
    using (
        exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
    );
