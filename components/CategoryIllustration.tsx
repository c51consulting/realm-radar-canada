/**
 * On-brand SVG illustrations used in place of third-party listing images.
 * REALM Radar policy: we do not copy source-platform images. Each category
 * gets a deep-green panel with gold linework — a recognisable but original
 * placeholder that keeps the marketplace feel without violating attribution.
 *
 * Categories with a real editorial photograph in /public/cards/<key>.png
 * render that image instead of the SVG. The SVG remains as the fallback.
 */
import Image from 'next/image';

type Props = { category?: string | null; className?: string };

// Real imagery available for these category keys.
const REAL_IMAGES: Record<string, { src: string; alt: string }> = {
  livestock: { src: '/cards/livestock.png', alt: 'Cattle grazing at golden hour' },
  vehicles_transport: { src: '/cards/vehicles_transport.png', alt: 'Pickup truck and livestock trailer' },
  machinery: { src: '/cards/machinery.png', alt: 'Tractor working a field at sunset' },
  farm_equipment: { src: '/cards/farm_equipment.png', alt: 'Farm implements lined up outside a barn' },
  land_property: { src: '/cards/land_property.png', alt: 'Canadian farmland aerial view' },
  inputs_supplies: { src: '/cards/inputs_supplies.png', alt: 'Stacked sacks of farm inputs in a warehouse' },
};

export function CategoryIllustration({ category, className }: Props) {
  const key = (category || '').toLowerCase();
  const cls = `w-full h-full ${className || ''}`;

  const real = REAL_IMAGES[key];
  if (real) {
    return (
      <Image
        src={real.src}
        alt={real.alt}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
        className={`object-cover ${className || ''}`}
      />
    );
  }

  const common = (
    <>
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1a4d2e" />
          <stop offset="100%" stopColor="#2E7D32" />
        </linearGradient>
        <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c8a84b" />
          <stop offset="100%" stopColor="#e8c96a" />
        </linearGradient>
      </defs>
      <rect width="400" height="225" fill="url(#bg)" />
      {/* horizon line */}
      <line x1="0" y1="160" x2="400" y2="160" stroke="#FAF7F2" strokeWidth="0.6" opacity="0.18" />
    </>
  );

  if (key === 'machinery' || key === 'farm_equipment' || key === 'vehicles_transport') {
    // Tractor silhouette
    return (
      <svg viewBox="0 0 400 225" xmlns="http://www.w3.org/2000/svg" className={cls} preserveAspectRatio="xMidYMid slice">
        {common}
        <g stroke="url(#gold)" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
          {/* cab + body */}
          <path d="M180 110 L180 80 L240 80 L255 110 Z" />
          <rect x="180" y="110" width="100" height="32" rx="3" />
          <rect x="280" y="118" width="40" height="24" rx="2" />
          {/* exhaust */}
          <line x1="200" y1="80" x2="200" y2="64" />
          {/* wheels */}
          <circle cx="210" cy="158" r="18" />
          <circle cx="210" cy="158" r="6" />
          <circle cx="300" cy="158" r="22" />
          <circle cx="300" cy="158" r="8" />
          {/* ground rows */}
          <path d="M40 195 L360 195" opacity="0.45" />
          <path d="M40 205 L360 205" opacity="0.3" />
          <path d="M40 215 L360 215" opacity="0.2" />
        </g>
      </svg>
    );
  }

  if (key === 'livestock') {
    // Cattle silhouette
    return (
      <svg viewBox="0 0 400 225" xmlns="http://www.w3.org/2000/svg" className={cls} preserveAspectRatio="xMidYMid slice">
        {common}
        <g stroke="url(#gold)" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
          {/* body */}
          <path d="M150 130 Q160 100 200 100 Q260 100 270 120 Q280 110 290 115 Q295 120 290 130 Q285 135 275 132 L270 150 Q260 158 245 156 L240 168 L232 168 L232 158 L215 158 L210 168 L202 168 L202 158 Q175 158 165 145 Q150 145 150 130 Z" />
          {/* eye */}
          <circle cx="282" cy="120" r="1.2" fill="url(#gold)" />
          {/* ear */}
          <path d="M275 110 Q272 105 278 104" />
          {/* ground */}
          <path d="M40 195 L360 195" opacity="0.45" />
          <path d="M40 205 L360 205" opacity="0.3" />
        </g>
      </svg>
    );
  }

  if (key === 'land_property' || key === 'real_estate') {
    // Land contours + farmhouse
    return (
      <svg viewBox="0 0 400 225" xmlns="http://www.w3.org/2000/svg" className={cls} preserveAspectRatio="xMidYMid slice">
        {common}
        <g stroke="url(#gold)" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
          {/* rolling hills */}
          <path d="M0 175 Q80 145 160 165 Q240 185 320 155 Q380 135 400 145" />
          <path d="M0 195 Q90 175 180 185 Q280 195 400 175" opacity="0.55" />
          {/* farmhouse */}
          <path d="M230 140 L230 120 L250 105 L270 120 L270 140 Z" />
          <rect x="240" y="125" width="8" height="15" />
          {/* silo */}
          <rect x="275" y="115" width="8" height="25" rx="1" />
          <path d="M275 115 Q279 110 283 115" />
          {/* fence posts */}
          <path d="M40 180 L40 195 M60 178 L60 195 M80 176 L80 195 M100 174 L100 195" opacity="0.5" />
        </g>
      </svg>
    );
  }

  if (key === 'inputs_supplies') {
    // Sack + droplet
    return (
      <svg viewBox="0 0 400 225" xmlns="http://www.w3.org/2000/svg" className={cls} preserveAspectRatio="xMidYMid slice">
        {common}
        <g stroke="url(#gold)" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M170 90 Q170 80 180 80 L220 80 Q230 80 230 90 L240 160 Q240 170 230 170 L170 170 Q160 170 160 160 Z" />
          <path d="M180 80 Q200 70 220 80" />
          <text x="200" y="135" fontSize="14" fill="url(#gold)" textAnchor="middle" stroke="none">N · P · K</text>
          {/* droplet */}
          <path d="M280 110 Q280 130 290 130 Q300 130 300 110 Q295 95 290 90 Q285 95 280 110 Z" />
        </g>
      </svg>
    );
  }

  // Default / "general" / partner / realm marketplace — wheat motif
  return (
    <svg viewBox="0 0 400 225" xmlns="http://www.w3.org/2000/svg" className={cls} preserveAspectRatio="xMidYMid slice">
      {common}
      <g stroke="url(#gold)" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M200 200 L200 80" />
        {[80, 95, 110, 125, 140, 155, 170].map((y) => (
          <g key={y}>
            <path d={`M200 ${y} Q190 ${y - 5} 180 ${y + 4}`} />
            <path d={`M200 ${y} Q210 ${y - 5} 220 ${y + 4}`} />
          </g>
        ))}
        <path d="M40 200 L360 200" opacity="0.45" />
        <path d="M40 210 L360 210" opacity="0.3" />
      </g>
    </svg>
  );
}
