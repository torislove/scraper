/**
 * shared/data/taxonomyClient.js
 * Client-side mirror of the 15 Exhaustive Generic Umbrellas (including all 15 Hospital
 * specialties: Multi-Speciality, Super Speciality, General, Dental Hospital, Orthopedic,
 * Eye, Maternity/IVF, Pediatric, Cardiac, Oncology, Neuro, ENT, Gastro, Urology, Trauma),
 * typo correction ("Did you mean"), and Category Gate Rule showcase cases.
 */

import { normalizeCategoryText, STATIC_WORD_TYPOS } from './searchNormalize.js';
import { resolveSpecialistExpansion, getDoctorSubsForCountry } from './specialistExpansions.js';
import { resolveTradeExpansion } from './tradeExpansions.js';
import { detectClientIntent, SECTOR_INTENT_MAP, PRODUCT_STORE_EXPANSIONS, INTENT_META } from './intentRules.js';

const COMMON_TYPOS = STATIC_WORD_TYPOS;

export const UMBRELLA_TAXONOMY = [
  {
    key: 'hospitals',
    matchRe: /^(?:hospitals?(?:\s*(?:&|and|\/)\s*nursing\s*homes?)?|general\s*hospitals?|multi[\s-]*speciali?ty\s*hospitals?|super[\s-]*speciali?ty\s*hospitals?|krankenh(?:aus|äuser)|kliniken|h[oô]pitaux|h[oô]pital|medical\s+cent(?:er|re)s?)$/i,
    label: 'Hospitals (15 Specialties)',
    subcategories: [
      'Multi-Speciality Hospitals',
      'Super Speciality Hospitals',
      'General Hospitals & Nursing Homes',
      'Dental Hospitals',
      'Orthopedic & Joint Replacement Hospitals',
      'Eye & Ophthalmic Hospitals',
      'Maternity, Gynecology & IVF Hospitals',
      'Children & Pediatric Hospitals',
      'Cardiac & Heart Hospitals',
      'Cancer & Oncology Hospitals',
      'Neurology, Brain & Spine Hospitals',
      'ENT, Head & Neck Hospitals',
      'Gastroenterology & Liver Hospitals',
      'Kidney, Urology & Dialysis Hospitals',
      'Trauma & Emergency Care Hospitals'
    ]
  },
  {
    key: 'clinics',
    matchRe: /^(?:clinics?(?:\s*(?:&|and|\/)\s*doctors?)?|medical\s+clinics?|doctors?(?:\s*(?:&|and|\/)\s*clinics?)?|physicians?|polyclinics?|arztprax(?:is|en)|[aä]rzte|cabinets?\s+m[eé]dicaux|m[eé]decins?)$/i,
    label: 'Clinics & Doctors (16 Medical Specialties)',
    subcategories: [
      'General Physicians & Family Doctors',
      'Orthopedic Doctors & Bone Surgeons',
      'Cardiologists & Heart Specialists',
      'Dermatologists & Skin Clinics',
      'Gynecologists & Maternity Doctors',
      'Pediatricians & Child Specialists',
      'Neurologists & Brain Spine Doctors',
      'Ophthalmologists & Eye Doctors',
      'ENT Specialists (Ear Nose Throat)',
      'Gastroenterologists & Liver Doctors',
      'Urologists & Kidney Doctors',
      'Oncologists & Cancer Specialists',
      'Diabetologists & Endocrinologists',
      'Pulmonologists & Chest Physicians',
      'Nephrologists & Dialysis Doctors',
      'Psychiatrists & Mental Health Doctors'
    ]
  },
  {
    key: 'dental',
    matchRe: /^(?:dental|dentists?(?:\s*(?:&|and|\/)\s*dental\s*(?:hospitals?|clinics?|care))?|dental\s*(?:hospitals?|clinics?|practices?|surger(?:y|ies)|care)|dentistry|zahn(?:arzt|ärzte|medizin|klinik)|dentistes?)$/i,
    label: 'Dental & Oral Care (8 Specialties)',
    subcategories: [
      'Dental Clinics',
      'Dental Hospitals',
      'Dental Implants Centers',
      'Orthodontics & Braces Clinics',
      'Root Canal & Endodontics',
      'Pediatric Dentistry',
      'Oral & Maxillofacial Surgery',
      'Prosthodontics & Cosmetic Dentistry'
    ]
  },
  {
    key: 'schools',
    matchRe: /^(?:schools?|education|schulen|[eé]coles?)$/i,
    label: 'Schools (6 Categories)',
    subcategories: [
      'Primary & Elementary Schools',
      'High & Secondary Schools',
      'International & CBSE/ICSE/IB Schools',
      'Public & State Grammar Schools',
      'Montessori & Preschools',
      'Residential & Boarding Schools'
    ]
  },
  {
    key: 'colleges',
    matchRe: /^(?:colleges?|universit(?:y|ies)|higher\s+education|hochschulen|universit[eé]s?)$/i,
    label: 'Colleges & Universities (7 Disciplines)',
    subcategories: [
      'Engineering & Technology Colleges',
      'Medical & Nursing Colleges',
      'Degree, Arts & Science Colleges',
      'Management & MBA Institutes',
      'Pharmacy & Paramedical Colleges',
      'Law Colleges',
      'Polytechnic & Diploma Institutes'
    ]
  },
  {
    key: 'contractors',
    matchRe: /^(?:contractors?|trades|tradies|home\s+services?|builders?|handwerk(?:er)?|artisans?)$/i,
    label: 'Contractors & Trades (10 Trades)',
    subcategories: [
      'General Building Contractors',
      'Plumbers & Heating Engineers',
      'Licensed Electricians',
      'HVAC & Air Conditioning Contractors',
      'Roofing & Waterproofing Contractors',
      'Painting & Decorating Contractors',
      'Carpentry & Joinery',
      'Civil & Masonry Contractors',
      'Flooring & Tiling Specialists',
      'Solar EPC & Installers'
    ]
  },
  {
    key: 'lawyers',
    matchRe: /^(?:lawyers?|attorneys?|solicitors?|advocates?|law\s+firms?|rechtsanw[aä]lte|avocats?)$/i,
    label: 'Lawyers & Law Firms (7 Practice Areas)',
    subcategories: [
      'Civil & Litigation Law Firms',
      'Corporate & Commercial Lawyers',
      'Real Estate, Property & Conveyancing',
      'Family, Divorce & Matrimonial Law',
      'Criminal Defense Advocates',
      'Personal Injury & Accident Lawyers',
      'Tax, Banking & IP Lawyers'
    ]
  },
  {
    key: 'restaurants',
    matchRe: /^(?:restaurants?|dining|food\s+and\s+dining|eateries)$/i,
    label: 'Restaurants & Dining (8 Cuisines)',
    subcategories: [
      'Family Multi-Cuisine Restaurants',
      'Traditional & Regional Dining',
      'Vegetarian & Plant-Based Dining',
      'Grill, Biryani & Barbecue',
      'Fine Dining & Bistros',
      'Cafes & Coffee Houses',
      'Fast Casual & Quick Service',
      'Seafood Restaurants'
    ]
  },
  {
    key: 'hotels',
    matchRe: /^(?:hotels?|hospitality|accommodations?|lodging)$/i,
    label: 'Hotels & Hospitality (5 Tiers)',
    subcategories: [
      'Business & Executive Hotels',
      'Luxury & Boutique Hotels',
      'Budget Hotels & Lodges',
      'Resorts & Retreats',
      'Serviced Apartments'
    ]
  },
  {
    key: 'automotive',
    matchRe: /^(?:automotive|auto\s+services?|car\s+services?|garages?)$/i,
    label: 'Automotive (7 Services)',
    subcategories: [
      'Authorized Vehicle Dealerships',
      'Multi-Brand Car Repair & Mechanics',
      'Auto Body & Collision Repair',
      'Tyre & Wheel Alignment',
      'Car Detailing & Wash',
      'Auto Electrical, AC & Battery',
      'Auto Spare Parts Dealers'
    ]
  },
  {
    key: 'salons',
    matchRe: /^(?:salons?|beauty|beauty\s+salons?|spas?)$/i,
    label: 'Salons & Wellness (7 Services)',
    subcategories: [
      'Unisex Hair & Styling Salons',
      'Beauty Parlours & Facial Studios',
      'Bridal Makeup Studios',
      'Barber & Men Grooming',
      'Skin, Laser & Aesthetic Clinics',
      'Nail & Lash Studios',
      'Day Spas & Wellness Centers'
    ]
  },
  {
    key: 'real_estate',
    matchRe: /^(?:real\s+estate|realtors?|property|estate\s+agents?|immobilien)$/i,
    label: 'Real Estate & Property (5 Segments)',
    subcategories: [
      'Residential Real Estate Agents',
      'Commercial Property Brokers',
      'Real Estate Developers & Builders',
      'Property & Facility Management',
      'Land & Plot Promoters'
    ]
  },
  {
    key: 'financial',
    matchRe: /^(?:accountants?|accounting|financial\s+services?|tax\s+consultants?|steuerberater)$/i,
    label: 'Accountants & Financial (6 Segments)',
    subcategories: [
      'Chartered Accountants & CPAs',
      'Tax, GST & VAT Consultants',
      'Audit & Bookkeeping Firms',
      'Wealth & Investment Advisors',
      'Commercial Insurance Agencies',
      'Mortgage & Business Loan Advisors'
    ]
  },
  {
    key: 'manufacturing',
    matchRe: /^(?:manufacturing|manufacturers?|factories|industrial|industries)$/i,
    label: 'Manufacturing & Industrial (7 Sectors)',
    subcategories: [
      'CNC & Precision Machining Units',
      'Metal & Steel Fabricators',
      'Plastics & Packaging Manufacturers',
      'Food & Agro Processing Plants',
      'Electrical & Industrial Equipment',
      'Pharma & Chemical Manufacturers',
      'Textile & Garment Mills'
    ]
  },
  {
    key: 'wholesale',
    matchRe: /^(?:wholesalers?|wholesale|distributors?|traders?)$/i,
    label: 'Wholesalers & Distributors (6 Sectors)',
    subcategories: [
      'FMCG & Food Wholesalers',
      'Pharmaceutical Distributors',
      'Building & Construction Materials',
      'Electrical, Plumbing & Hardware',
      'Agricultural & Commodity Traders',
      'Textile & Apparel Wholesalers'
    ]
  },
  {
    key: 'pharmacies',
    matchRe: /^(?:pharmac(?:y|ies)|chemists?|medical\s+stores?|drugstores?|apothek(?:e|en)|pharmacies?)$/i,
    label: 'Pharmacies & Chemists (5 Segments)',
    subcategories: ['Retail Pharmacies & Chemists', '24/7 Medical & Drug Stores', 'Surgical & Medical Supplies', 'Ayurvedic & Homeopathy Pharmacies', 'Wholesale Pharma Distributors']
  },
  {
    key: 'diagnostics',
    matchRe: /^(?:diagnostics?|diagnostic\s+cent(?:er|re)s?|pathology|labs?|radiology|mri|ct\s*scan)$/i,
    label: 'Diagnostic Labs (5 Segments)',
    subcategories: ['Pathology & Blood Labs', 'MRI, CT Scan & Radiology', 'Health Checkup Centers', 'Ultrasound & Sonography', 'Blood Banks & Genetic Labs']
  },
  {
    key: 'retail',
    matchRe: /^(?:retail|stores?|shops?|showrooms?|supermarkets?|jewellery|jewelry|electronics|furniture\s*stores?|clothing|boutiques?)$/i,
    label: 'Retail & Showrooms (7 Segments)',
    subcategories: ['Supermarkets & Hypermarkets', 'Electronics & Appliances', 'Jewellery & Gold Showrooms', 'Clothing & Apparel Boutiques', 'Furniture & Home Decor', 'Optical & Eyewear Stores', 'Mobile & Computer Shops']
  },
  {
    key: 'it_software',
    matchRe: /^(?:it\s*compan(?:y|ies)|software\s*compan(?:y|ies)|software|it\s*services?|digital\s*marketing|web\s*design|tech\s*companies)$/i,
    label: 'IT, Software & Digital (5 Segments)',
    subcategories: ['Software & App Development', 'IT Consulting & Managed Services', 'Digital Marketing & SEO', 'Web Design & Creative Studios', 'Cloud & Cybersecurity']
  },
  {
    key: 'logistics',
    matchRe: /^(?:logistics?|transport|packers?\s*(?:and|&)?\s*movers?|freight|cargo|warehousing|couriers?)$/i,
    label: 'Logistics & Transport (5 Segments)',
    subcategories: ['Freight & Cargo Forwarders', 'Packers & Movers', 'Cold Storage & Warehousing', 'Courier & Express Parcels', 'Commercial Fleet & Transport']
  },
  {
    key: 'fitness',
    matchRe: /^(?:gyms?|fitness|fitness\s*cent(?:er|re)s?|yoga|pilates|crossfit|sports\s*club)$/i,
    label: 'Fitness & Sports (5 Segments)',
    subcategories: ['Gyms & Health Clubs', 'Yoga & Pilates Studios', 'CrossFit & Functional Training', 'Sports & Swimming Academies', 'Martial Arts & Boxing Studios']
  },
  {
    key: 'events',
    matchRe: /^(?:events?|event\s*management|weddings?|wedding\s*planners?|catering|photographers?|banquet\s*halls?)$/i,
    label: 'Events & Weddings (5 Segments)',
    subcategories: ['Wedding Planners & Decorators', 'Photographers & Videographers', 'Catering Services', 'Banquet & Convention Halls', 'Corporate Event Management']
  },
  {
    key: 'veterinary',
    matchRe: /^(?:veterinar(?:y|ians?)|vets?|pet\s*clinics?|pet\s*hospitals?|animal\s*hospitals?|pet\s*care)$/i,
    label: 'Veterinary & Pet Care (4 Segments)',
    subcategories: ['Veterinary Hospitals & Surgeons', 'Pet Clinics & Vaccination', 'Pet Grooming & Boarding', 'Animal Diagnostics & Care']
  }
];

