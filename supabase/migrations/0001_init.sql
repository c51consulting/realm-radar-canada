-- REALM Radar Canada — initial schema
-- Postgres extensions
create extension if not exists "uuid-ossp";
create extension if not exists pg_trgm;
create extension if not exists pgcrypto;
-- pg_cron is enabled in Supabase via dashboard; not declared here

-- =============================================================
-- ENUMS
-- =============================================================
create type source_type as enum (
  'public_auction',
  'dealer_listing',
  'marketplace_listing',
  'realm_listing',
  'affiliate_member',
  'partner_feature',
  'submission'
);

create type listing_status as enum (
  'new',
  'ai_reviewed',
  'human_approved',
  'published',
  'archived',
  'rejected'
);

create type signal_type as enum (
  'opportunity',
  'market_movement',
  'partner_lead',
  'finance_trigger'
);

create type permission_level as enum (
  'public_link_only',
  'submitted',
  'partner_approved',
  'realm_owned'
);

create type us_region as enum (
  'midwest', 'plains', 'south', 'west', 'northeast', 'southeast', 'mountain'
);

create type affiliate_tier as enum (
  'free', 'verified', 'featured_partner', 'state_sponsor'
);

-- =============================================================
-- SOURCES (RSS feeds, Alert configs, Apify actors)
-- =============================================================
create table sources (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  kind text not null check (kind in ('rss', 'google_alert', 'apify', 'manual', 'marketplace_api')),
  url text,
  state text,
  category text,
  active boolean not null default true,
  last_polled_at timestamptz,
  poll_interval_minutes int not null default 60,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_sources_active on sources (active, last_polled_at);

-- =============================================================
-- LISTINGS — the core table
-- =============================================================
create table listings (
  id uuid primary key default uuid_generate_v4(),

  -- Source identification
  source_id uuid references sources(id) on delete set null,
  source_name text not null,
  source_url text not null,
  source_type source_type not null default 'public_auction',

  -- Canonical URL for exact dedup (UTM-stripped, normalized)
  canonical_url text not null,
  -- Content fingerprint for near-dedup (md5 of title + state + sale_date)
  content_fingerprint text not null,

  -- Raw input (before AI)
  raw_title text not null,
  raw_snippet text,
  raw_payload jsonb default '{}'::jsonb,

  -- AI-enriched fields
  clean_title text,
  summary text,
  realm_take text,
  newsletter_snippet text,
  linkedin_snippet text,

  -- Classification
  state text,
  region us_region,
  county text,
  category text,
  subcategory text,
  signal_type signal_type,

  -- Timing
  sale_date date,
  date_found timestamptz not null default now(),
  expiry_date date,
  published_at timestamptz,

  -- Pricing
  price_text text,
  price_value numeric,
  currency text default 'USD',

  -- Scoring
  priority_score int check (priority_score between 0 and 100),
  confidence_score int check (confidence_score between 0 and 100),
  target_audience text[],
  risk_flags text[] default '{}',

  -- Permissions / commercial
  permission_level permission_level not null default 'public_link_only',
  image_allowed boolean not null default false,
  image_url text,
  featured boolean not null default false,

  -- CTAs
  primary_cta text,
  secondary_cta text,

  -- Workflow
  status listing_status not null default 'new',
  duplicate_of uuid references listings(id) on delete set null,
  notes text,

  -- Full-text search
  search_tsv tsvector,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint listings_canonical_url_unique unique (canonical_url),
  constraint listings_fingerprint_unique unique (content_fingerprint)
);

create index idx_listings_status on listings (status);
create index idx_listings_state on listings (state) where status = 'published';
create index idx_listings_category on listings (category) where status = 'published';
create index idx_listings_state_cat on listings (state, category) where status = 'published';
create index idx_listings_sale_date on listings (sale_date) where status = 'published';
create index idx_listings_priority on listings (priority_score desc) where status in ('ai_reviewed', 'human_approved', 'published');
create index idx_listings_featured on listings (featured) where status = 'published' and featured = true;
create index idx_listings_search_tsv on listings using gin (search_tsv);
create index idx_listings_title_trgm on listings using gin (raw_title gin_trgm_ops);
create index idx_listings_published_at on listings (published_at desc) where status = 'published';

-- =============================================================
-- TRIGGERS
-- =============================================================

-- Auto-update updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger trg_listings_updated before update on listings
  for each row execute function set_updated_at();

create trigger trg_sources_updated before update on sources
  for each row execute function set_updated_at();

-- Auto-build full-text search vector
create or replace function listings_tsv_update()
returns trigger language plpgsql as $$
begin
  new.search_tsv :=
    setweight(to_tsvector('english', coalesce(new.clean_title, new.raw_title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.summary, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.realm_take, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.state, '') || ' ' || coalesce(new.category, '') || ' ' || coalesce(new.subcategory, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(new.source_name, '')), 'D');
  return new;
end $$;

create trigger trg_listings_tsv before insert or update on listings
  for each row execute function listings_tsv_update();

-- Auto-set published_at when status flips to 'published'
create or replace function listings_publish_stamp()
returns trigger language plpgsql as $$
begin
  if new.status = 'published' and (old.status is distinct from 'published') then
    new.published_at = coalesce(new.published_at, now());
  end if;
  return new;
end $$;

create trigger trg_listings_publish before update on listings
  for each row execute function listings_publish_stamp();

-- =============================================================
-- DEDUP HELPERS
-- =============================================================

-- Strip UTM + tracking params and normalize URL
create or replace function canonicalize_url(u text)
returns text language plpgsql immutable as $$
declare
  cleaned text;
begin
  if u is null then return null; end if;
  cleaned := lower(trim(u));
  -- strip fragment
  cleaned := regexp_replace(cleaned, '#.*$', '');
  -- strip tracking query params (utm_*, fbclid, gclid, ref, source)
  cleaned := regexp_replace(cleaned, '([?&])(utm_[^=&]+|fbclid|gclid|mc_cid|mc_eid|ref|source)=[^&]*', '\1', 'gi');
  -- clean up dangling ? or &
  cleaned := regexp_replace(cleaned, '[?&]+$', '');
  cleaned := regexp_replace(cleaned, '\?&', '?');
  cleaned := regexp_replace(cleaned, '&&+', '&');
  -- strip trailing slash
  cleaned := regexp_replace(cleaned, '/$', '');
  return cleaned;
end $$;

-- Build content fingerprint
create or replace function build_fingerprint(p_title text, p_state text, p_sale_date date)
returns text language sql immutable as $$
  select encode(
    digest(
      coalesce(lower(regexp_replace(p_title, '\s+', ' ', 'g')), '') || '|' ||
      coalesce(lower(p_state), '') || '|' ||
      coalesce(p_sale_date::text, ''),
      'md5'
    ),
    'hex'
  );
$$;

-- Find fuzzy duplicates using trigram similarity
create or replace function find_fuzzy_duplicates(
  p_title text,
  p_state text,
  p_threshold float default 0.65
) returns table (id uuid, similarity float) language sql stable as $$
  select l.id, similarity(l.raw_title, p_title) as sim
  from listings l
  where l.state = p_state
    and l.status not in ('archived', 'rejected')
    and l.raw_title % p_title
  order by sim desc
  limit 5;
$$;

-- =============================================================
-- EXPIRY AUTOMATION
-- =============================================================

-- Archive listings past their sale date
create or replace function expire_past_listings()
returns int language plpgsql as $$
declare
  affected int;
begin
  update listings
  set status = 'archived'
  where status = 'published'
    and (
      (sale_date is not null and sale_date < current_date) or
      (expiry_date is not null and expiry_date < current_date)
    );
  get diagnostics affected = row_count;
  return affected;
end $$;

-- =============================================================
-- SUBMISSIONS (raw form intake before becoming listings)
-- =============================================================
create table submissions (
  id uuid primary key default uuid_generate_v4(),
  business_name text not null,
  contact_name text,
  email text not null,
  phone text,
  website text,
  listing_url text not null,
  state text,
  category text,
  sale_date date,
  description text,
  permission_to_feature boolean not null default false,
  image_url text,
  paid_feature_interest boolean not null default false,
  ip_hash text,
  user_agent text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'spam')),
  listing_id uuid references listings(id) on delete set null,
  reviewer_notes text,
  created_at timestamptz not null default now()
);
create index idx_submissions_status on submissions (status, created_at desc);

