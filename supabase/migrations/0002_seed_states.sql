-- Seed phase-1 sources for Canadian agricultural ingestion.
-- Each province × category becomes one alert config row.
-- Workers/cron read these and process matching inbox messages.

insert into sources (name, kind, state, category, config, poll_interval_minutes) values
  -- Prairies (the heartland)
  ('Alberta Farm Auctions', 'google_alert', 'AB', 'machinery', '{"query":"Alberta farm auction"}'::jsonb, 60),
  ('Alberta Cattle Auctions', 'google_alert', 'AB', 'livestock', '{"query":"Alberta cattle auction"}'::jsonb, 60),
  ('Saskatchewan Farm Equipment', 'google_alert', 'SK', 'machinery', '{"query":"Saskatchewan farm equipment auction"}'::jsonb, 60),
  ('Saskatchewan Grain Auction', 'google_alert', 'SK', 'inputs_supplies', '{"query":"Saskatchewan grain auction"}'::jsonb, 60),
  ('Manitoba Farm Auctions', 'google_alert', 'MB', 'machinery', '{"query":"Manitoba farm auction"}'::jsonb, 60),
  ('Manitoba Cattle Sale', 'google_alert', 'MB', 'livestock', '{"query":"Manitoba cattle sale"}'::jsonb, 60),
  -- Central
  ('Ontario Farm Equipment', 'google_alert', 'ON', 'machinery', '{"query":"Ontario farm equipment auction"}'::jsonb, 60),
  ('Ontario Livestock Auction', 'google_alert', 'ON', 'livestock', '{"query":"Ontario livestock auction"}'::jsonb, 60),
  ('Ontario Farmland Auction', 'google_alert', 'ON', 'land_property', '{"query":"Ontario farmland auction"}'::jsonb, 60),
  ('Quebec Encan Agricole', 'google_alert', 'QC', 'machinery', '{"query":"Québec encan agricole machinerie"}'::jsonb, 60),
  ('Quebec Livestock', 'google_alert', 'QC', 'livestock', '{"query":"Québec encan bétail"}'::jsonb, 60),
  -- BC
  ('BC Farm Auctions', 'google_alert', 'BC', 'machinery', '{"query":"British Columbia farm auction"}'::jsonb, 60),
  ('BC Ranch Auction', 'google_alert', 'BC', 'livestock', '{"query":"BC ranch cattle auction"}'::jsonb, 60),
  -- Atlantic
  ('Nova Scotia Farm Sale', 'google_alert', 'NS', 'machinery', '{"query":"Nova Scotia farm equipment sale"}'::jsonb, 60),
  ('New Brunswick Farm Sale', 'google_alert', 'NB', 'machinery', '{"query":"New Brunswick farm sale"}'::jsonb, 60),
  ('PEI Farm Auction', 'google_alert', 'PE', 'machinery', '{"query":"Prince Edward Island farm auction"}'::jsonb, 60),
  ('Newfoundland Farm Sale', 'google_alert', 'NL', 'machinery', '{"query":"Newfoundland farm equipment"}'::jsonb, 60),
  -- Direct sitemap polls (auction marts and dealers — populate URLs after launch)
  ('Canadian Auction Mart Network', 'sitemap_poll', null, 'livestock', '{"sitemap_url":""}'::jsonb, 1440),
  ('Ritchie Bros Canada', 'sitemap_poll', null, 'machinery', '{"sitemap_url":""}'::jsonb, 1440),
  ('Realtor.ca Farmland', 'sitemap_poll', null, 'land_property', '{"sitemap_url":""}'::jsonb, 1440);
