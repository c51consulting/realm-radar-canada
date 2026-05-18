import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        realm: {
          // REALM Marketplace /us/ brand palette
          forest: '#1a4d2e',       // primary dark green
          green: '#2E7D32',        // primary mid green (CTA bar)
          deep: '#1B5E20',         // hover / deeper variant
          moss: '#5B8C51',         // light accent (card hover borders, badges)
          mint: '#E8F5E9',         // pale section tint
          gold: '#c8a84b',         // primary gold accent
          'gold-light': '#e8c96a', // gold gradient end
          cream: '#FAF7F2',        // page background (warm not stark)
          paper: '#FFFFFF',        // card background
          ink: '#1F2A24',          // primary text
          charcoal: '#404A3D',     // body text on light
          muted: '#6B7768',        // secondary text
          line: '#E5E1D6',         // hairline border
          'line-strong': '#C9C3B2',// stronger border
          rust: '#a44a3f',         // legacy alert color (kept for compat)
          // legacy aliases (keep until callsites migrated)
          sand: '#FAF7F2',
          field: '#E5E1D6',
          sage: '#5B8C51',
          bg: '#0b0f0c',
          surface: '#11171311',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['Cardo', 'ui-serif', 'Georgia', 'serif'],
      },
      maxWidth: { content: '76rem' },
      boxShadow: {
        card: '0 1px 2px rgba(26, 77, 46, 0.04), 0 4px 16px rgba(26, 77, 46, 0.06)',
        'card-hover': '0 2px 6px rgba(26, 77, 46, 0.06), 0 12px 28px rgba(26, 77, 46, 0.10)',
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #c8a84b 0%, #e8c96a 100%)',
        'forest-gradient': 'linear-gradient(135deg, #1a4d2e 0%, #2E7D32 100%)',
        'hero-overlay': 'linear-gradient(180deg, rgba(26,77,46,0.45) 0%, rgba(26,77,46,0.65) 60%, rgba(26,77,46,0.85) 100%)',
      },
    },
  },
  plugins: [],
};

export default config;
