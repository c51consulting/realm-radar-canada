/**
 * Per-source URL-slug parsers.
 *
 * Sitemap polling discovers raw listing URLs only. These parsers turn a URL
 * into best-effort {title, state, category, subcategory} so the radar can
 * filter and route. AI enrichment refines this later — these are seeds.
 *
 * Rule: links + metadata only, never full descriptions, never images. We are
 * curating, not mirroring.
 */
import { normalizeState } from './states';

export type ParsedListing = {
  title: string;
  state: string | null; // 2-letter code
  category: string | null;
  subcategory: string | null;
};

// ---------- Phase 1 province/territory allow-list ----------
export const PHASE_1_STATES = new Set(['BC', 'AB', 'SK', 'MB', 'ON', 'QC', 'NB', 'NS', 'PE', 'NL', 'YT', 'NT', 'NU']);

// ---------- Phase 1 category allow-list ----------
// Maps free-text source categories → normalised radar category.
// Only ag-relevant tokens. Anything outside this map → category null → REJECTED
// unless the source row in the DB has a fallback category.
const CATEGORY_ALIASES: Record<string, string> = {
  // Machinery (powered ag implements)
  ag_tractor: 'machinery',
  tractor: 'machinery',
  tillage_equipment: 'machinery',
  planters_and_seeders: 'machinery',
  hay_equipment: 'machinery',
  harvesters: 'machinery',
  specialty_crop_harvester: 'machinery',
  grain_or_fertilizer_handling: 'machinery',
  row_cleaners: 'machinery',
  combines: 'machinery',
  sprayers: 'machinery',
  // Farm equipment (trailers, support, attachments, on-farm utility)
  ag_trailers: 'farm_equipment',
  trailers: 'farm_equipment',
  trucks: 'farm_equipment',
  pickups_and_vans: 'farm_equipment',
  atv_and_utility_vehicles: 'farm_equipment',
  generators_and_light_plants: 'farm_equipment',
  fuel_and_lube: 'farm_equipment',
  livestock_equipment: 'farm_equipment',
  // Livestock
  cattle: 'livestock',
  bulls: 'livestock',
  cows: 'livestock',
  heifers: 'livestock',
  calves: 'livestock',
  // Land
  farmland: 'land',
  land: 'land',
};

// If a URL slug contains any of these tokens, reject outright (construction,
// industrial, municipal — not ag). Checked case-insensitively against the
// raw slug before category resolution.
const NON_AG_REJECT_TOKENS = [
  'aerial_lifts',
  'rough_terrain_forklifts',
  'cushion_tire_or_pneumatic_forklift',
  'quarry_and_aggregate',
  'asphalt_and_paving_equipment',
  'road_safety_equip',
  'street_sweeper',
  'brooms_and_sweepers',
  'screening_plant',
  'compaction_equipment',
  'concrete_equipment',
  'crushing_equipment',
  'demolition_equipment',
  'drilling_equipment',
  'lifts_and_handling',
];

function slugContainsNonAg(slug: string): boolean {
  const low = slug.toLowerCase();
  return NON_AG_REJECT_TOKENS.some((t) => low.includes(t));
}

