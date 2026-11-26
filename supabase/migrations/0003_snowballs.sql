-- Plop! snowballs between friends on a group board (2026-11-25). Run once, after 0001 and 0002.
--
-- A tap on a friend's snowman throws a snowball: one row per throw, who threw and who got hit, by nickname, in one
-- invite group. Nothing else is stored (no accounts, emails, IP addresses or device ids, no free text). The game's
-- server allows one throw per friend per hour (`throw_snowball` below) and drops rows older than 8 days, so the
-- table stays small. Row-level security is on with no policies: only the service role may read or write.

create table if not exists public.snowballs (
  id         bigint generated always as identity primary key,
  group_id   text        not null check (group_id ~ '^[A-Za-z0-9_-]{8}$'),
  from_name  text        not null check (char_length(from_name) between 1 and 27),
  from_key   text        not null check (char_length(from_key) between 1 and 54),
  to_name    text        not null check (char_length(to_name) between 1 and 27),
  to_key     text        not null check (char_length(to_key) between 1 and 54),
  thrown_at  timestamptz not null default now(),
  -- When the one who got hit saw the "you got hit" note (null until then).
  seen_at    timestamptz,
  check (from_key <> to_key)
);

-- "Who hit me and I haven't seen it", and the day's count per snowman.
create index if not exists snowballs_to_idx on public.snowballs (group_id, to_key, thrown_at desc);
-- The one-per-friend-per-hour check.
create index if not exists snowballs_pair_idx on public.snowballs (group_id, from_key, to_key, thrown_at desc);
-- Clearing out old throws.
create index if not exists snowballs_age_idx on public.snowballs (thrown_at);

alter table public.snowballs enable row level security;
revoke all on public.snowballs from anon, authenticated;

-- Throw one snowball, atomically: refused (with the seconds left) if this thrower already hit this friend within
-- the cooldown. Old throws (over 8 days) are swept on the way.
create or replace function public.throw_snowball(
  p_group text, p_from text, p_from_key text, p_to text, p_to_key text, p_cooldown_seconds integer
)
returns table (thrown boolean, retry_seconds integer)
language plpgsql
security invoker
set search_path = public
as $$
declare
  last_at timestamptz;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_group || '|' || p_from_key || '|' || p_to_key, 0));
  select s.thrown_at into last_at from public.snowballs s
    where s.group_id = p_group and s.from_key = p_from_key and s.to_key = p_to_key
    order by s.thrown_at desc limit 1;
  if last_at is not null and last_at > now() - make_interval(secs => p_cooldown_seconds) then
    return query select false, greatest(1, ceil(extract(epoch from (last_at + make_interval(secs => p_cooldown_seconds) - now())))::integer);
    return;
  end if;
  delete from public.snowballs where thrown_at < now() - interval '8 days';
  insert into public.snowballs (group_id, from_name, from_key, to_name, to_key)
    values (p_group, p_from, p_from_key, p_to, p_to_key);
  return query select true, 0;
end;
$$;

revoke all on function public.throw_snowball(text, text, text, text, text, integer) from public, anon, authenticated;
grant execute on function public.throw_snowball(text, text, text, text, text, integer) to service_role;
