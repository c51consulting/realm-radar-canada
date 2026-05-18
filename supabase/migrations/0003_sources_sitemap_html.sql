-- 0003: Allow new source kinds for direct polling (sitemap + html_scrape)
-- Stream 1: Direct auction/dealer/marketplace polling beyond Google News RSS.

alter table sources drop constraint if exists sources_kind_check;
alter table sources
  add constraint sources_kind_check
  check (kind in ('rss', 'google_alert', 'apify', 'manual', 'marketplace_api', 'sitemap', 'html_scrape'));

-- Track which sitemap children we've seen, to skip unchanged ones cheaply.
create table if not exists source_sitemap_state (
  source_id uuid not null references sources(id) on delete cascade,
  child_url text not null,
  last_seen_lastmod timestamptz,
  last_fetched_at timestamptz,
  url_count int default 0,
  primary key (source_id, child_url)
);

create index if not exists idx_source_sitemap_state_source on source_sitemap_state (source_id);