-- =============================================================
-- AFFILIATES & PARTNERS
-- =============================================================
create table affiliates (
  id uuid primary key default uuid_generate_v4(),
  business_name text not null,
  contact_name text,
  email text not null unique,
  phone text,
  website text,
  tier affiliate_tier not null default 'free',
  state text,
  categories text[],
  description text,
  verified boolean not null default false,
  active boolean not null default true,
  stripe_customer_id text,
  monthly_amount_usd numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_affiliates_updated before update on affiliates
  for each row execute function set_updated_at();

-- =============================================================
-- ANALYTICS EVENTS (lightweight, augments PostHog)
-- =============================================================
create table events (
  id bigserial primary key,
  event_type text not null,
  listing_id uuid references listings(id) on delete set null,
  state text,
  category text,
  source_url text,
  referrer text,
  session_id text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index idx_events_type on events (event_type, created_at desc);
create index idx_events_listing on events (listing_id, created_at desc);

-- =============================================================
-- EMAIL SUBSCRIBERS
-- =============================================================
create table subscribers (
  id uuid primary key default uuid_generate_v4(),
  email text not null unique,
  states text[],
  categories text[],
  cadence text not null default 'weekly' check (cadence in ('daily', 'weekly', 'monthly')),
  confirmed boolean not null default false,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now()
);

-- =============================================================
-- WORKER JOB LOG (so the morning briefing can see failures)
-- =============================================================
create table worker_runs (
  id bigserial primary key,
  worker text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running', 'success', 'error')),
  items_processed int default 0,
  errors text[],
  metadata jsonb default '{}'::jsonb
);
create index idx_worker_runs_recent on worker_runs (worker, started_at desc);

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================
alter table listings enable row level security;
alter table sources enable row level security;
alter table submissions enable row level security;
alter table affiliates enable row level security;
alter table events enable row level security;
alter table subscribers enable row level security;
alter table worker_runs enable row level security;

-- Public can read only published listings
create policy "Public reads published listings" on listings
  for select using (status = 'published');

-- Public can insert submissions and events
create policy "Public submits" on submissions
  for insert with check (true);

create policy "Public events insert" on events
  for insert with check (true);

create policy "Public subscribes" on subscribers
  for insert with check (true);

-- Service role bypasses RLS (workers use service role key)
