-- Plop! play-style numbers for the board's funny titles (2026-11-25). Run once, after 0001 to 0003. Safe on a table
-- that already has rows (every new column starts at 0).
--
-- Each nickname's line on a group board also keeps a few running totals from the matches it submitted: full clears,
-- the longest run of full clears in one match, friends knocked (the bunny, the sleepy cat), star cards down, throws,
-- throws at full pull, matches in a row without a full clear, and how many matches sent these numbers. Only whole
-- numbers about play; nothing about the person. The game's server checks them before they are written.

alter table public.scores add column if not exists full_clears       integer not null default 0 check (full_clears >= 0);
alter table public.scores add column if not exists best_streak       integer not null default 0 check (best_streak >= 0);
alter table public.scores add column if not exists friend_bumps      integer not null default 0 check (friend_bumps >= 0);
alter table public.scores add column if not exists star_hits         integer not null default 0 check (star_hits >= 0);
alter table public.scores add column if not exists throws            integer not null default 0 check (throws >= 0);
alter table public.scores add column if not exists full_power_throws integer not null default 0 check (full_power_throws >= 0);
alter table public.scores add column if not exists dry_matches       integer not null default 0 check (dry_matches >= 0);
alter table public.scores add column if not exists stats_matches     integer not null default 0 check (stats_matches >= 0);

-- Submit a match score (as `submit_score`) and, when the match sent its play-style numbers, add them to the totals,
-- in one transaction. Without numbers (an older game) the totals stay as they were.
create or replace function public.submit_score_v2(
  p_group text, p_name text, p_name_key text, p_score integer, p_rounds smallint, p_mode text,
  p_clears integer default null, p_streak integer default null, p_bumps integer default null,
  p_stars integer default null, p_throws integer default null, p_full_power integer default null
)
returns table (
  name text, best_score integer, best_rounds smallint, best_mode text, best_at timestamptz,
  latest_score integer, latest_rounds smallint, plays integer, improved boolean,
  full_clears integer, best_streak integer, friend_bumps integer, star_hits integer, throws integer,
  full_power_throws integer, dry_matches integer, stats_matches integer
)
language plpgsql
security invoker
set search_path = public
as $$
#variable_conflict use_column
declare
  r record;
begin
  select * into r from public.submit_score(p_group, p_name, p_name_key, p_score, p_rounds, p_mode);

  if p_clears is not null then
    update public.scores as s set
      full_clears       = s.full_clears + p_clears,
      best_streak       = greatest(s.best_streak, p_streak),
      friend_bumps      = s.friend_bumps + p_bumps,
      star_hits         = s.star_hits + p_stars,
      throws            = s.throws + p_throws,
      full_power_throws = s.full_power_throws + p_full_power,
      dry_matches       = case when p_clears > 0 then 0 else s.dry_matches + 1 end,
      stats_matches     = s.stats_matches + 1
    where s.group_id = p_group and s.name_key = p_name_key;
  end if;

  return query
    select r.name, r.best_score, r.best_rounds, r.best_mode, r.best_at, r.latest_score, r.latest_rounds, r.plays,
           r.improved, s.full_clears, s.best_streak, s.friend_bumps, s.star_hits, s.throws, s.full_power_throws,
           s.dry_matches, s.stats_matches
    from public.scores s
    where s.group_id = p_group and s.name_key = p_name_key;
end;
$$;

revoke all on function public.submit_score_v2(text, text, text, integer, smallint, text, integer, integer, integer, integer, integer, integer)
  from public, anon, authenticated;
grant execute on function public.submit_score_v2(text, text, text, integer, smallint, text, integer, integer, integer, integer, integer, integer)
  to service_role;
