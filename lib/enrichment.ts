import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

function getClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export const EnrichmentSchema = z.object({
  clean_title: z.string(),
  state: z.string(),
  region: z.enum(['midwest','plains','south','west','northeast','southeast','mountain','unknown']),
  category: z.enum([
    'machinery','livestock','land_property','farm_equipment',
    'vehicles_transport','inputs_supplies','farm_business_opportunities',
    'realm_marketplace','partner_listings','unknown'
  ]),
  subcategory: z.string(),
  source_type: z.enum([
    'public_auction','dealer_listing','marketplace_listing',
    'realm_listing','affiliate_member','partner_feature','submission'
  ]),
  signal_type: z.enum([
    'opportunity','market_movement','partner_lead','finance_trigger','none'
  ]).describe("opportunity = something a buyer should act on; market_movement = pricing/trend signal; partner_lead = could become a REALM partner; finance_trigger = financing relevant"),
  sale_date: z.string().describe('ISO date YYYY-MM-DD, or empty string if unknown'),
  summary: z.string().max(400),
  realm_take: z.string().max(300),
  priority_score: z.number().int().min(0).max(100),
  confidence_score: z.number().int().min(0).max(100),
  target_audience: z.array(z.string()),
  primary_cta: z.enum(['view_source','list_with_realm','request_finance','submit_listing','explore_realm360']),
  secondary_cta: z.enum(['explore_realm360','become_partner','join_alerts','none']),
  risk_flags: z.array(z.string()),
  duplicate_likelihood: z.enum(['unique','possible_duplicate','duplicate']),
  newsletter_snippet: z.string().max(280),
  linkedin_snippet: z.string().max(280),
});

// Map source_type → permission_level + image_allowed default.
// REALM-owned / partner / affiliate content = we have permission to show images.
// Everything else = link-only curation.
export function permissionDefaults(sourceType: string): {
  permission_level: 'public_link_only' | 'submitted' | 'partner_approved' | 'realm_owned';
  image_allowed: boolean;
} {
  switch (sourceType) {
    case 'realm_listing':
      return { permission_level: 'realm_owned', image_allowed: true };
    case 'partner_feature':
      return { permission_level: 'partner_approved', image_allowed: true };
    case 'affiliate_member':
      return { permission_level: 'partner_approved', image_allowed: true };
    case 'submission':
      return { permission_level: 'submitted', image_allowed: false };
    default:
      // public_auction, dealer_listing, marketplace_listing
      return { permission_level: 'public_link_only', image_allowed: false };
  }
}

export type Enrichment = z.infer<typeof EnrichmentSchema>;

const SYSTEM_PROMPT = `You are the REALM Radar Canada listing analyst.

Your job is to classify and summarise public agricultural auction, listing and market activity for farmers, ranchers, dealers and agricultural partners.

Use only the provided source title, snippet, URL and metadata. Do not invent details. If a field is unknown, return "Unknown" or an empty string for dates.

Do not copy the source wording except for factual names, dates and locations. Write original commentary.

Do not claim REALM owns, manages, verifies or endorses the listing unless source_type is "realm_listing" or "partner_feature".

For risk_flags, include any of: "missing_date", "missing_location", "off_topic", "promotional", "paywall", "login_required", "copyrighted_content", "potentially_invented_data".

REALM Take should be a short editorial line explaining why this is worth watching. Avoid superlatives like "best deal" or "guaranteed".

Signal type guidance:
- opportunity — a buyer/dealer should act (auction lot, dispersal, retirement sale)
- market_movement — indicates a pricing or supply trend
- partner_lead — source could become a REALM partner (regional dealer/auction house with steady volume)
- finance_trigger — finance, leasing, or refinance angle is the main story
- none — fits no category cleanly

Priority score weights:
- Clear ag relevance: 20
- Strong state/location: 10
- Clear date/time sensitivity: 10
- Machinery/livestock/land relevance: 20
- Commercial opportunity: 15
- Partner/affiliate potential: 10
- Finance/transport relevance: 10
- Source trust: 5`;

export async function enrichListing(input: {
  title: string;
  snippet?: string | null;
  url: string;
  source_name: string;
  found_date?: string;
}): Promise<Enrichment> {
  const userPrompt = `Title: ${input.title}
Snippet: ${input.snippet || '(none)'}
URL: ${input.url}
Source Name: ${input.source_name}
Found Date: ${input.found_date || new Date().toISOString()}`;

  const completion = await getClient().beta.chat.completions.parse({
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    response_format: zodResponseFormat(EnrichmentSchema, 'enrichment'),
    temperature: 0.3,
  });

  const parsed = completion.choices[0].message.parsed;
  if (!parsed) throw new Error('OpenAI returned no parsed enrichment');
  return parsed;
}

/** Decide auto-publish status based on AI output. */
export function decideStatus(
  e: Enrichment
): 'human_approved' | 'ai_reviewed' | 'archived' {
  if (e.risk_flags.length > 0) return 'ai_reviewed'; // always human-review if flagged
  if (e.priority_score >= 80 && e.confidence_score >= 85) return 'human_approved';
  if (e.priority_score >= 60) return 'ai_reviewed';
  return 'archived';
}
