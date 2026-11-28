'use strict';

/**
 * taxonomy/commodities.js
 * Specific Pan-India & Global Commodity Trade Entities (APMC, Mandis, Exporters).
 */

const COMMODITY_ENTITIES = [
  {
    key: 'turmeric',
    label: 'Turmeric (Haldi / Pasupu)',
    sectorCode: '11',
    patterns: [/\b(turmeric|haldi|pasupu|curcuma)\b/i],
    subvectors: [
      'Turmeric Wholesalers & Commission Agents',
      'Turmeric Merchants & Mandi Traders',
      'Turmeric Processing & Polishing Units',
      'Turmeric Cold Storage & APMC Traders',
      'Spices & Turmeric Exporters'
    ]
  },
  {
    key: 'chilli',
    label: 'Chilli & Spices (Guntur Mirchi)',
    sectorCode: '11',
    patterns: [/\b(chilli|chillies|mirchi|red\s*chilli|guntur\s*mirchi)\b/i],
    subvectors: [
      'Red Chilli Merchants & Commission Agents',
      'Chilli Cold Storage & Exporters',
      'Spices & Chilli Powder Processing Mills',
      'APMC Yard Chilli Commission Agents',
      'Stemless & Teja Chilli Wholesalers'
    ]
  },
  {
    key: 'cotton',
    label: 'Cotton & Ginning',
    sectorCode: '11',
    patterns: [/\b(cotton|ginning|pressing|kapas|spinning\s*mill)\b/i],
    subvectors: [
      'Cotton Ginning & Pressing Mills',
      'Raw Cotton Bales & Seed Merchants',
      'Spinning Mills & Yarn Traders',
      'Cotton Commission Agents & APMC Yards'
    ]
  },
  {
    key: 'steel',
    label: 'TMT Steel & Metals',
    sectorCode: '31-33',
    patterns: [/\b(steel|tmt|rebar|rolling\s*mill|iron|pipes|tubes)\b/i],
    subvectors: [
      'TMT Steel Bars Wholesalers & Distributors',
      'Steel Rolling Mills & Manufacturers',
      'Iron & Steel Traders & Stockists',
      'Structural Steel & GI Pipe Suppliers'
    ]
  },
  {
    key: 'rice',
    label: 'Rice & Grains',
    sectorCode: '11',
    patterns: [/\b(rice|paddy|basmati|rice\s*mill)\b/i],
    subvectors: [
      'Modern Rice Mills & Processing Plants',
      'Basmati Rice Merchants & Exporters',
      'Paddy Commission Agents & Mandis',
      'Rice Wholesalers & Food Grain Stockists'
    ]
  },
  {
    key: 'tobacco',
    label: 'Tobacco & By-Products',
    sectorCode: '11',
    patterns: [/\b(tobacco|flue\s*cured|virginia\s*tobacco)\b/i],
    subvectors: [
      'Tobacco Leaf Merchants & Exporters',
      'Tobacco Processing & Redrying Units',
      'Tobacco Commission Agents & Board Yards'
    ]
  },
  {
    key: 'granite',
    label: 'Granite, Marble & Stones',
    sectorCode: '21',
    patterns: [/\b(granite|marble|slab|stone|tiles)\b/i],
    subvectors: [
      'Granite Processing Units & Polishing Plants',
      'Marble & Granite Showrooms & Stockists',
      'Natural Stone & Quartz Slab Exporters'
    ]
  }
];

function resolveCommodity(text) {
  const q = String(text || '').toLowerCase();
  for (const c of COMMODITY_ENTITIES) {
    for (const pat of c.patterns) {
      if (pat.test(q)) {
        return c;
      }
    }
  }
  return null;
}

module.exports = {
  COMMODITY_ENTITIES,
  resolveCommodity
};