export const PURITY_SHOWCASE_CASES = [
  {
    id: 'hospitals',
    query: 'Hospitals (Generic Umbrella)',
    mode: 'Sweeps all 15 hospital specialties in every ward',
    kept: [
      'Multi-Speciality & General Hospitals',
      'Dental Hospitals',
      'Orthopedic & Spine Hospitals',
      'Eye, Maternity, Pediatric, Cardiac, ENT & Oncology Hospitals'
    ],
    dropped: ['Retail Optical / Eyewear Shops (Lenskart)', 'Standalone Retail Pharmacies', 'Animal / Veterinary Clinics']
  },
  {
    id: 'ortho',
    query: 'Orthopedic Hospitals (Particular Niche)',
    mode: 'Strict single-specialty match',
    kept: ['Orthopedic & Joint Replacement Hospital', 'Spine & Arthroscopy Center', 'Bone & Trauma Surgery'],
    dropped: ['Dental Hospital', 'Eye Hospital', 'Maternity Hospital', 'Optical Shop']
  },
  {
    id: 'plumbers',
    query: 'Plumbers (Particular Trade)',
    mode: 'Strict single-trade match',
    kept: ['Licensed Plumber', 'Drain & Pipe Repair', 'Gas Safe / Boiler Heating Plumber'],
    dropped: ['Electrician', 'Roofing Contractor', 'Paint & Wallpaper Shop']
  }
];

