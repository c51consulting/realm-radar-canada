# REALM Radar Canada

Curated agricultural auctions, machinery sales, livestock listings, rural property and market activity hub for the Canada. The discovery + intelligence layer above the fragmented US ag marketplace.

> Stack: **Next.js 15** (App Router, ISR) · **Supabase Postgres** (pg_trgm + tsvector + RLS) · **OpenAI Structured Outputs** for enrichment · **Vercel** for the web app + cron · **Railway** for long-running ingestion workers · **Resend** for transactional + digest email · **PostHog** for analytics.

---

## Architecture

```
realmgroup.global/ca/radar/   →  Next.js on Vercel (SSR + ISR every 10 min)
                                  ├─ /radar                       (main hub)
                                  ├─ /radar/[slug]                (state OR category pages)
                                  ├─ /radar/submit                (public submission form)
                                  ├─ /admin                       (review queue, token-gated)
                                  └─ /api/...                     (submit, cron, admin)

Supabase Postgres                ├─ listings        (main, with pg_trgm + tsvector indexes)
                                  ├─ sources        (RSS / alert configs)
                                  ├─ submissions    (form intake)
                                  ├─ affiliates     (members + tiers + Stripe id)
                                  ├─ subscribers    (email list)
                                  ├─ events         (analytics fallback)
                                  └─ worker_runs    (job log → morning briefing reads this)

Workers (Railway, cron)          ├─ rss-poller       every 30 min
                                  ├─ alert-inbox     every 15 min  (Gmail IMAP, Google Alerts)
                                  ├─ enrichment-queue every 5 min   (or Vercel cron variant)
                                  ├─ expire-listings  nightly 03:15 UTC
                                  └─ weekly-digest    Fri 13:00 UTC (Fri 8am CT)
```

## How the flagged risks are solved on day 1

| Risk | Solution baked in |
|---|---|
| Notion ceiling | Native Postgres with proper indexes — never hits a ceiling at MVP scale |
| Dedup | `canonicalize_url()` + `build_fingerprint()` + `find_fuzzy_duplicates()` (trigram). 3-layer dedup runs in SQL, no AI cost per check |
| Expiry | `expire_past_listings()` SQL function + Vercel cron + Railway nightly worker. Listings auto-archive after sale date |
| Custom Search discontinuation | Not used. Sources are RSS + IMAP + Apify + form. Independent of Google Custom Search |
| WordPress/Elementor pain | Radar is its own app — never touches WordPress |
| Analytics | PostHog + listing-side `data-radar-link` attribute on every outbound link tracked automatically |
| Migration cost | Already on the target stack |

---

## Quick start

```bash
git clone git@github.com:c51consulting/realm-radar-canada.git
cd realm-radar-canada
cp .env.example .env.local        # fill in keys
npm install
# Push schema to Supabase
supabase link --project-ref YOUR_REF
supabase db push
# Seed demo listings so the UI isn't empty
npm run seed
npm run dev
# → http://localhost:3000/radar
```

## Environment variables

See `.env.example`. Required for production:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `CRON_SECRET` (shared between Vercel cron and any external trigger)
- `ADMIN_API_TOKEN` (used by `/admin` UI)
- `RESEND_API_KEY`, `DIGEST_FROM_EMAIL` (for the weekly email)
- `ALERT_INBOX_USER`, `ALERT_INBOX_PASS` (Gmail app password for the Google Alerts inbox)

## Deploying

**Vercel:** import the repo, add env vars, deploy. The crons in `vercel.json` activate automatically.

**Railway:** create three services from this repo. Set start commands:
- `npm run worker:rss` — schedule every 30 min
- `npm run worker:alerts` — every 15 min
- `npm run worker:digest` — Friday 13:00 UTC

**Supabase:** `supabase db push` runs both migrations. Enable `pg_cron` from the dashboard if you want to run `expire_past_listings()` natively (optional — the Vercel cron also calls it).

**Subdomain routing:** the public app expects to be reachable at `realmgroup.global/ca/radar/`. Configure your main site to reverse-proxy `/us/radar/*` to the Vercel deployment, or use Vercel's subdomain (`radar.realmgroup.global`) and add a redirect from `/us/radar` on the main site.

## Build phases

- **Phase 1 (this repo, week 1–2):** hub + Wisconsin/Iowa/Texas state pages + machinery/livestock category pages + submit form + admin queue + AI enrichment + weekly digest.
- **Phase 2 (week 3–6):** affiliate dashboard, paid featured placements (Stripe), partner directory, weekly email with subscriber segmentation.
- **Phase 3 (60–90 days):** REALM360 deep-link signals, market reports per state/category, finance lead routing.

## Daily ops (CTO morning briefing)

A scheduled task runs every weekday at 07:00 AEST and emails `c51consulting.aus@gmail.com` only if any of the following changed overnight:

- new commits / open PRs / unresolved issues on this repo
- Vercel: failed deployments or 5xx spike on `/api/cron/*`
- Railway: failed builds, restarting services, or `worker_runs` rows with `status='error'` in the last 24h

If nothing changed, the briefing is skipped.

## License

Private — © REALM Group / C51 Consulting.
