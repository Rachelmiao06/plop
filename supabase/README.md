# The leaderboard's database (Supabase)

**Already set up.** The Supabase project `plop` is connected to the Vercel project through the Vercel Supabase
integration, so Production, Preview and Development already have `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
The scores table from [`migrations/0001_scores.sql`](migrations/0001_scores.sql) was created on 2026-11-25.
Nothing to do unless you want to look.

## Looking at the scores

1. Go to <https://supabase.com/dashboard> and open the project **plop** (or Vercel → the plop project →
   **Storage** → the Supabase database → **Open in Supabase**).
2. Left sidebar → **Table Editor** → **scores**. One row per nickname per invite group:
   - `group_id` the invite link's group (`?g=`)
   - `name` the nickname
   - `best_score`, `best_rounds`, `best_mode` their best match
   - `latest_score`, `latest_rounds` their most recent match
   - `plays` how many matches they submitted
3. To remove a rude name or wipe a group: tick the rows → **Delete**. The board updates on the next look.

Please don't change the table's columns or switch off row-level security there: the game expects this shape, and
row-level security keeps the table closed to everyone except the game's server.

## Play-style totals

[`migrations/0004_score_stats.sql`](migrations/0004_score_stats.sql) (applied 2026-11-25) adds a few running totals to
each line in **scores** for the board's funny titles: `full_clears`, `best_streak`, `friend_bumps`, `star_hits`,
`throws`, `full_power_throws`, `dry_matches` (matches in a row without a full clear), `stats_matches`. Only numbers
about play. The game's server writes them through `submit_score_v2`.

## Stickers

Table **reactions** ([`migrations/0005_reactions.sql`](migrations/0005_reactions.sql), created 2026-11-25): one row per
friend's sticker on another player's line: `group_id`, `from_name`, `to_name`, `kind` (star, wow, lol, music),
`updated_at`, `seen_at`. Same rules as the other tables: row-level security on, no public access.

## Snowballs

Table **snowballs** ([`migrations/0003_snowballs.sql`](migrations/0003_snowballs.sql), created 2026-11-25): one row
per snowball a friend threw at another on a group board: `group_id`, `from_name`, `to_name` (nicknames), `thrown_at`
and `seen_at` (when the one who got hit saw the note). Rows older than 8 days are removed automatically. Same rules
as scores: row-level security on, no public access.

## What is stored

Only a nickname and match scores per invite group (plus the match length, turns / together, how many matches and
when). No accounts, emails, IP addresses or device ids. Row-level security is on with no public rules, and the
public (anon / publishable) key has no rights on the table, so only the game's server, with the secret key, can
read or write it.

## Keys

The secret key (`SUPABASE_SERVICE_ROLE_KEY`) stays in Vercel → Settings → Environment Variables and only the server
uses it. Never paste it into a chat, a file, GitHub or the game's code. If it ever leaks: Supabase → Project
Settings → API Keys → roll it, then Vercel → Deployments → latest → ⋯ → Redeploy.

Without the two variables (for example a fresh local checkout without `vercel env pull .env.local`), the leaderboard
runs in **demo mode**: it works, but scores live in memory and are forgotten on restart.

## A new migration later

A new file in `migrations/` (`0002_….sql`) is run once in Supabase → **SQL Editor** → **New query** → paste → **Run**.
