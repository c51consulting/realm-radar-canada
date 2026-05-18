-- Phase 2: Syndication — partner feed tokens, usage events, webhook subs & deliveries
-- Mirrors realm-radar-usa schema (Phase 2 back-port).

create table if not exists feed_tokens (
  token text primary key,
  partner_name text not null,
  partner_email text,
  scopes text[] not null default '{}'::text[],
  rate_limit_per_minute integer not null default 60,
  revoked boolean not null default false,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  use_count bigint not null default 0,
  notes text
);

create table if not exists feed_token_events (
  id bigserial primary key,
  token text not null,
  feed_path text not null,
  status_code integer,
  user_agent text,
  ip_hash text,
  bytes integer,
  created_at timestamptz not null default now()
);
create index if not exists feed_token_events_token_idx on feed_token_events(token);
create index if not exists feed_token_events_created_at_idx on feed_token_events(created_at desc);

create table if not exists webhook_subscriptions (
  id uuid primary key default gen_random_uuid(),
  partner_name text not null,
  partner_email text,
  target_url text not null,
  filter jsonb not null default '{}'::jsonb,
  secret text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  last_delivered_at timestamptz,
  failure_count integer not null default 0,
  notes text
);
create index if not exists webhook_subscriptions_active_idx on webhook_subscriptions(active) where active = true;

create table if not exists webhook_deliveries (
  id bigserial primary key,
  subscription_id uuid not null references webhook_subscriptions(id) on delete cascade,
  item_id text not null,
  attempt integer not null default 1,
  status_code integer,
  response_excerpt text,
  delivered_at timestamptz not null default now(),
  success boolean not null default false
);
create index if not exists webhook_deliveries_sub_item_idx on webhook_deliveries(subscription_id, item_id);
create index if not exists webhook_deliveries_delivered_at_idx on webhook_deliveries(delivered_at desc);

-- Seed demo internal partner token
insert into feed_tokens (token, partner_name, partner_email, scopes, rate_limit_per_minute, notes)
values ('demo_realm_internal_v1', 'REALM internal demo', 'partners@realmgroup.global',
        array['all','livestock','machinery','farm_equipment','vehicles_transport','land_property','inputs_supplies']::text[],
        600, 'Internal demo token for testing partner endpoints')
on conflict (token) do nothing;
