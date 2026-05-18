# Railway Worker Setup — REALM Radar Canada

Railway hosts the three background workers. Vercel hosts the public app + the two HTTP-triggered crons (`/api/cron/enrich`, `/api/cron/expire`). Railway has no API connector for this account, so the steps below are manual.

**Total time:** ~15 minutes. **Cost:** Hobby plan ($5 trial credit covers all three workers easily; sustained cost ~$5–$10/month for all three combined since they sleep between cron firings.)

---

## 1. Create the Railway project

1. Go to [railway.app](https://railway.app) and sign in (use the GitHub account that owns the repo: `c51consulting`).
2. Click **New Project → Deploy from GitHub repo**.
3. Authorise Railway for the `c51consulting/realm-radar-canada` repo if prompted.
4. Pick `c51consulting/realm-radar-canada` as the source.
5. Railway will auto-detect the project and create one default service. **Rename it** to `realm-radar-rss` (Settings → Service Name).

## 2. Set shared environment variables

In the project dashboard click **Variables** (project-level, top right — applies to all services). Add:

```
NEXT_PUBLIC_SUPABASE_URL=https://raqzeslwlyccnirvxvmk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhcXplc2x3bHljY25pcnZ4dm1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NDE1MTksImV4cCI6MjA5NDAxNzUxOX0.vlYhGRUX-zZ_FgpgrStx5Qub4g5EWYvLJFnlsPYTpZg
SUPABASE_SERVICE_ROLE_KEY=<paste from Supabase dashboard → Settings → API → service_role>
OPENAI_API_KEY=<your OpenAI key>
OPENAI_MODEL=gpt-4o-mini
CRON_SECRET=09mssqRbxWs4jhswXOOPithq3ld2rQK85UMRjju_H0A
```

For the Google Alerts inbox worker, also add (Gmail IMAP — create an app password at [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)):

```
ALERT_INBOX_USER=<gmail address that receives Google Alerts>
ALERT_INBOX_PASS=<gmail app password>
ALERT_INBOX_HOST=imap.gmail.com
ALERT_INBOX_PORT=993
```

For the weekly digest worker (optional — only needed if you want the Friday digest email):

```
RESEND_API_KEY=<your Resend key>
DIGEST_FROM_EMAIL=radar@realmgroup.global
DIGEST_TO_EMAIL=c51consulting.aus@gmail.com
```

## 3. Configure service 1 — RSS poller

- **Name:** `realm-radar-rss`
- **Settings → Start Command:** `npm run worker:rss`
- **Settings → Cron Schedule:** `*/30 * * * *` (every 30 min)
- **Settings → Restart Policy:** On Failure, max 3 retries
- **Deploy.** Watch the first run in the Logs tab — should print `[rss] processed N items`.

## 4. Configure service 2 — Google Alerts inbox watcher

- Project dashboard → **+ New → GitHub Repo → realm-radar-canada**.
- **Name:** `realm-radar-alerts`
- **Settings → Start Command:** `npm run worker:alerts`
- **Settings → Cron Schedule:** `*/15 * * * *` (every 15 min)
- **Settings → Restart Policy:** On Failure, max 3 retries
- **Deploy.**

## 5. Configure service 3 — Weekly digest

- Project dashboard → **+ New → GitHub Repo → realm-radar-canada**.
- **Name:** `realm-radar-digest`
- **Settings → Start Command:** `npm run worker:digest`
- **Settings → Cron Schedule:** `0 13 * * 5` (Fridays 8am CT = 13:00 UTC)
- **Settings → Restart Policy:** On Failure, max 3 retries
- **Deploy.**

## 6. Verify

After all three services deploy:

1. Check Railway Logs for each service — first cron firing should produce a log line within the schedule window.
2. In Supabase SQL editor run:
   ```sql
   select source, status, started_at, finished_at, items_processed
   from worker_runs
   order by started_at desc
   limit 10;
   ```
   You should see rows appearing as the crons fire.

## 7. Two follow-ups not in Railway

- **Set the Supabase service role key in Vercel too.** Settings → Project → realm-radar-canada → Settings → Environment Variables → `SUPABASE_SERVICE_ROLE_KEY` → replace the placeholder with the real value. Then redeploy: `vercel --prod`.
- **Set up Google Alerts** to send to the `ALERT_INBOX_USER` mailbox. One alert per state×category combo — the seed rows in the `sources` table give the suggested queries. In Gmail, create a filter that labels these emails so the worker can find them.

---

**Once these are running, the morning briefing cron (`a36e8bfd`) will start surfacing real activity** instead of an empty system. The cron already checks `worker_runs` for failures — it'll alert you if any worker errors overnight.