function normaliseCategoryToken(token: string): string {
  return token.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function mapCategory(rawCat: string | null): string | null {
  if (!rawCat) return null;
  const key = normaliseCategoryToken(rawCat);
  return CATEGORY_ALIASES[key] ?? null;
}

// ---------- Purplewave ----------
// Slug shape:
//   /auction/<auction_id>/item/<item_id>/<Year>-<Brand>-<Model>-<Category>-<Subcategory>-<State>
// Examples:
//   /auction/260610/item/EA4751/Trebro-Autostack-Harvesters-Specialty_Crop_Harvester-Wisconsin
//   /auction/260527/item/MX9100/R&R-Grain_or_Fertilizer_Handling-Auger_or_Conveyor-Kansas
//   /auction/260514/item/FB3354/1993-Stoughton-AVW-535T-S-C-Trailers-Dry_Van_Trailer-Missouri
//
// Heuristic: state is always the LAST hyphen-segment. Walk segments
// right-to-left to find first known category token. Anything left of that
// is the title (year + brand + model).
export function parsePurplewave(url: string): ParsedListing | null {
  try {
    const u = new URL(url);
    if (!u.hostname.endsWith('purplewave.com')) return null;
    const m = u.pathname.match(/^\/auction\/\d+\/item\/[A-Z0-9]+\/(.+)$/);
    if (!m) return null;
    // Decode + split on single hyphens; HTML-decode &amp; first
    const rawSlug = decodeURIComponent(m[1]).replace(/&amp;/g, '&');
    if (slugContainsNonAg(rawSlug)) return null;
    const segments = rawSlug.split('-').map((s) => s.trim()).filter(Boolean);
    if (segments.length < 3) return null;

    // State = last segment (may be multi-word joined by underscore, e.g. "South_Dakota")
    const stateRaw = segments[segments.length - 1].replace(/_/g, ' ');
    const state = normalizeState(stateRaw);

    // Walk right-to-left (skipping state) looking for a known category token.
    // Subcategory is the segment immediately to the LEFT of state when category found further left.
    let categoryIdx = -1;
    for (let i = segments.length - 2; i >= 0; i--) {
      const cat = mapCategory(segments[i]);
      if (cat) {
        categoryIdx = i;
        break;
      }
    }

    let category: string | null = null;
    let subcategory: string | null = null;
    let titleSegments: string[];

    if (categoryIdx >= 0) {
      category = mapCategory(segments[categoryIdx]);
      const subSegs = segments.slice(categoryIdx + 1, segments.length - 1);
      subcategory = subSegs.length ? subSegs.join(' ').replace(/_/g, ' ') : null;
      titleSegments = segments.slice(0, categoryIdx);
    } else {
      // No ag-relevant category token — REJECT. Avoids construction/industrial
      // leakage from Purplewave's broader inventory.
      return null;
    }

    let title = titleSegments.join(' ').replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
    // If no brand/year prefix, fall back to subcategory or category for title
    if (!title) {
      title = (subcategory || segments[categoryIdx]).replace(/_/g, ' ');
    }

    if (!title) return null;
    return { title, state, category, subcategory };
  } catch {
    return null;
  }
}

// ---------- Cattlerange ----------
// Slug shape:
//   /listings/<YYYY>/<MM>/<count>-<breed-words...>-<region>-<state2>/
// Examples:
//   /listings/2026/01/2-reg-akaushi-bulls-northeast-tx/
//   /listings/2024/10/45-angus-angus-cross-cows-northeast-tx/
//   /listings/2026/01/35-beefmaster-beefmaster-cross-rep-heifers-south-tx/
//
// State = last hyphen-segment (always 2-letter when valid).
// Region word ("northeast", "south", "central", "panhandle", "n", "ne", "se") precedes state — drop it.
// All remaining segments = title (count + breed + class).
const CR_REGION_WORDS = new Set([
  'northeast', 'northwest', 'southeast', 'southwest',
  'north', 'south', 'east', 'west', 'central',
  'panhandle', 'plains', 'midwest', 'n', 's', 'e', 'w',
  'ne', 'nw', 'se', 'sw',
]);

export function parseCattlerange(url: string): ParsedListing | null {
  try {
    const u = new URL(url);
    if (!u.hostname.endsWith('cattlerange.com')) return null;
    const m = u.pathname.match(/^\/listings\/\d{4}\/\d{2}\/([^/]+)\/?$/);
    if (!m) return null;
    const segs = m[1].split('-').map((s) => s.trim()).filter(Boolean);
    if (segs.length < 3) return null;

    const stateRaw = segs[segs.length - 1].toUpperCase();
    const state = stateRaw.length === 2 ? normalizeState(stateRaw) : null;
    if (!state) return null;

    // Strip trailing region word(s) before state
    let endIdx = segs.length - 1; // exclusive end of title segs
    while (endIdx > 0 && CR_REGION_WORDS.has(segs[endIdx - 1].toLowerCase())) {
      endIdx--;
    }
    if (endIdx < 1) return null;

    const titleSegs = segs.slice(0, endIdx);
    const title = titleSegs.join(' ').replace(/\s+/g, ' ').trim();
    if (!title) return null;

    // Everything on cattlerange is livestock; subcategory heuristic on title
    const titleLow = title.toLowerCase();
    let subcategory: string | null = null;
    if (titleLow.includes('bull')) subcategory = 'bulls';
    else if (titleLow.includes('heifer')) subcategory = 'heifers';
    else if (titleLow.includes('cow')) subcategory = 'cows';
    else if (titleLow.includes('calf') || titleLow.includes('calves')) subcategory = 'calves';
    else if (titleLow.includes('steer')) subcategory = 'steers';

    return { title, state, category: 'livestock', subcategory };
  } catch {
    return null;
  }
}

// ---------- Whitetail Properties ----------
// Rural land brokerage — hunting land, farmland, ranches.
// URL shape: /{type}/{state-name-slug}/{county-slug}/{listing-slug}
// Examples:
//   /hunting-land/illinois/adams/mostly-timber-tract-in-southeast-adams-county
//   /hunting-land/iowa/dallas/farm-and-recreation-tract
//   /farms-and-ranches/texas/medina/working-cattle-ranch-near-castroville
// State is the SECOND path segment (full lowercase name). County is the third.
const WTP_TYPE_TO_CATEGORY: Record<string, string> = {
  'hunting-land': 'land',
  'farms-and-ranches': 'land',
  'recreational-land': 'land',
  'timberland': 'land',
  'ranches': 'land',
  'farms': 'land',
  'undeveloped-land': 'land',
  'horse-property': 'land',
  'waterfront-property': 'land',
};

export function parseWhitetail(url: string): ParsedListing | null {
  try {
    const u = new URL(url);
    if (!u.hostname.endsWith('whitetailproperties.com')) return null;
    const parts = u.pathname.replace(/^\/+|\/+$/g, '').split('/');
    if (parts.length < 4) return null;

    const typeSlug = parts[0].toLowerCase();
    const category = WTP_TYPE_TO_CATEGORY[typeSlug];
    if (!category) return null;

    const stateRaw = parts[1].replace(/-/g, ' ');
    const state = normalizeState(stateRaw);
    if (!state) return null;

    const titleSlug = parts[3];
    const title = titleSlug.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
    if (!title) return null;

    return {
      title: title.replace(/\b\w/g, (m) => m.toUpperCase()),
      state,
      category,
      subcategory: typeSlug.replace(/-/g, ' '),
    };
  } catch {
    return null;
  }
}

// ---------- Schrader Auction (RSS) ----------
// Schrader publishes upcoming auctions via /index.rss. Each <item> has:
//   <title>FARM EQUIPMENT AUCTION IN ALLEN COUNTY, OHIO</title>
//   <link>https://www.schraderauction.com/auctions/9473</link>
//   <description>Tue, May 12, 11:00 AM - 1895 N Defiance Trail, ... Ohio</description>
// State is the LAST word in the title (full state name).
// Category from keywords in the title.
export function parseSchraderRss(
  url: string,
  extras?: { title?: string; description?: string },
): ParsedListing | null {
  try {
    const u = new URL(url);
    if (!u.hostname.endsWith('schraderauction.com')) return null;
    const title = (extras?.title || '').trim();
    if (!title) return null;

    // Title ends with `... COUNTY, <STATE NAME>` — capture state after last comma.
    const commaIdx = title.lastIndexOf(',');
    if (commaIdx < 0) return null;
    const stateRaw = title.slice(commaIdx + 1).trim();
    const state = normalizeState(stateRaw);
    if (!state) return null;

    const lower = title.toLowerCase();
    let category: string | null = null;
    let subcategory: string | null = null;
    if (lower.includes('farm equipment') || lower.includes('machinery') || lower.includes('combine') || lower.includes('tractor')) {
      category = 'farm_equipment';
      subcategory = 'farm equipment auction';
    } else if (lower.includes('livestock') || lower.includes('cattle') || lower.includes('cow')) {
      category = 'livestock';
      subcategory = 'livestock auction';
    } else if (lower.includes('land') || lower.includes('acre') || lower.includes('real estate') || lower.includes('tract') || lower.includes('farm')) {
      category = 'land';
      subcategory = 'land auction';
    } else if (lower.includes('personal property') || lower.includes('estate')) {
      // Personal-property estate auctions — often mixed ag implements; default to farm_equipment
      category = 'farm_equipment';
      subcategory = 'estate auction';
    } else {
      return null;
    }

    return { title, state, category, subcategory };
  } catch {
    return null;
  }
}

// ---------- Canadian Ag Publisher RSS ----------
// Generic parser for Canadian agricultural publisher RSS feeds (Manitoba
// Co-operator, Farmtario, Canadian Cattlemen, RealAgriculture, Country Guide,
// Grainews, Canola Council, Cattle.ca, Farms.com).
//
// These are news/editorial feeds, not auction listings — but they're the most
// reliable signal of what's moving in Canadian ag (prices, trade, weather,
// livestock health, machinery launches). We surface them as `market_movement`
// signals in the radar.
//
// Strategy:
//   - Province: scan title + RSS categories + URL slug for province name or
//     2-letter code. Fall back to the publisher's home province if obvious
//     (Manitoba Co-op → MB, Farmtario → ON, Alberta Farmer → AB) — handled
//     via the `home_state` field on the sources row.
//   - Category: scan RSS <category> tags first (they're explicit), then title
//     keywords. Map to our 4 canonical categories.
//   - Reject items with no resolvable province AND no home_state fallback —
//     prevents pan-Canadian news from polluting province filters.
// Full province names — always safe to match anywhere.
const CA_PROVINCE_FULL: Record<string, string> = {
  'british columbia': 'BC',
  'alberta': 'AB',
  'saskatchewan': 'SK',
  'manitoba': 'MB',
  'ontario': 'ON',
  'quebec': 'QC',
  'québec': 'QC',
  'new brunswick': 'NB',
  'nova scotia': 'NS',
  'prince edward island': 'PE',
  'newfoundland and labrador': 'NL',
  'newfoundland': 'NL',
  'yukon': 'YT',
  'northwest territories': 'NT',
  'nunavut': 'NU',
};

// 2-letter codes — only match when UPPERCASE (preserves the original case).
// This avoids "on", "in", "of" etc. matching as provinces. We check the
// original-case text for these.
const CA_PROVINCE_CODES: Record<string, string> = {
  'BC': 'BC', 'AB': 'AB', 'SK': 'SK', 'MB': 'MB', 'ON': 'ON',
  'QC': 'QC', 'NB': 'NB', 'NS': 'NS', 'PE': 'PE', 'NL': 'NL',
  'YT': 'YT', 'NT': 'NT', 'NU': 'NU', 'PEI': 'PE',
};

function detectCaProvince(text: string): string | null {
  if (!text) return null;
  // Pass 1 — full name (case-insensitive), longest first
  const low = text.toLowerCase();
  const sortedFull = Object.keys(CA_PROVINCE_FULL).sort((a, b) => b.length - a.length);
  for (const name of sortedFull) {
    const re = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (re.test(low)) return CA_PROVINCE_FULL[name];
  }
  // Pass 2 — uppercase 2/3-letter codes only (case-sensitive)
  for (const code of Object.keys(CA_PROVINCE_CODES)) {
    const re = new RegExp(`\\b${code}\\b`);
    if (re.test(text)) return CA_PROVINCE_CODES[code];
  }
  return null;
}

function categorizeCaItem(title: string, rssCategories: string[]): { category: string | null; subcategory: string | null } {
  const haystack = (title + ' ' + rssCategories.join(' ')).toLowerCase();

  // Livestock
  if (/\b(cattle|beef|cow|bull|heifer|calf|calves|steer|dairy|hog|pork|pig|sheep|lamb|goat|poultry|chicken|broiler|layer)\b/.test(haystack)) {
    let sub: string | null = null;
    if (/\bbeef|cattle|bull|heifer|cow\b/.test(haystack)) sub = 'cattle';
    else if (/\bdairy\b/.test(haystack)) sub = 'dairy';
    else if (/\bhog|pork|pig\b/.test(haystack)) sub = 'pork';
    else if (/\bpoultry|chicken|broiler|egg\b/.test(haystack)) sub = 'poultry';
    else if (/\bsheep|lamb|goat\b/.test(haystack)) sub = 'sheep and goats';
    return { category: 'livestock', subcategory: sub };
  }

  // Machinery — powered ag implements
  if (/\b(tractor|combine|harvester|sprayer|seeder|planter|tillage|baler|swather|implement|machinery|equipment launch)\b/.test(haystack)) {
    let sub: string | null = null;
    if (/\btractor\b/.test(haystack)) sub = 'tractor';
    else if (/\bcombine|harvester\b/.test(haystack)) sub = 'combine';
    else if (/\bsprayer\b/.test(haystack)) sub = 'sprayer';
    else if (/\bbaler\b/.test(haystack)) sub = 'baler';
    return { category: 'machinery', subcategory: sub };
  }

  // Land
  if (/\b(farmland|farm land|land sale|land prices?|land values?|acres? for sale|ranch for sale|real estate|agland)\b/.test(haystack)) {
    return { category: 'land', subcategory: 'farmland' };
  }

  // Farm equipment — trailers, grain bins, handling, etc.
  if (/\b(trailer|grain bin|grain handling|auger|conveyor|fertilizer spreader|grain dryer|livestock equipment|fencing)\b/.test(haystack)) {
    return { category: 'farm_equipment', subcategory: null };
  }

  // Crops / grain news → treat as machinery-adjacent market news under farm_equipment
  // (we surface as opportunity/market signal, not a listing of equipment)
  if (/\b(canola|wheat|barley|oats|corn|soybean|pulse|lentil|chickpea|grain prices?|crop|harvest|seeding|fertilizer|pesticide|herbicide|weed|spray)\b/.test(haystack)) {
    return { category: 'farm_equipment', subcategory: 'crop news' };
  }

  return { category: null, subcategory: null };
}

export function parseCanadianAgRss(
  url: string,
  extras?: { title?: string; description?: string; categories?: string[]; homeState?: string | null; defaultCategory?: string | null },
): ParsedListing | null {
  const title = (extras?.title || '').trim();
  if (!title || !url) return null;

  const categories = Array.isArray(extras?.categories) ? extras!.categories : [];
  const hayParts = [title, extras?.description || '', categories.join(' '), url];
  let state: string | null = null;
  for (const part of hayParts) {
    state = detectCaProvince(part);
    if (state) break;
  }
  if (!state && extras?.homeState) state = extras.homeState;
  if (!state) return null;
  if (!PHASE_1_STATES.has(state)) return null;

  const { category: detectedCat, subcategory } = categorizeCaItem(title, categories);
  const category = detectedCat ?? extras?.defaultCategory ?? null;
  if (!category) return null;

  return { title, state, category, subcategory };
}

// ---------- Dispatcher ----------
export type ParserName =
  | 'purplewave'
  | 'cattlerange'
  | 'whitetail'
  | 'schrader_rss'
  | 'canadian_ag_rss';

export function parseByName(
  name: ParserName,
  url: string,
  extras?: { title?: string; description?: string; categories?: string[]; homeState?: string | null; defaultCategory?: string | null },
): ParsedListing | null {
  switch (name) {
    case 'purplewave':
      return parsePurplewave(url);
    case 'cattlerange':
      return parseCattlerange(url);
    case 'whitetail':
      return parseWhitetail(url);
    case 'schrader_rss':
      return parseSchraderRss(url, extras);
    case 'canadian_ag_rss':
      return parseCanadianAgRss(url, extras);
    default:
      return null;
  }
}