export function suggestTypoFix(rawQuery = '') {
  const { value, changed } = normalizeCategoryText(rawQuery);
  return changed ? value : null;
}

const PARTICULAR_CLIENT_EXPANSIONS = [
  { key: 'eye_hospital', label: 'Eye Hospitals & Ophthalmology', matchRe: /\b(eye\s*(?:hospital|clinic|care|cent(?:er|re))?|netralaya\w*|ophthalmolog\w*|cataract|lasik|augenklinik)\b/i, subcategories: ['Eye Hospitals & Laser Centers', 'Ophthalmology & Cataract Clinics', 'Retina & Eye Care Centers'] },
  { key: 'dental_implants', label: 'Dental Implants Centers', matchRe: /\b(dental\s*implants?|implants?\s*cent(?:er|re)|^implants?$)\b/i, subcategories: ['Dental Implants Centers', 'Implant Dentistry & Oral Surgery', 'Full Mouth Dental Implants'] },
  { key: 'personal_injury', label: 'Personal Injury Law', matchRe: /\b(personal\s*injury|accident\s*lawyer|slip\s*and\s*fall)\b/i, subcategories: ['Personal Injury Law Firms', 'Accident Trial Lawyers'] },
  { key: 'divorce_family', label: 'Divorce & Family Law', matchRe: /\b(divorce|family\s*law|child\s*custody|matrimonial)\b/i, subcategories: ['Family Law Attorneys', 'Divorce & Matrimonial Lawyers'] }
];

