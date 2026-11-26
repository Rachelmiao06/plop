-- Plop! opt-in "今日最惨 · Today's oops" (2026-11-25). Run once, after 0001 to 0005. Safe on a table with rows.
--
-- A player can tick "let the group laugh at my worst throw today" on the end card. Only then does their line keep the
-- day's lowest throw (fewest cards down in one throw), so the board can show the group's oops of the day. Stored:
-- the opt-in flag, which day (the game's day, midnight China time, decided by the server), and that day's lowest
-- throw. Unticking clears the day and the throw. Nothing else.

alter table public.scores add column if not exists oops_opt_in boolean not null default false;
alter table public.scores add column if not exists oops_day    date;
alter table public.scores add column if not exists oops_low    integer check (oops_low >= 0);

-- Submit a match (as `submit_score_v2`) and, when the match says so, record the opt-in and the day's lowest throw,
-- in one transaction. `p_oops` null: an older game, the oops columns stay as they were.
create or replace function public.submit_score_v3(
  p_group text, p_name text, p_name_key text, p_score integer, p_rounds smallint, p_mode text,
  p_clears integer default null, p_streak integer default null, p_bumps integer default null,
  p_stars integer default null, p_throws integer default null, p_full_power integer default null,
  p_oops boolean default null, p_worst integer default null, p_day date default null
)
returns table (
  name text, best_score integer, best_rounds smallint, best_mode text, best_at timestamptz,
  latest_score integer, latest_rounds smallint, plays integer, improved boolean,
  full_clears integer, best_streak integer, friend_bumps integer, star_hits integer, throws integer,
  full_power_throws integer, dry_matches integer, stats_matches integer,
  oops_opt_in boolean, oops_day date, oops_low integer
)
language plpgsql
security invoker
set search_path = public
as $$
#variable_conflict use_column
declare
  r record;
begin
  select * into r from public.submit_score_v2(
    p_group, p_name, p_name_key, p_score, p_rounds, p_mode, p_clears, p_streak, p_bumps, p_stars, p_throws, p_full_power
  );

  if p_oops is not null then
    if p_oops then
      update public.scores as s set
        oops_opt_in = true,
        oops_low = case
          when p_worst is null or p_day is null then s.oops_low
          when s.oops_day = p_day then least(s.oops_low, p_worst)
          else p_worst end,
        oops_day = case when p_worst is null or p_day is null then s.oops_day else p_day end
      where s.group_id = p_group and s.name_key = p_name_key;
    else
      update public.scores as s set oops_opt_in = false, oops_day = null, oops_low = null
      where s.group_id = p_group and s.name_key = p_name_key;
    end if;
  end if;

  return query
    select r.name, r.best_score, r.best_rounds, r.best_mode, r.best_at, r.latest_score, r.latest_rounds, r.plays,
           r.improved, r.full_clears, r.best_streak, r.friend_bumps, r.star_hits, r.throws, r.full_power_throws,
           r.dry_matches, r.stats_matches, s.oops_opt_in, s.oops_day, s.oops_low
    from public.scores s
    where s.group_id = p_group and s.name_key = p_name_key;
end;
$$;

revoke all on function public.submit_score_v3(text, text, text, integer, smallint, text, integer, integer, integer, integer, integer, integer, boolean, integer, date)
  from public, anon, authenticated;
grant execute on function public.submit_score_v3(text, text, text, integer, smallint, text, integer, integer, integer, integer, integer, integer, boolean, integer, date)
  to service_role;
