-- Plop! group leaderboards. Paste this whole file into Supabase → SQL Editor → New query → Run (once).
--
-- One row per nickname per invite group: their best match (kept on top) and their latest one.
-- Only a nickname and scores are stored: no accounts, no emails, no IP addresses, no device ids.
-- Only the game's server reads and writes, with the service role key; row-level security is on with no
-- policies, so the public (anon) key and the browser cannot touch this table at all.

create table if not exists public.scores (
  id            bigint generated always as identity primary key,
  group_id      text        not null check (group_id ~ '^[A-Za-z0-9_-]{8}$'),
  name          text        not null check (char_length(name) between 1 and 12),
  name_key      text        not null check (char_length(name_key) between 1 and 24),
  best_score    integer     not null check (best_score >= 0),
  best_rounds   smallint    not null check (best_rounds in (3, 5)),
  best_mode     text        not null check (best_mode in ('turns', 'together')),
  best_at       timestamptz not null default now(),
  latest_score  integer     not null check (latest_score >= 0),
  latest_rounds smallint    not null check (latest_rounds in (3, 5)),
  latest_mode   text        not null check (latest_mode in ('turns', 'together')),
  plays         integer     not null default 1,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (group_id, name_key)
);

-- The board query: one group, best first, earliest best wins a tie.
create index if not exists scores_board_idx on public.scores (group_id, best_score desc, best_at asc);

alter table public.scores enable row level security;
-- No policies on purpose: only the service role (which skips row-level security) may read or write.
revoke all on public.scores from anon, authenticated;

-- Submit one match score atomically: insert the name, or keep the higher best and always replace the latest.
create or replace function public.submit_score(
  p_group text, p_name text, p_name_key text, p_score integer, p_rounds smallint, p_mode text
)
returns table (
  name text, best_score integer, best_rounds smallint, best_mode text, best_at timestamptz,
  latest_score integer, latest_rounds smallint, plays integer, improved boolean
)
language plpgsql
security invoker
set search_path = public
as $$
#variable_conflict use_column
declare
  old_best integer;
begin
  select s.best_score into old_best from public.scores s where s.group_id = p_group and s.name_key = p_name_key;

  insert into public.scores as s (
    group_id, name, name_key, best_score, best_rounds, best_mode, latest_score, latest_rounds, latest_mode
  )
  values (p_group, p_name, p_name_key, p_score, p_rounds, p_mode, p_score, p_rounds, p_mode)
  on conflict (group_id, name_key) do update set
    name          = excluded.name,
    best_score    = greatest(s.best_score, excluded.best_score),
    best_rounds   = case when excluded.best_score > s.best_score then excluded.best_rounds else s.best_rounds end,
    best_mode     = case when excluded.best_score > s.best_score then excluded.best_mode else s.best_mode end,
    best_at       = case when excluded.best_score > s.best_score then now() else s.best_at end,
    latest_score  = excluded.latest_score,
    latest_rounds = excluded.latest_rounds,
    latest_mode   = excluded.latest_mode,
    plays         = s.plays + 1,
    updated_at    = now();

  return query
    select s.name, s.best_score, s.best_rounds, s.best_mode, s.best_at,
           s.latest_score, s.latest_rounds, s.plays, (old_best is null or p_score > old_best)
    from public.scores s
    where s.group_id = p_group and s.name_key = p_name_key;
end;
$$;

revoke all on function public.submit_score(text, text, text, integer, smallint, text) from public, anon, authenticated;
grant execute on function public.submit_score(text, text, text, integer, smallint, text) to service_role;
