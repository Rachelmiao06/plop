-- Plop! team-up entries on the group boards (2026-11-25). Paste into Supabase → SQL Editor → New query → Run (once),
-- after 0001_scores.sql. Safe to run on a table that already has rows.
--
-- A team-up match goes on the board as ONE entry: both nicknames joined ("小美 & 阿雪", up to 12 + " & " + 12 = 27
-- characters) with the two players' points added up, mode 'team'. Older 'together' rows (each player's own score)
-- stay valid. Score limits are checked by the game's server before anything is written.

alter table public.scores drop constraint if exists scores_name_check;
alter table public.scores drop constraint if exists scores_name_key_check;
alter table public.scores drop constraint if exists scores_best_mode_check;
alter table public.scores drop constraint if exists scores_latest_mode_check;

alter table public.scores add constraint scores_name_check check (char_length(name) between 1 and 27);
alter table public.scores add constraint scores_name_key_check check (char_length(name_key) between 1 and 54);
alter table public.scores add constraint scores_best_mode_check check (best_mode in ('turns', 'together', 'team'));
alter table public.scores add constraint scores_latest_mode_check check (latest_mode in ('turns', 'together', 'team'));
