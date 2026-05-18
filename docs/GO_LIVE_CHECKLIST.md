# REALM Radar Canada — Go-Live Checklist

Everything I could automate is done. This is what's left for you, in order.

**Total time: ~25 minutes** (most of it is creating Google Alerts one by one).

---

## Status snapshot

| Layer | Status |
|---|---|
| GitHub repo | ✅ Live ([c51consulting/realm-radar-canada](https://github.com/c51consulting/realm-radar-canada)) |
| Supabase database | ✅ Live (`raqzeslwlyccnirvxvmk`, schema + 10 source seeds applied) |
| Vercel app | ✅ Live ([realm-radar-canada.vercel.app](https://realm-radar-canada.vercel.app/radar), HTTP 200, shows honest "warming up" empty state) |
| PostHog analytics | ⚙️ Code wired, needs key |
| Worker secrets | ⚙️ Placeholder in Vercel, needs real values |
| Railway workers | ❌ Not deployed yet |
| Google Alerts | ❌ Not created yet |
| Custom domain | ❌ Not configured (subdomain TBD) |

---

## Step 1 — Fill in the Vercel secrets (5 min)

1. Open the secrets script and paste your real values:
   ```bash
   cd realm-radar-canada
   $EDITOR scripts/set-vercel-secrets.sh
   ```
   Required for first real data flow:
   - `SUPABASE_SERVICE_ROLE_KEY` — get from [Supabase dashboard → Settings → API](https://supabase.com/dashboard/project/raqzeslwlyccnirvxvmk/settings/api) → `service_role` (secret)
   - `OPENAI_API_KEY` — for AI enrichment

   Optional for now:
   - `RESEND_API_KEY` — only needed when you turn on the Friday digest
   - `NEXT_PUBLIC_POSTHOG_KEY` — only needed when you want analytics live

2. Run the script:
   ```bash
   bash scripts/set-vercel-secrets.sh
   vercel --prod
   ```

## Step 2 — Stand up the Railway workers (15 min)

Open `docs/RAILWAY_SETUP.md` and follow it. Three services, same repo, different start commands and cron schedules.

When you finish, verify with this SQL in Supabase:
```sql
select source, status, items_processed, started_at
from worker_runs order by started_at desc limit 10;
```

## Step 3 — Create Google Alerts (10 min)

Open `docs/GOOGLE_ALERTS_SETUP.md` and follow it. 10 alerts, all phase-1 states × categories.

You will need to provide the worker with the Gmail credentials it uses to read these alerts — those go into the Railway environment (already covered in `RAILWAY_SETUP.md`).

## Step 4 — Custom domain (when ready)

Brief specifies `realmgroup.global/ca/radar/`. Options:

- **Easiest:** point `radar.realmgroup.global` (subdomain) at the Vercel app — add the domain in Vercel project Settings → Domains, then add the DNS record they show you.
- **Strategy-doc path:** reverse-proxy `/us/radar/*` from the main site to the Vercel app via Cloudflare Workers or Next.js rewrites on the main site.

Once set, also update the Vercel env var `NEXT_PUBLIC_SITE_URL` to the real domain and redeploy so sitemap + OG tags use it.

## Step 5 — Smoke test the live pipeline (5 min once steps 1–3 are done)

1. Create one extra Google Alert with a deliberately niche query you control (e.g. your name + "auction") and trigger it manually by sending yourself a fake Google Alert-formatted email.
2. Within 15 minutes the `realm-radar-alerts` worker should pick it up.
3. Check `listings` table for a new row in `ai_reviewed` status.
4. Approve it in the `/admin` UI — should appear on `/radar` within 10 minutes (ISR revalidation).

---

## What I'd recommend monitoring for the first week

- **Morning briefing email** at 7am AEST weekdays — this already fires automatically.
- **Supabase log spikes** — check `worker_runs` daily for `status='error'`.
- **Vercel function logs** — `/api/cron/enrich` runs nightly; should process the AI enrichment queue.
- **OpenAI spend** — gpt-4o-mini at ~500 tokens/listing is ~$0.0001 per enrichment. 100 listings/day = ~$3/month. Budget alert at $20/month.

## Known not-yet-built (intentional, phase 2)

- Stripe wiring for paid affiliate placements
- Partner badge system (schema supports it, UI doesn't differentiate yet)
- Lead routing form for finance/transport CTAs (currently link out to main REALM site)
- State-level newsletter sign-ups (currently one global digest)

---

Repo: https://github.com/c51consulting/realm-radar-canada
Live: https://realm-radar-canada.vercel.app/radar
Supabase: https://supabase.com/dashboard/project/raqzeslwlyccnirvxvmk
