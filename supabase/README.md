# Turning on the real leaderboard (Supabase)

Until these steps are done, the leaderboard runs in **demo mode**: it works, but scores are forgotten whenever
the site redeploys. After them, scores are kept for good. About 10 minutes, all in the browser, no terminal.

## 1. Make the Supabase project

1. Go to <https://supabase.com> and sign up (GitHub sign-in is fine). The free plan is enough.
2. Click **New project**. Name: `plop`. Pick a strong database password and keep it in your password manager
   (the game never needs it). Region: the one closest to most players. Click **Create new project** and wait a
   minute until it is ready.

## 2. Make the scores table

1. In the left sidebar click **SQL Editor**, then **New query**.
2. Open [`supabase/migrations/0001_scores.sql`](migrations/0001_scores.sql) on GitHub, click the **Copy raw file**
   button, and paste everything into the editor.
3. Click **Run**. It should say **Success. No rows returned**.
4. Check: left sidebar → **Table Editor** → you should see a table called **scores** (empty).

Running it a second time is harmless.

## 3. Copy the two values

In Supabase: left sidebar → **Project Settings** (the gear) → **API** (on newer dashboards: **Data API** for the
URL and **API Keys** for the key).

| Copy this | Name it in Vercel |
| --- | --- |
| **Project URL** (looks like `https://abcd1234.supabase.co`) | `SUPABASE_URL` |
| The **service_role** key (click **Reveal**; on newer dashboards a **secret** key, `sb_secret_…`) | `SUPABASE_SERVICE_ROLE_KEY` |

The service_role / secret key can do anything to the database: paste it only into Vercel, never into a chat,
a file, GitHub or the game's code. Do **not** use the `anon` / publishable key.

## 4. Paste them into Vercel

1. <https://vercel.com> → the **plop** project → **Settings** → **Environment Variables**.
2. Add `SUPABASE_URL` with the Project URL. Tick **Production** and **Preview**. Save.
3. Add `SUPABASE_SERVICE_ROLE_KEY` with the secret key. Tick **Production** and **Preview**, and switch on
   **Sensitive**. Save.
4. Vercel only reads new values on the next deploy: **Deployments** → the latest one → **⋯** → **Redeploy**.

## 5. Check it

Open `https://plop-two.vercel.app/dev/leaderboard`, submit a score, and look at the server answers at the bottom:
they should say `backend supabase` (not `demo`). In Supabase → **Table Editor** → **scores** you will see the row.

## What is stored

Only a nickname and match scores per invite group (plus the match length, turns / together, how many matches and
when). No accounts, emails, IP addresses or device ids. Row-level security is on with no public rules, so only
the game's server (with the secret key) can read or write the table. To wipe a group, delete its rows in the
Table Editor.
