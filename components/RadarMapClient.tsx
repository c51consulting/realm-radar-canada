'use client';

import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Listing } from '@/lib/types';
import { getStateCentroid, MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM } from '@/lib/state-centroids';
import { buildListingSlug } from '@/lib/listing-slug';

// Fix Leaflet's default icon path issue under Next.js bundling.
// We use a simple div icon instead of the PNG sprite.
const realmIcon = L.divIcon({
  className: 'realm-map-marker',
  html: '<div style="width:14px;height:14px;border-radius:50%;background:#C8A24A;border:2px solid #fdfaf2;box-shadow:0 0 0 1px rgba(20,38,32,.6),0 1px 4px rgba(0,0,0,.3);"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -8],
});

const featuredIcon = L.divIcon({
  className: 'realm-map-marker realm-map-marker-featured',
  html: '<div style="width:16px;height:16px;border-radius:50%;background:#1b4332;border:2px solid #C8A24A;box-shadow:0 0 0 1px rgba(20,38,32,.6),0 1px 4px rgba(0,0,0,.3);"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10],
});

type MarkerPoint = {
  id: string;
  title: string;
  slug: string;
  state: string | null;
  price: string | null;
  category: string | null;
  featured: boolean;
  lat: number;
  lng: number;
};

function jitter(seed: string): number {
  // Deterministic small offset (~0.3 deg) so multiple listings in the same
  // state don't pile on top of each other.
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return ((h % 1000) / 1000 - 0.5) * 0.6;
}

function FitToMarkers({ points }: { points: MarkerPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 7 });
  }, [points, map]);
  return null;
}

export default function RadarMapClient({ listings }: { listings: Listing[] }) {
  const points: MarkerPoint[] = useMemo(() => {
    const out: MarkerPoint[] = [];
    for (const l of listings) {
      const centroid = getStateCentroid(l.state);
      if (!centroid) continue;
      const lat = centroid.lat + jitter(l.id + '-lat');
      const lng = centroid.lng + jitter(l.id + '-lng');
      out.push({
        id: l.id,
        title: l.clean_title || l.raw_title || 'Untitled',
        slug: buildListingSlug(l),
        state: l.state,
        price: l.price_text || (l.price_value ? `$${l.price_value.toLocaleString()}` : null),
        category: l.category,
        featured: Boolean(l.featured),
        lat,
        lng,
      });
    }
    return out;
  }, [listings]);

  return (
    <div className="relative h-[500px] w-full overflow-hidden rounded-2xl border border-realm-line bg-realm-paper shadow-card">
      <MapContainer
        center={MAP_DEFAULT_CENTER}
        zoom={MAP_DEFAULT_ZOOM}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitToMarkers points={points} />
        {points.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={p.featured ? featuredIcon : realmIcon}>
            <Popup>
              <div style={{ minWidth: 200, fontFamily: 'inherit' }}>
                <a
                  href={`/radar/listing/${p.slug}`}
                  style={{
                    color: '#1b4332',
                    fontWeight: 600,
                    fontSize: 14,
                    lineHeight: 1.3,
                    textDecoration: 'none',
                    display: 'block',
                  }}
                >
                  {p.title}
                </a>
                <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>
                  {[p.state, p.category, p.price].filter(Boolean).join(' · ')}
                </div>
                <a
                  href={`/radar/listing/${p.slug}`}
                  style={{
                    display: 'inline-block',
                    marginTop: 8,
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    color: '#C8A24A',
                    textDecoration: 'none',
                  }}
                >
                  View details →
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      {points.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-realm-paper/95">
          <p className="text-sm text-realm-charcoal/70">No mapped listings for the current filter.</p>
        </div>
      )}
    </div>
  );
}
