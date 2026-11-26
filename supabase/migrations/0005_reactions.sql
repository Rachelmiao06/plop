-- Plop! sticker reactions on friends' scores (2026-11-25). Run once, after 0001 to 0004.
--
-- A friend can drop one of four preset stickers on another player's line on a group board (star 厉害, surprise lines
-- 哇, snow puff 笑死, music notes 好听): one per person per line, changeable, removable. One row per (group, from,
-- to): both nicknames, which sticker, when, and when the one who got it saw the note. No free text, nothing about the
-- person. Row-level security is on with no policies: only the game's server (service role) reads and writes.

create table if not exists public.reactions (
  id         bigint generated always as identity primary key,
  group_id   text        not null check (group_id ~ '^[A-Za-z0-9_-]{8}$'),
  from_name  text        not null check (char_length(from_name) between 1 and 27),
  from_key   text        not null check (char_length(from_key) between 1 and 54),
  to_name    text        not null check (char_length(to_name) between 1 and 27),
  to_key     text        not null check (char_length(to_key) between 1 and 54),
  kind       text        not null check (kind in ('star', 'wow', 'lol', 'music')),
  updated_at timestamptz not null default now(),
  seen_at    timestamptz,
  check (from_key <> to_key),
  unique (group_id, from_key, to_key)
);

-- The board's counts per line, and "who reacted to me and I haven't seen it".
create index if not exists reactions_to_idx on public.reactions (group_id, to_key, updated_at desc);

alter table public.reactions enable row level security;
revoke all on public.reactions from anon, authenticated;

-- Set (or change) one person's sticker on a line; a changed sticker counts as new for the one who gets it.
create or replace function public.set_reaction(
  p_group text, p_from text, p_from_key text, p_to text, p_to_key text, p_kind text
)
returns void
language sql
security invoker
set search_path = public
as $$
  insert into public.reactions (group_id, from_name, from_key, to_name, to_key, kind)
  values (p_group, p_from, p_from_key, p_to, p_to_key, p_kind)
  on conflict (group_id, from_key, to_key) do update set
    from_name  = excluded.from_name,
    to_name    = excluded.to_name,
    kind       = excluded.kind,
    updated_at = now(),
    seen_at    = case when public.reactions.kind = excluded.kind then public.reactions.seen_at else null end;
$$;

revoke all on function public.set_reaction(text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.set_reaction(text, text, text, text, text, text) to service_role;
