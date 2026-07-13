# CRT Journal — Setup Guide

A static site (GitHub Pages) + Supabase backend (Postgres + Auth + Storage).
No server to run, no build step — just static files talking directly to Supabase.

---

## 1. Create the Supabase project

1. Go to supabase.com → New project. Pick any name/region, set a database password (you won't need it day-to-day).
2. Wait for it to finish provisioning (~2 min).
3. Left sidebar → **SQL Editor** → New query → paste the entire contents of `schema.sql` from this folder → **Run**.
   This creates the `trades` and `screenshots` tables, turns on Row Level Security so you can only ever see your own data, and creates a private `trade-screenshots` storage bucket.
4. Left sidebar → **Authentication → Providers** → make sure **Email** is enabled (it is by default). You don't need to touch password settings — this app uses passwordless magic-link sign-in.
5. Left sidebar → **Authentication → URL Configuration** → set **Site URL** to whatever your GitHub Pages URL will be (e.g. `https://yourusername.github.io/crt-journal/` or your custom domain once you have it — you can update this later, just remember to).
6. Left sidebar → **Project Settings → API** → copy the **Project URL** and the **anon public** key.

## 2. Wire up the config

Open `config.js` in this folder and paste your values:

```js
window.CRT_CONFIG = {
  SUPABASE_URL: "https://xxxxxxxx.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOi..."
};
```

The anon key is meant to be public/exposed in frontend code — it can only do what your Row Level Security policies allow, which is "read/write your own rows, nothing else." Do **not** use the `service_role` key here.

## 3. Push to GitHub

```bash
cd crt-journal
git init
git add .
git commit -m "CRT journal"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/crt-journal.git
git push -u origin main
```

## 4. Turn on GitHub Pages

1. On GitHub, go to your repo → **Settings → Pages**.
2. Under "Build and deployment," set **Source: Deploy from a branch**, branch **main**, folder **/(root)**.
3. Save. After a minute your site is live at `https://YOUR-USERNAME.github.io/crt-journal/`.
4. Go back to Supabase → Authentication → URL Configuration and make sure **Site URL** matches this exactly (update it if you set a placeholder earlier).

## 5. Point your free student domain at it (Namecheap / GitHub Student Pack)

Since you have GitHub Student Developer Pack, you likely got a free domain through Namecheap (e.g., a `.me` domain) via the GitHub education offer. Here is exactly how to connect it:

1. In your GitHub repo, go to **Settings → Pages**.
2. Scroll down to **Custom domain** and enter your domain (e.g., `crtjournal.me`), then click Save. (This automatically creates a `CNAME` file in your repo).
3. Log into your domain registrar (e.g., Namecheap):
   - Go to **Domain List** → click **Manage** next to your domain.
   - Go to the **Advanced DNS** tab.
   - Delete any existing parking or default records.
   - Add these 4 **A Records** pointing to GitHub's servers:
     - Type: `A Record` | Host: `@` | Value: `185.199.108.153`
     - Type: `A Record` | Host: `@` | Value: `185.199.109.153`
     - Type: `A Record` | Host: `@` | Value: `185.199.110.153`
     - Type: `A Record` | Host: `@` | Value: `185.199.111.153`
   - Add a **CNAME Record** for the `www` subdomain:
     - Type: `CNAME Record` | Host: `www` | Value: `YOUR-USERNAME.github.io`
4. Wait a few minutes (DNS propagation), then go back to your GitHub repo → Settings → Pages. Check the **Enforce HTTPS** box.
5. **CRITICAL**: Go back to Supabase → Authentication → URL Configuration and update the **Site URL** to `https://yourdomain.me`. Add `http://localhost:3000/*` to the **Redirect URLs** if you want to test locally as well.

## 6. Using it

- Open your site, enter your email, click the magic link that arrives, and you're in.
- **+ New Trade** → fill in the trade, tick the checklist honestly, attach screenshots, save.
- Dashboard shows your win rate, average RR achieved, and overall checklist compliance across all logged trades — that compliance number is the one to watch since it's the direct measure of whether you're actually following the plan or not.
- Click any row to see the full breakdown, checklist pass/fail, and screenshots (click a screenshot to view full-size).

## Notes

- This app only supports one signed-in user viewing their own data — if you ever want to invite someone else in (a mentor reviewing your trades, for example), that needs a small policy change; ask and I can add it.
- Screenshots live in a **private** bucket — links are generated as short-lived signed URLs each time you view a trade, so nobody can access them just by guessing a file path.
- Everything here is plain HTML/CSS/JS — no build step, no npm install required to run it. You can edit any file directly and just push again.
