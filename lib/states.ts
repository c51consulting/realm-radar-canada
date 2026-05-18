/**
 * Canadian province/territory normalizer.
 * Convert any input (full name, 2-letter code, mixed case, French) to a canonical 2-letter code, or null.
 *
 * Codes follow Canada Post abbreviations:
 *   AB Alberta · BC British Columbia · MB Manitoba · NB New Brunswick
 *   NL Newfoundland and Labrador · NS Nova Scotia · ON Ontario
 *   PE Prince Edward Island · QC Quebec · SK Saskatchewan
 *   YT Yukon · NT Northwest Territories · NU Nunavut
 */

const FULL_TO_CODE: Record<string, string> = {
  // Provinces (English)
  ALBERTA: 'AB',
  'BRITISH COLUMBIA': 'BC',
  MANITOBA: 'MB',
  'NEW BRUNSWICK': 'NB',
  'NEWFOUNDLAND AND LABRADOR': 'NL',
  NEWFOUNDLAND: 'NL',
  LABRADOR: 'NL',
  'NOVA SCOTIA': 'NS',
  ONTARIO: 'ON',
  'PRINCE EDWARD ISLAND': 'PE',
  PEI: 'PE',
  QUEBEC: 'QC',
  SASKATCHEWAN: 'SK',
  // Territories
  YUKON: 'YT',
  'NORTHWEST TERRITORIES': 'NT',
  NUNAVUT: 'NU',
  // French equivalents
  'COLOMBIE-BRITANNIQUE': 'BC',
  'NOUVEAU-BRUNSWICK': 'NB',
  'TERRE-NEUVE-ET-LABRADOR': 'NL',
  'TERRE-NEUVE': 'NL',
  'NOUVELLE-ECOSSE': 'NS',
  'NOUVELLE-ÉCOSSE': 'NS',
  'ÎLE-DU-PRINCE-ÉDOUARD': 'PE',
  'ILE-DU-PRINCE-EDOUARD': 'PE',
  'QUÉBEC': 'QC',
  'TERRITOIRES DU NORD-OUEST': 'NT',
};

const VALID_CODES = new Set(Object.values(FULL_TO_CODE));

export function normalizeState(input: string | null | undefined): string | null {
  if (!input) return null;
  const raw = input.trim();
  if (!raw) return null;
  if (raw.toLowerCase() === 'unknown') return null;

  const upper = raw.toUpperCase();

  // Already a valid 2-letter code
  if (upper.length === 2 && VALID_CODES.has(upper)) return upper;

  // Full name lookup
  if (FULL_TO_CODE[upper]) return FULL_TO_CODE[upper];

  // Try removing punctuation/extra spaces
  const cleaned = upper.replace(/[^A-Z ]/g, '').replace(/\s+/g, ' ').trim();
  if (FULL_TO_CODE[cleaned]) return FULL_TO_CODE[cleaned];

  return null;
}

/** All 13 Canadian provinces and territories, ordered geographically (West to East, then North). */
export const CANADIAN_PROVINCES = [
  { code: 'BC', name: 'British Columbia', nameFr: 'Colombie-Britannique', slug: 'british-columbia' },
  { code: 'AB', name: 'Alberta', nameFr: 'Alberta', slug: 'alberta' },
  { code: 'SK', name: 'Saskatchewan', nameFr: 'Saskatchewan', slug: 'saskatchewan' },
  { code: 'MB', name: 'Manitoba', nameFr: 'Manitoba', slug: 'manitoba' },
  { code: 'ON', name: 'Ontario', nameFr: 'Ontario', slug: 'ontario' },
  { code: 'QC', name: 'Quebec', nameFr: 'Québec', slug: 'quebec' },
  { code: 'NB', name: 'New Brunswick', nameFr: 'Nouveau-Brunswick', slug: 'new-brunswick' },
  { code: 'NS', name: 'Nova Scotia', nameFr: 'Nouvelle-Écosse', slug: 'nova-scotia' },
  { code: 'PE', name: 'Prince Edward Island', nameFr: 'Île-du-Prince-Édouard', slug: 'prince-edward-island' },
  { code: 'NL', name: 'Newfoundland and Labrador', nameFr: 'Terre-Neuve-et-Labrador', slug: 'newfoundland-and-labrador' },
  { code: 'YT', name: 'Yukon', nameFr: 'Yukon', slug: 'yukon' },
  { code: 'NT', name: 'Northwest Territories', nameFr: 'Territoires du Nord-Ouest', slug: 'northwest-territories' },
  { code: 'NU', name: 'Nunavut', nameFr: 'Nunavut', slug: 'nunavut' },
] as const;

export const CODE_TO_NAME: Record<string, string> = Object.fromEntries(
  CANADIAN_PROVINCES.map((p) => [p.code, p.name])
);

export const CODE_TO_NAME_FR: Record<string, string> = Object.fromEntries(
  CANADIAN_PROVINCES.map((p) => [p.code, p.nameFr])
);

export const SLUG_TO_CODE: Record<string, string> = Object.fromEntries(
  CANADIAN_PROVINCES.map((p) => [p.slug, p.code])
);
