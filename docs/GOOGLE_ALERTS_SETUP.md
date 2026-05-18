# Google Alerts Setup — REALM Radar Canada

This is the data source that feeds Radar. Without these alerts, the site stays empty.

**Time required:** 10–15 minutes for the 10 phase-1 alerts.

---

## 1. Pick the Gmail account

Use a dedicated Gmail address — e.g. `radar@realmgroup.global` (via Google Workspace) or `realmradar.alerts@gmail.com`. This becomes `ALERT_INBOX_USER` in the Railway worker config.

## 2. Generate a Gmail app password

1. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) (requires 2FA on the account).
2. Pick "Mail" → "Other (Custom)" → name it "REALM Radar Worker".
3. Copy the 16-character password — this is `ALERT_INBOX_PASS`. Store it once; you won't see it again.

## 3. Create a Gmail label + filter

In Gmail:

1. **Settings → Labels → Create new label** → name it `REALM Radar Alerts`.
2. **Settings → Filters and Blocked Addresses → Create a new filter:**
   - From: `googlealerts-noreply@google.com`
   - Click "Create filter"
   - Check **Apply the label** → `REALM Radar Alerts`
   - Check **Never send it to Spam**
   - Save.

This keeps your inbox tidy and lets the worker target one label instead of the whole inbox if you later switch to label-based search.

## 4. Create the 10 phase-1 alerts

Go to [google.com/alerts](https://www.google.com/alerts) (signed in as the radar inbox account). For each query below:

1. Paste the query into the box.
2. Click **Show options** and set:
   - **How often:** As-it-happens
   - **Sources:** Automatic
   - **Language:** English
   - **Region:** Canada
   - **How many:** Only the best results
   - **Deliver to:** the radar inbox email
3. Click **Create Alert**.

### The queries (matches the seeded `sources` table)

| Query | State | Category |
|---|---|---|
| `"Wisconsin farm auction"` | WI | machinery |
| `"Wisconsin machinery auction"` | WI | machinery |
| `"Wisconsin cattle auction"` | WI | livestock |
| `"Iowa farm equipment auction"` | IA | machinery |
| `"Iowa machinery sale"` | IA | machinery |
| `"Texas livestock auction"` | TX | livestock |
| `"Nebraska land auction"` | NE | land_property |
| `"Kansas farm auction"` | KS | machinery |
| `"Minnesota farm equipment sale"` | MN | machinery |
| `"Illinois rural property auction"` | IL | land_property |

**Tip:** Use double quotes around the query — Google Alerts respects them as exact-phrase matching, which dramatically cuts noise.

## 5. Verify

After creating an alert, you should receive a confirmation email within minutes ("Google has created an Alert for…"). The first real alert email typically lands within 1–24 hours depending on news volume.

Once the Railway `realm-radar-alerts` worker is running, it polls this inbox every 15 minutes:
- Reads any unread emails from `googlealerts-noreply@google.com`
- Extracts each link + title from the email body
- Calls `ingestRaw()` which dedupes against the `listings` table
- Marks the email as read

A run log appears in the `worker_runs` table:

```sql
select source, status, items_processed, items_new, started_at
from worker_runs
where source = 'alert-inbox'
order by started_at desc
limit 5;
```

## 6. Tuning later

- **Noise too high?** Tighten queries (`"Wisconsin farm auction" -job -hiring`).
- **Missing relevant content?** Add variants (`"Wisconsin estate auction farm"`).
- **Want more states?** Add rows to the `sources` table, then create matching alerts.

## 7. Backup data sources (phase 2)

When you outgrow Google Alerts:
- **RSS feeds** from major auction sites (e.g. AuctionTime, Fastline, Tractor Zoom) — the `rss-poller` worker is already built to handle these. Add rows to `sources` with `kind='rss'` and `config={"feed_url":"..."}`.
- **Direct partner submissions** via `/radar/submit` — already wired and live.
- **Manual seeding** via `/admin` — already wired.
