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

export type UsRegion =
  | 'midwest' | 'plains' | 'south' | 'west' | 'northeast' | 'southeast' | 'mountain';

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
  state: string | null;
  region: UsRegion | null;
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

export const PHASE_1_STATES = ['WI', 'IA', 'IL', 'MN', 'NE', 'KS', 'TX', 'OK'] as const;

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
  { slug: 'midwest', label: 'Midwest' },
  { slug: 'plains', label: 'Plains' },
  { slug: 'south', label: 'South' },
  { slug: 'southeast', label: 'Southeast' },
  { slug: 'west', label: 'West' },
  { slug: 'mountain', label: 'Mountain' },
  { slug: 'northeast', label: 'Northeast' },
] as const;

export const STATE_NAMES: Record<string, string> = {
  WI: 'Wisconsin', IA: 'Iowa', IL: 'Illinois', MN: 'Minnesota',
  NE: 'Nebraska', KS: 'Kansas', TX: 'Texas', OK: 'Oklahoma',
  ND: 'North Dakota', SD: 'South Dakota', MO: 'Missouri', IN: 'Indiana',
  OH: 'Ohio', MI: 'Michigan', CO: 'Colorado', MT: 'Montana',
};