export function classifyClientQuery(rawQuery = '', country = 'IN') {
  const normalized = normalizeCategoryText(rawQuery).value || String(rawQuery || '').trim();
  if (!normalized) return { mode: 'idle', intentType: 'service', intentMeta: INTENT_META.service, umbrella: null, subcategories: [] };
  const intent = detectClientIntent(normalized, country);

  for (const item of UMBRELLA_TAXONOMY) {
    if (item.matchRe.test(normalized)) {
      const subs = item.key === 'clinics' ? getDoctorSubsForCountry(country) : item.subcategories;
      const iType = SECTOR_INTENT_MAP[item.key] || intent.intentType || 'service';
      return { mode: 'umbrella', intentType: iType, intentMeta: INTENT_META[iType] || INTENT_META.service, umbrella: item, subcategories: subs };
    }
  }
  if (intent.productMatch) {
    return {
      mode: 'umbrella',
      intentType: 'store',
      isProductQuery: true,
      intentMeta: INTENT_META.store,
      umbrella: { key: intent.productMatch.key, label: intent.productMatch.label },
      subcategories: intent.productMatch.subcategories
    };
  }
  const specialist = resolveSpecialistExpansion(normalized, country);
  if (specialist) {
    return { mode: 'umbrella', intentType: 'service', intentMeta: INTENT_META.service, umbrella: { key: specialist.key, label: specialist.label }, subcategories: specialist.subcategories };
  }
  const trade = resolveTradeExpansion(normalized, country);
  if (trade) {
    const iType = trade.intentType || 'service';
    return { mode: 'umbrella', intentType: iType, intentMeta: INTENT_META[iType] || INTENT_META.service, umbrella: { key: trade.key, label: trade.label }, subcategories: trade.subcategories };
  }
  for (const niche of PARTICULAR_CLIENT_EXPANSIONS) {
    if (niche.matchRe.test(normalized)) {
      return { mode: 'umbrella', intentType: intent.intentType, intentMeta: intent.meta, umbrella: { key: niche.key, label: niche.label }, subcategories: niche.subcategories };
    }
  }
  return { mode: 'niche', intentType: intent.intentType, intentMeta: intent.meta, umbrella: null, subcategories: [] };
}

export { COMMON_TYPOS, PRODUCT_STORE_EXPANSIONS, SECTOR_INTENT_MAP, INTENT_META };
