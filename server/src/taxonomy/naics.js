'use strict';

/**
 * taxonomy/naics.js
 * NAICS 2022 2-Digit & 3-Digit Economic Sector Ontologies with Trust Badges.
 */

const NAICS_SECTORS = [
  {
    code: '11',
    name: 'Agriculture, Forestry, Fishing & Hunting',
    shield: '100% Zero-Bleed',
    patterns: [/\b(turmeric|chilli|mirchi|cotton|paddy|rice|spices|grain|seed|tobacco|horticulture|nursery|dairy|poultry|fishery|farm|farmer|agri|agriculture)\b/i]
  },
  {
    code: '21',
    name: 'Mining, Quarrying & Oil Extraction',
    shield: 'Heavy Industry',
    patterns: [/\b(mining|quarry|granite|marble|crusher|sand|gravel|limestone|coal|mineral|borewell)\b/i]
  },
  {
    code: '23',
    name: 'Construction & Real Estate Development',
    shield: 'Structural Trade',
    patterns: [/\b(builder|construction|contractor|civil|structural|architect|interior|painter|electrician|plumber|roofing|roof|hvac|flooring|tiles|cement|ready\s*mix)\b/i]
  },
  {
    code: '31-33',
    name: 'Manufacturing & Industrial Production',
    shield: 'Industrial Core',
    patterns: [/\b(steel|rolling\s*mill|tmt|pipes|foundry|fabrication|textile|ginning|spinning|weaving|plastic|packaging|machinery|industrial|factory|plant)\b/i]
  },
  {
    code: '42',
    name: 'Wholesale Trade & APMC Mandis',
    shield: 'Wholesale Certified',
    patterns: [/\b(wholesale|wholesaler|distributor|stockist|mandi|commission\s*agent|apmc|trader|merchant|bulk|exporter|importer)\b/i]
  },
  {
    code: '44-45',
    name: 'Retail Trade & Commercial Outlets',
    shield: 'Direct Retail',
    patterns: [/\b(retail|store|shop|showroom|mart|supermarket|kirana|jeweller|optical|apparel|clothing|electronics|furniture)\b/i]
  },
  {
    code: '52',
    name: 'Finance & Insurance',
    shield: 'Regulated Finance',
    patterns: [/\b(bank|finance|loan|credit|insurance|wealth|invest|mutual\s*fund|cpa|tax|accountant|ca\s*firm|audit)\b/i]
  },
  {
    code: '53',
    name: 'Real Estate & Property Management',
    shield: 'Asset Brokerage',
    patterns: [/\b(real\s*estate|realtor|realty|property|broker|plots|villas|flats|apartments|commercial\s*space|rental|leasing)\b/i]
  },
  {
    code: '54',
    name: 'Professional, Scientific & Technical Services',
    shield: 'Accredited Specialist',
    patterns: [/\b(lawyer|advocate|solicitor|attorney|legal|software|it\s*services|web\s*design|cyber|digital\s*marketing|consultant|surveyor)\b/i]
  },
  {
    code: '61',
    name: 'Educational Services & Training',
    shield: 'Academic Institute',
    patterns: [/\b(school|college|university|coaching|iit|jee|neet|academy|institute|tuition|training|driving\s*school)\b/i]
  },
  {
    code: '62',
    name: 'Health Care & Social Assistance',
    shield: 'Medical Certified',
    patterns: [/\b(dentist|dental|doctor|hospital|clinic|physician|orthopedic|pediatric|eye|maternity|pathology|diagnostic|ayurvedic|homeopathy|pharmacy|chemist)\b/i]
  },
  {
    code: '71',
    name: 'Arts, Entertainment & Recreation',
    shield: 'Entertainment',
    patterns: [/\b(gym|fitness|yoga|sports|club|theatre|cinema|park|resort|stadium|swimming)\b/i]
  },
  {
    code: '72',
    name: 'Accommodation & Food Services',
    shield: 'Hospitality Approved',
    patterns: [/\b(restaurant|hotel|cafe|bakery|dhaba|bhojanalaya|pub|bar|catering|banquet|lodge|sweet\s*shop|fast\s*food)\b/i]
  },
  {
    code: '81',
    name: 'Other Personal & Repair Services',
    shield: 'Certified Trade',
    patterns: [/\b(mechanic|garage|auto\s*repair|car\s*wash|salon|spa|beauty|barber|laundry|tailor|dry\s*clean)\b/i]
  }
];

function resolveNaics(queryText) {
  const text = String(queryText || '').toLowerCase();
  for (const sector of NAICS_SECTORS) {
    for (const pat of sector.patterns) {
      if (pat.test(text)) {
        return {
          code: sector.code,
          name: sector.name,
          shield: sector.shield
        };
      }
    }
  }
  return {
    code: 'Universal',
    name: 'General Commercial Directory',
    shield: 'Verified Business'
  };
}

module.exports = {
  NAICS_SECTORS,
  resolveNaics
};
