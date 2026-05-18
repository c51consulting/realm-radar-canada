/**
 * REALM Radar Network OPML bundle.
 *
 * Served identically on every radar so any /syndicate/realm.opml URL imports the
 * full network in one click. OPML 2.0 spec: http://opml.org/spec2.opml
 */
export const runtime = 'edge';
export const revalidate = 3600;

const NOW = new Date().toUTCString();

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

type Feed = { title: string; xmlUrl: string; htmlUrl: string };
type Radar = { title: string; htmlUrl: string; feeds: Feed[] };

const RADARS: Radar[] = [
  {
    title: 'REALM Radar Canada',
    htmlUrl: 'https://realm-radar-canada.vercel.app/radar',
    feeds: [
      { title: 'Canada · All listings', xmlUrl: 'https://realm-radar-canada.vercel.app/feeds/all.xml', htmlUrl: 'https://realm-radar-canada.vercel.app/radar' },
      { title: 'Canada · Livestock', xmlUrl: 'https://realm-radar-canada.vercel.app/feeds/category/livestock.xml', htmlUrl: 'https://realm-radar-canada.vercel.app/radar/livestock' },
      { title: 'Canada · Machinery', xmlUrl: 'https://realm-radar-canada.vercel.app/feeds/category/machinery.xml', htmlUrl: 'https://realm-radar-canada.vercel.app/radar/machinery' },
      { title: 'Canada · Farm equipment', xmlUrl: 'https://realm-radar-canada.vercel.app/feeds/category/farm_equipment.xml', htmlUrl: 'https://realm-radar-canada.vercel.app/radar/farm_equipment' },
      { title: 'Canada · Vehicles & transport', xmlUrl: 'https://realm-radar-canada.vercel.app/feeds/category/vehicles_transport.xml', htmlUrl: 'https://realm-radar-canada.vercel.app/radar/vehicles_transport' },
      { title: 'Canada · Land & property', xmlUrl: 'https://realm-radar-canada.vercel.app/feeds/category/land_property.xml', htmlUrl: 'https://realm-radar-canada.vercel.app/radar/land_property' },
      { title: 'Canada · Inputs & supplies', xmlUrl: 'https://realm-radar-canada.vercel.app/feeds/category/inputs_supplies.xml', htmlUrl: 'https://realm-radar-canada.vercel.app/radar/inputs_supplies' },
      { title: 'Canada · Alberta', xmlUrl: 'https://realm-radar-canada.vercel.app/feeds/state/alberta.xml', htmlUrl: 'https://realm-radar-canada.vercel.app/radar?state=AB' },
      { title: 'Canada · British Columbia', xmlUrl: 'https://realm-radar-canada.vercel.app/feeds/state/british-columbia.xml', htmlUrl: 'https://realm-radar-canada.vercel.app/radar?state=BC' },
      { title: 'Canada · Saskatchewan', xmlUrl: 'https://realm-radar-canada.vercel.app/feeds/state/saskatchewan.xml', htmlUrl: 'https://realm-radar-canada.vercel.app/radar?state=SK' },
      { title: 'Canada · Manitoba', xmlUrl: 'https://realm-radar-canada.vercel.app/feeds/state/manitoba.xml', htmlUrl: 'https://realm-radar-canada.vercel.app/radar?state=MB' },
      { title: 'Canada · Ontario', xmlUrl: 'https://realm-radar-canada.vercel.app/feeds/state/ontario.xml', htmlUrl: 'https://realm-radar-canada.vercel.app/radar?state=ON' },
      { title: 'Canada · Quebec', xmlUrl: 'https://realm-radar-canada.vercel.app/feeds/state/quebec.xml', htmlUrl: 'https://realm-radar-canada.vercel.app/radar?state=QC' },
      { title: 'Canada · Nova Scotia', xmlUrl: 'https://realm-radar-canada.vercel.app/feeds/state/nova-scotia.xml', htmlUrl: 'https://realm-radar-canada.vercel.app/radar?state=NS' },
      { title: 'Canada · New Brunswick', xmlUrl: 'https://realm-radar-canada.vercel.app/feeds/state/new-brunswick.xml', htmlUrl: 'https://realm-radar-canada.vercel.app/radar?state=NB' },
      { title: 'Canada · Prince Edward Island', xmlUrl: 'https://realm-radar-canada.vercel.app/feeds/state/prince-edward-island.xml', htmlUrl: 'https://realm-radar-canada.vercel.app/radar?state=PE' },
      { title: 'Canada · Newfoundland and Labrador', xmlUrl: 'https://realm-radar-canada.vercel.app/feeds/state/newfoundland-and-labrador.xml', htmlUrl: 'https://realm-radar-canada.vercel.app/radar?state=NL' },
    ],
  },
  {
    title: 'REALM Radar USA',
    htmlUrl: 'https://realm-radar-usa.vercel.app/radar',
    feeds: [
      { title: 'USA · All listings', xmlUrl: 'https://realm-radar-usa.vercel.app/feeds/all.xml', htmlUrl: 'https://realm-radar-usa.vercel.app/radar' },
      { title: 'USA · Livestock', xmlUrl: 'https://realm-radar-usa.vercel.app/feeds/category/livestock.xml', htmlUrl: 'https://realm-radar-usa.vercel.app/radar/livestock' },
      { title: 'USA · Machinery', xmlUrl: 'https://realm-radar-usa.vercel.app/feeds/category/machinery.xml', htmlUrl: 'https://realm-radar-usa.vercel.app/radar/machinery' },
      { title: 'USA · Land & property', xmlUrl: 'https://realm-radar-usa.vercel.app/feeds/category/land_property.xml', htmlUrl: 'https://realm-radar-usa.vercel.app/radar/land_property' },
    ],
  },
  {
    title: 'REALM Radar Uganda',
    htmlUrl: 'https://realm-radar-uganda.vercel.app/radar',
    feeds: [
      { title: 'Uganda · All listings', xmlUrl: 'https://realm-radar-uganda.vercel.app/feeds/all.xml', htmlUrl: 'https://realm-radar-uganda.vercel.app/radar' },
      { title: 'Uganda · Coffee', xmlUrl: 'https://realm-radar-uganda.vercel.app/feeds/category/coffee.xml', htmlUrl: 'https://realm-radar-uganda.vercel.app/radar/coffee' },
      { title: 'Uganda · Livestock', xmlUrl: 'https://realm-radar-uganda.vercel.app/feeds/category/livestock.xml', htmlUrl: 'https://realm-radar-uganda.vercel.app/radar/livestock' },
      { title: 'Uganda · Equipment', xmlUrl: 'https://realm-radar-uganda.vercel.app/feeds/category/equipment.xml', htmlUrl: 'https://realm-radar-uganda.vercel.app/radar/equipment' },
      { title: 'Uganda · Marketplace', xmlUrl: 'https://realm-radar-uganda.vercel.app/feeds/category/marketplace.xml', htmlUrl: 'https://realm-radar-uganda.vercel.app/radar/marketplace' },
    ],
  },
  {
    title: 'REALM Radar India',
    htmlUrl: 'https://realm-radar-india.vercel.app/radar',
    feeds: [
      { title: 'India · All listings', xmlUrl: 'https://realm-radar-india.vercel.app/feeds/all.xml', htmlUrl: 'https://realm-radar-india.vercel.app/radar' },
      { title: 'India · Equipment', xmlUrl: 'https://realm-radar-india.vercel.app/feeds/category/equipment.xml', htmlUrl: 'https://realm-radar-india.vercel.app/radar/equipment' },
      { title: 'India · Marketplace', xmlUrl: 'https://realm-radar-india.vercel.app/feeds/category/marketplace.xml', htmlUrl: 'https://realm-radar-india.vercel.app/radar/marketplace' },
    ],
  },
  {
    title: 'REALM Jobs Radar',
    htmlUrl: 'https://realm-jobs-radar.vercel.app/',
    feeds: [
      { title: 'Jobs · All listings (global)', xmlUrl: 'https://realm-jobs-radar.vercel.app/feeds/all.xml', htmlUrl: 'https://realm-jobs-radar.vercel.app/jobs' },
      { title: 'Jobs · Canada', xmlUrl: 'https://realm-jobs-radar.vercel.app/feeds/country/canada.xml', htmlUrl: 'https://realm-jobs-radar.vercel.app/jobs/canada' },
      { title: 'Jobs · USA', xmlUrl: 'https://realm-jobs-radar.vercel.app/feeds/country/usa.xml', htmlUrl: 'https://realm-jobs-radar.vercel.app/jobs/usa' },
      { title: 'Jobs · Australia', xmlUrl: 'https://realm-jobs-radar.vercel.app/feeds/country/australia.xml', htmlUrl: 'https://realm-jobs-radar.vercel.app/jobs/australia' },
      { title: 'Jobs · Farm jobs (global)', xmlUrl: 'https://realm-jobs-radar.vercel.app/feeds/role/farm-jobs.xml', htmlUrl: 'https://realm-jobs-radar.vercel.app/jobs/farm-jobs' },
    ],
  },
  {
    title: 'REALM Experiences Radar',
    htmlUrl: 'https://realm-experiences-radar.vercel.app/',
    feeds: [
      { title: 'Experiences · All listings', xmlUrl: 'https://realm-experiences-radar.vercel.app/feeds/all.xml', htmlUrl: 'https://realm-experiences-radar.vercel.app/' },
    ],
  },
];

function buildOpml(): string {
  const head = `  <head>
    <title>REALM Radar Network — full subscription bundle</title>
    <dateCreated>${NOW}</dateCreated>
    <ownerName>REALM Group Global</ownerName>
    <ownerEmail>partners@realmgroup.global</ownerEmail>
    <docs>http://opml.org/spec2.opml</docs>
  </head>`;

  const radarBlocks = RADARS.map((radar) => {
    const items = radar.feeds
      .map(
        (f) =>
          `      <outline type="rss" text="${esc(f.title)}" title="${esc(f.title)}" xmlUrl="${esc(f.xmlUrl)}" htmlUrl="${esc(f.htmlUrl)}" />`
      )
      .join('\n');
    return `    <outline text="${esc(radar.title)}" title="${esc(radar.title)}" htmlUrl="${esc(radar.htmlUrl)}">\n${items}\n    </outline>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
${head}
  <body>
    <outline text="REALM Radar Network" title="REALM Radar Network">
${radarBlocks}
    </outline>
  </body>
</opml>
`;
}

export async function GET() {
  return new Response(buildOpml(), {
    status: 200,
    headers: {
      'Content-Type': 'text/x-opml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      'Content-Disposition': 'inline; filename="realm-radar-network.opml"',
    },
  });
}
