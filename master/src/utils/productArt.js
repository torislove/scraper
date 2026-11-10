/**
 * productArt.js
 *
 * Local, offline product artwork for the WhatsApp catalog.
 *
 * The catalog used to point at remote stock photos. A desktop install may have
 * no internet at the moment a message is composed, and a third-party CDN can
 * vanish, so every card now renders from an inline SVG generated here. No
 * network request, no missing-image square.
 */

const PALETTES = {
  album: { a: '#8b5cf6', b: '#22d3ee', glyph: 'ALBUM' },
  b2b: { a: '#d4a24c', b: '#f6e0a6', glyph: 'B2B' },
  web: { a: '#4d7cff', b: '#7dd3fc', glyph: 'WEB' },
  service: { a: '#34d399', b: '#a7f3d0', glyph: 'AMC' },
  custom: { a: '#c9a227', b: '#f0d98c', glyph: 'OFFER' },
};

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * 600×600 catalog tile: obsidian glass, one soft light from the top-left and a
 * brass ring. Deterministic per key, so the same product always looks the same.
 */
export function productArt(key = 'custom', label = '') {
  const palette = PALETTES[key] || PALETTES.custom;
  const text = escapeXml((label || palette.glyph).slice(0, 14).toUpperCase());
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
  <defs>
    <radialGradient id="glow" cx="28%" cy="18%" r="82%">
      <stop offset="0%" stop-color="${palette.a}" stop-opacity="0.55"/>
      <stop offset="55%" stop-color="${palette.b}" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="#080b12" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${palette.b}" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="${palette.a}" stop-opacity="0.25"/>
    </linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.02"/>
    </linearGradient>
    <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M48 0H0V48" fill="none" stroke="#ffffff" stroke-opacity="0.05" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="600" height="600" fill="#0a0e17"/>
  <rect width="600" height="600" fill="url(#grid)"/>
  <rect width="600" height="600" fill="url(#glow)"/>
  <circle cx="300" cy="300" r="182" fill="none" stroke="url(#ring)" stroke-width="2"/>
  <circle cx="300" cy="300" r="150" fill="url(#glass)" stroke="#ffffff" stroke-opacity="0.10"/>
  <circle cx="300" cy="300" r="226" fill="none" stroke="#ffffff" stroke-opacity="0.05" stroke-width="1" stroke-dasharray="2 10"/>
  <text x="300" y="318" text-anchor="middle" font-family="Segoe UI, system-ui, sans-serif" font-size="58" font-weight="700" letter-spacing="6" fill="#f7fafc">${text}</text>
  <text x="300" y="372" text-anchor="middle" font-family="Segoe UI, system-ui, sans-serif" font-size="17" letter-spacing="7" fill="${palette.b}" fill-opacity="0.85">SCRAPER</text>
</svg>`.trim();
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export default productArt;
