-- Tracks per-user, per-day autofill (AI recipe parsing) usage so the
-- parse-recipe edge function can enforce a daily quota per user.
create table if not exists public.autofill_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  usage_date date not null,
  count integer not null default 0,
  primary key (user_id, usage_date)
);

-- Only the edge function (via the service role key) needs access to this
-- table, so RLS is enabled with no policies to block all client access.
alter table public.autofill_usage enable row level security;

-- Atomically increments today's count for a user only if it's still under
-- the given limit, returning whether the call is allowed. Avoids a
-- read-then-write race between concurrent requests.
create or replace function public.try_increment_autofill_usage(
  p_user_id uuid,
  p_usage_date date,
  p_limit integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
begin
  insert into public.autofill_usage (user_id, usage_date, count)
  values (p_user_id, p_usage_date, 0)
  on conflict (user_id, usage_date) do nothing;

  update public.autofill_usage
  set count = count + 1
  where user_id = p_user_id
    and usage_date = p_usage_date
    and count < p_limit
  returning count into new_count;

  return new_count is not null;
end;
$$;
