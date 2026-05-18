/**
 * Webhook dispatch — POSTs new published listings to subscribed partner endpoints.
 *
 * Trigger model: pull-based. The admin/publish flow OR a cron hits
 * /api/webhooks/dispatch, which:
 *   1. Loads listings published in the last N minutes (default 30).
 *   2. Loads active webhook_subscriptions.
 *   3. For each (subscription, listing) pair, runs the JSONB filter.
 *   4. POSTs the FeedItem payload with HMAC-SHA256 signature header.
 *   5. Logs to webhook_deliveries; bumps failure_count on non-2xx.
 *
 * Partners verify the signature like this:
 *   sig = "sha256=" + hmac_sha256(secret, raw_body).hex()
 *   compare to header X-Realm-Signature using constant-time compare
 */
import { createHmac } from 'crypto';
import { supabaseAdmin } from './supabase';
import type { Listing } from './types';
import { listingToFeedItem } from './feed-source';

const DEFAULT_LOOKBACK_MIN = 30;
const MAX_DELIVERIES_PER_RUN = 200;

type Subscription = {
  id: string;
  partner_name: string;
  target_url: string;
  filter: Record<string, unknown>;
  secret: string;
  failure_count: number;
};

/** Run the JSON filter against a listing. Empty filter = match all. */
function matches(filter: Record<string, unknown>, l: Listing): boolean {
  for (const [k, v] of Object.entries(filter || {})) {
    if (v === null || v === undefined || v === '') continue;
    const lv = (l as unknown as Record<string, unknown>)[k];
    if (Array.isArray(v)) {
      if (!v.includes(lv as never)) return false;
    } else if (lv !== v) {
      return false;
    }
  }
  return true;
}

function sign(secret: string, body: string): string {
  return 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');
}

export type DispatchResult = {
  scanned_listings: number;
  active_subscriptions: number;
  deliveries_attempted: number;
  deliveries_succeeded: number;
  deliveries_failed: number;
};

export async function dispatchWebhooks(opts: { lookbackMinutes?: number } = {}): Promise<DispatchResult> {
  const lookback = opts.lookbackMinutes ?? DEFAULT_LOOKBACK_MIN;
  const since = new Date(Date.now() - lookback * 60_000).toISOString();
  const admin = supabaseAdmin();

  const [{ data: listings }, { data: subs }] = await Promise.all([
    admin
      .from('listings')
      .select('*')
      .eq('status', 'published')
      .gte('published_at', since)
      .limit(MAX_DELIVERIES_PER_RUN),
    admin
      .from('webhook_subscriptions')
      .select('id, partner_name, target_url, filter, secret, failure_count')
      .eq('active', true),
  ]);

  const result: DispatchResult = {
    scanned_listings: listings?.length || 0,
    active_subscriptions: subs?.length || 0,
    deliveries_attempted: 0,
    deliveries_succeeded: 0,
    deliveries_failed: 0,
  };

  if (!listings?.length || !subs?.length) return result;

  for (const sub of subs as Subscription[]) {
    // Skip badly-failing subscriptions (>10 consecutive failures pause the partner).
    if (sub.failure_count >= 10) continue;
    for (const listing of listings as Listing[]) {
      if (!matches(sub.filter || {}, listing)) continue;

      // Already delivered? (idempotency per (subscription_id, item_id))
      const { data: prior } = await admin
        .from('webhook_deliveries')
        .select('id, success')
        .eq('subscription_id', sub.id)
        .eq('item_id', listing.id)
        .limit(1);
      if (prior && prior.length && prior[0].success) continue;

      const item = listingToFeedItem(listing);
      const body = JSON.stringify({
        event: 'listing.published',
        delivered_at: new Date().toISOString(),
        item,
      });
      const signature = sign(sub.secret, body);
      result.deliveries_attempted++;

      let statusCode = 0;
      let respExcerpt = '';
      let success = false;
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 10_000);
        const res = await fetch(sub.target_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Realm-Signature': signature,
            'X-Realm-Event': 'listing.published',
            'User-Agent': 'REALM-Radar-Webhook/1.0',
          },
          body,
          signal: controller.signal,
        });
        clearTimeout(timer);
        statusCode = res.status;
        respExcerpt = (await res.text()).slice(0, 240);
        success = res.ok;
      } catch (e) {
        respExcerpt = String((e as Error).message || e).slice(0, 240);
        statusCode = 0;
      }

      if (success) result.deliveries_succeeded++;
      else result.deliveries_failed++;

      await admin.from('webhook_deliveries').insert({
        subscription_id: sub.id,
        item_id: listing.id,
        status_code: statusCode,
        response_excerpt: respExcerpt,
        success,
      });

      // Update subscription counters
      if (success) {
        await admin
          .from('webhook_subscriptions')
          .update({ last_delivered_at: new Date().toISOString(), failure_count: 0 })
          .eq('id', sub.id);
      } else {
        await admin
          .from('webhook_subscriptions')
          .update({ failure_count: (sub.failure_count || 0) + 1 })
          .eq('id', sub.id);
      }
    }
  }

  return result;
}
