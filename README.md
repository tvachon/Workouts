# Workouts

A cross-platform (web + iOS/Android) workout tracker built with Expo + TypeScript,
backed by Supabase (hosted Postgres + Auth) so your training history is safe,
synced across devices, and survives losing a phone. Deployed to the web the same
way as Watchtimer — `expo export --platform web` → GitHub Pages.

## What it does

- Define exercises (name, optional description, lb/kg).
- Log one entry per exercise per day: reps, weight, optional notes, and the date.
- Group exercises onto weekdays in a weekly **Routine**; the **Today** tab shows
  what's scheduled for the current day with a quick "Log" action.
- Per-exercise line graphs of **weight over time** and **reps over time**.

## One-time setup

### 1. Supabase project
1. Create a free project at [supabase.com](https://supabase.com).
2. In the dashboard: **SQL Editor → New query**, paste the contents of
   [`supabase/schema.sql`](supabase/schema.sql), and **Run**. This creates the
   `exercises`, `workout_logs`, and `routine_days` tables and enables
   Row-Level Security on all three.
3. Confirm each table shows the **RLS enabled** (shield) indicator in the
   Table editor.
4. **Project Settings → API**: copy the **Project URL** and the **anon public**
   key. (Never use the `service_role` key in this app.)

### 2. Local env
```bash
cp .env.example .env.local
# edit .env.local and paste your Project URL + anon key
```

### 3. Install & run
```bash
npm install
npm run web      # or: npm run ios / npm run android
```

## Deploy the web app (GitHub Pages)

1. Create a GitHub repo named **`Workouts`** (the name must match
   `experiments.baseUrl: "/Workouts"` in `app.json`).
2. **Settings → Pages → Source = GitHub Actions**.
3. **Settings → Secrets and variables → Actions**, add:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
4. Push to `main`. The workflow in
   [`.github/workflows/deploy-web.yml`](.github/workflows/deploy-web.yml) builds
   and publishes to `https://<you>.github.io/Workouts/`.

## Mobile builds (EAS)

```bash
npx eas-cli login
eas build:configure
# inject the same Supabase vars for native bundles:
eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value "<url>"
eas env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "<anon key>"
eas build --profile preview --platform android
```

## Security notes

The Supabase **anon key is public by design** — it ships in the web bundle and
mobile binary. Your data is protected by **Row-Level Security** policies scoped
to your authenticated user id, not by hiding the key. The `service_role` key is
never used in this app.
