export type SourceType =
  | 'public_auction'
  | 'dealer_listing'
  | 'marketplace_listing'
  | 'realm_listing'
  | 'affiliate_member'
  | 'partner_feature'
  | 'submission';

export type ListingStatus =
  | 'new'
  | 'ai_reviewed'
  | 'human_approved'
  | 'published'
  | 'archived'
  | 'rejected';

// Canadian regions: prairies (AB/SK/MB), central (ON/QC), atlantic (NS/NB/PE/NL), west (BC), north (YT/NT/NU)
export type CaRegion =
  | 'prairies' | 'central' | 'atlantic' | 'west' | 'north';

export type SignalType =
  | 'opportunity' | 'market_movement' | 'partner_lead' | 'finance_trigger';

export type DuplicateStatus = 'unique' | 'possible_duplicate' | 'duplicate';

export type Listing = {
  id: string;
  source_name: string;
  source_url: string;
  display_url?: string | null;
  source_type: SourceType;
  canonical_url: string;
  content_fingerprint: string;
  raw_title: string;
  raw_snippet: string | null;
  clean_title: string | null;
  summary: string | null;
  realm_take: string | null;
  newsletter_snippet: string | null;
  linkedin_snippet: string | null;
  state: string | null; // 2-letter province/territory code
  region: CaRegion | null;
  county: string | null;
  category: string | null;
  subcategory: string | null;
  signal_type: SignalType | null;
  sale_date: string | null;
  date_found: string;
  expiry_date: string | null;
  published_at: string | null;
  price_text: string | null;
  price_value: number | null;
  currency: string | null;
  priority_score: number | null;
  confidence_score: number | null;
  target_audience: string[] | null;
  risk_flags: string[] | null;
  permission_level: 'public_link_only' | 'submitted' | 'partner_approved' | 'realm_owned';
  image_allowed: boolean;
  image_url: string | null;
  featured: boolean;
  primary_cta: string | null;
  secondary_cta: string | null;
  status: ListingStatus;
  duplicate_of: string | null;
  duplicate_status: DuplicateStatus;
  notes: string | null;
};

// 13 Canadian provinces + territories, ordered geographically (West → East, then North).
export const PHASE_1_STATES = ['BC', 'AB', 'SK', 'MB', 'ON', 'QC', 'NB', 'NS', 'PE', 'NL', 'YT', 'NT', 'NU'] as const;

export const CATEGORIES = [
  { slug: 'machinery', label: 'Machinery' },
  { slug: 'livestock', label: 'Livestock' },
  { slug: 'land_property', label: 'Land & Property' },
  { slug: 'farm_equipment', label: 'Farm Equipment' },
  { slug: 'vehicles_transport', label: 'Vehicles & Transport' },
  { slug: 'inputs_supplies', label: 'Inputs & Supplies' },
  { slug: 'farm_business_opportunities', label: 'Farm Business Opportunities' },
  { slug: 'realm_marketplace', label: 'REALM Marketplace Listings' },
  { slug: 'partner_listings', label: 'Partner Opportunities' },
] as const;

export const SOURCE_TYPES = [
  { slug: 'public_auction', label: 'Public auction' },
  { slug: 'dealer_listing', label: 'Dealer listing' },
  { slug: 'marketplace_listing', label: 'Marketplace listing' },
  { slug: 'realm_listing', label: 'REALM listing' },
  { slug: 'affiliate_member', label: 'Affiliate member listing' },
  { slug: 'partner_feature', label: 'Partner feature' },
] as const;

export const REGIONS = [
  { slug: 'prairies', label: 'Prairies' },
  { slug: 'central', label: 'Central' },
  { slug: 'atlantic', label: 'Atlantic' },
  { slug: 'west', label: 'West' },
  { slug: 'north', label: 'North' },
] as const;

export const STATE_NAMES: Record<string, string> = {
  BC: 'British Columbia',
  AB: 'Alberta',
  SK: 'Saskatchewan',
  MB: 'Manitoba',
  ON: 'Ontario',
  QC: 'Quebec',
  NB: 'New Brunswick',
  NS: 'Nova Scotia',
  PE: 'Prince Edward Island',
  NL: 'Newfoundland and Labrador',
  YT: 'Yukon',
  NT: 'Northwest Territories',
  NU: 'Nunavut',
};
