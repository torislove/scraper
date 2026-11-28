'use strict';

/**
 * server/src/taxonomy/classifier.js
 * Universal Semantic Domain Gating Engine & Query Classifier.
 * 1. Generic Umbrellas (e.g. 'hospitals', 'clinics', 'dental', 'schools', 'contractors', 'lawyers', etc.)
 *    resolve via umbrellas.js into ALL specialty sub-categories with umbrella-safe purity filters.
 * 2. Particular Niches (e.g. 'orthopedic hospital', 'dental implants', 'eye hospital', 'plumber')
 *    enforce strict single-specialty domain purity.
 */

const { resolveUmbrella, UMBRELLA_REGISTRY } = require('./umbrellas');
const { SPECIALIST_NICHES } = require('./specialists');
const { resolveCommodity } = require('./commodities');
const { detectIntentAndProduct, isServiceStoreMismatch, resolveIntentForUmbrellaKey, shouldRejectByCrossDomain } = require('./intentDifferentiator');
const { isUnsafeLeadOrUrl } = require('./safetyFilter');

const UNIVERSAL_NOISE_CATEGORY_RE = /\b(furniture\s*(?:maker|manufacturer|store|shop)|supermarket|grocery\s*store|kirana|atm\b|petrol\s*pump|gas\s*station|temple|church|mosque|bus\s*stop|auto\s*stand|metro\s*station|railway\s*station|jewelry\s*store|jeweller|clothing\s*store|apparel|shoe\s*store|hardware\s*(?:store|shop)|toy\s*store|canteen|cafeteria|apartment\s*building|housing\s*society|residential\s*society|training\s*cent(?:er|re)|corporate\s*office|publisher|warehouse|paint\s*store|tile\s*store|mirror\s*shop|electronics\s*store|home\s*goods\s*store|building\s*materials?\s*store|electric\s*motor\s*store|electrical\s*(?:supply\s*)?(?:store|shop)|public\s*bathroom|public\s*toilet|restroom|book\s*(?:store|shop)|stationery|sporting\s*goods|seed\s*(?:store|shop)|agricultural|auto\s*parts|car\s*wash|saw\s*mill|timber|computer\s*(?:store|shop)|mobile\s*phone\s*shop|appliance\s*store|bakery|salon|beauty\s*parlou?r)\b/i;
const PRIMARY_STRUCTURED_SOURCES = new Set(['gosom_google_maps_fast', 'gmap_direct_rpc', 'justdial_turbo', 'justdial_tls', 'yellowpages_tls', 'openstreetmap_poi']);
const CONTAINER_CATEGORY_RE = /^(?:hospital|private\s*hospital|medical\s*cent(?:er|re)|medical\s*clinic|clinic|clinics|doctor|doctors|polyclinic|healthcare|health\s*cent(?:er|re))$/i;

/**
 * Universal Domain Purity Gate applied uniformly to ALL categories.
 * - Never blocks real container-labeled Google Maps/JustDial/OSM businesses returned directly for active queries
 *   (e.g., Srikara Hospitals or Germanten Hospitals under Orthopedic Hospitals).
 * - Rejects landmark-only empty pins, explicit incompatible specialties (rejectRe), and unrelated public/retail POIs.
 */
function passesUniversalPurityGate(leadOrName, specificityOrCategory, ...rest) {
  let lead = leadOrName;
  let specificity = specificityOrCategory;

  if (typeof leadOrName === 'string') {
    lead = { name: leadOrName, category: specificityOrCategory };
    specificity = {
      strictFilterRe: rest[0],
      rejectRe: rest[1],
      intentType: rest[2],
      isProductQuery: rest[3],
      label: rest[4]
    };
  }

  if (!lead || !lead.name || isUnsafeLeadOrUrl(lead)) return false;
  const rawName = String(lead.name).trim();
  const rawCat = String(lead.category || '').trim();

  const nameWithoutLandmark = rawName
    .replace(/\b(?:opp\.?|opposite|near|beside|behind|next\s+to|adjacent\s+to|in\s+front\s+of)\b[\s\S]*$/i, '')
    .trim() || rawName;

  if (shouldRejectByCrossDomain(lead, nameWithoutLandmark, specificity)) return false;
  if (isServiceStoreMismatch(lead, specificity)) return false;

  const purityText = `${nameWithoutLandmark} ${rawCat}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Strict domain reject rule: if specificity defines rejectRe, block immediately on match
  if (specificity?.rejectRe && specificity.rejectRe.test(purityText)) {
    return false;
  }

  // Universal Noise Category Filter
  if (rawCat && UNIVERSAL_NOISE_CATEGORY_RE.test(rawCat)) {
    const queryLower = String(specificity?.label || lead.query || '').toLowerCase();
    const catMatchedSearch = specificity?.strictFilterRe ? specificity.strictFilterRe.test(rawCat) : rawCat.toLowerCase().includes(queryLower);
    if (!catMatchedSearch) {
      const nameMatchedSearch = specificity?.strictFilterRe && specificity.strictFilterRe.test(nameWithoutLandmark);
      if (!nameMatchedSearch) return false;
    }
  }

  // Category-First Veto: explicit cross-sector Google Maps category mismatch with no query domain tokens in name
  const isExplicitMismatchedCategory = /\b(book\s*store|stationery|computer\s*(?:store|shop)|electronics\s*store|sporting\s*goods|saw\s*mill|seed\s*store|clothing|apparel|shoe\s*store|grocery|supermarket)\b/i.test(rawCat);
  if (isExplicitMismatchedCategory && specificity?.strictFilterRe && !specificity.strictFilterRe.test(nameWithoutLandmark)) {
    return false;
  }

  // Drop bare empty locality pins with no category and no phone (e.g. "Purani Haveli")
  if (!rawCat && !lead.phone && !lead.mobilePhone && lead.zone && rawName.toLowerCase() === String(lead.zone).toLowerCase()) {
    return false;
  }

  if (rawCat && specificity?.key && specificity.strictFilterRe && !specificity.strictFilterRe.test(rawCat)) {
    for (const u of UMBRELLA_REGISTRY) {
      if (u.key === specificity.key) continue;
      const medicalPair = new Set(['hospitals', 'clinics', 'dental']);
      if (medicalPair.has(specificity.key) && medicalPair.has(u.key)) continue;
      // Preserve medical specialty searches ONLY when searching medical and Maps returns Hospital/Clinic container category
      if (medicalPair.has(specificity.key) && medicalPair.has(u.key) && PRIMARY_STRUCTURED_SOURCES.has(lead.source) && CONTAINER_CATEGORY_RE.test(rawCat)) {
        continue;
      }
      const isRetailOrB2bCategory = u.key === 'retail' || u.key === 'wholesale' || u.key === 'manufacturing';
      if (u.strictFilterRe && u.strictFilterRe.test(rawCat)) {
        if ((specificity.intentType === 'service' && isRetailOrB2bCategory) || !specificity.strictFilterRe.test(nameWithoutLandmark)) {
          return false;
        }
      }
    }
  }

  // For structured primary scrapers returning container categories ("Hospital", "Clinic", "Doctor"), preserve genuine leads not hit by rejectRe
  if (PRIMARY_STRUCTURED_SOURCES.has(lead.source) && CONTAINER_CATEGORY_RE.test(rawCat)) {
    return true;
  }

  // Never include echoed matchedSubcategory here; match strictly against authentic business name + category
  if (specificity?.strictFilterRe && !specificity.strictFilterRe.test(purityText)) return false;

  return true;
}

const PARTICULAR_NICHE_REGISTRY = [
  // ── 1a. Implants Safeguard (bare "implants" / "implant center" MUST strictly match dental implants, never hair/breast/cochlear) ──
  {
    key: 'dental_implants_strict',
    patterns: [/\b(dental\s*implants?|implants?\s*cent(?:er|re)|^implants?$)\b/i],
    categoryFamily: 'dental',
    label: 'Dental Implants Centers',
    strictFilterRe: /(dental|dentist|tooth|teeth|oral|implantology|prosthodont)/i,
    rejectRe: /(hair\s*implant|hair\s*transplant|breast\s*implant|cochlear\s*implant|eye\s*clinic|orthopedic|maternity|veterinary)/i,
    synonyms: { default: ['Dental Implants Centers', 'Implant Dentistry & Oral Surgery', 'Full Mouth Dental Implants'] }
  },
  // ── 1b. Specific Dental Sub-Niches (e.g. 'dental clinic', 'orthodontist', 'root canal') ──
  {
    key: 'dental_niche',
    patterns: [/\b(dental\s*(?:clinic|hospital|surgery|practice|implant\w*)|orthodont\w*|endodont\w*|root\s*canal|oral\s*surgery|prosthodont\w*|zahnarztpraxis|zahnimplantat\w*|cabinet\s*dentaire|implants?\s*dentaires?)\b/i],
    categoryFamily: 'dental',
    label: 'Dental Specialty',
    strictFilterRe: /(dental|dentist|orthodont|endodont|teeth|tooth|dental\s*implant|periodont|prosthodont|oral\s*care|oral\s*surgery|dento|zahn|chirurgien\s*dentiste|cabinet\s*dentaire)/i,
    rejectRe: /(eye\s*clinic|eye\s*hospital|optician|lenskart|optical|netralaya|ophthalmolog|vision\s*care|lasik|ayurved|homeo|pediatric\s*hospital|ent\s*clinic|maternity|fertility|gynec|orthopedic|ortho\s*care|spine|psychiatry|general\s*hospital|hair\s*implant|breast\s*implant|cochlear)/i,
    synonyms: {
      IN: ['Dental Clinics & Dental Care', 'Multispeciality Dental Hospitals', 'Dental Implants & Root Canal Centers'],
      GB: ['Dental Practice', 'Dental Surgery', 'Dental Implants & Orthodontics'],
      US: ['Family Dentistry', 'Dental Practice', 'Dental Implants & Orthodontics'],
      AU: ['Dental Surgery', 'Dental Clinic & Implants', 'Orthodontics'],
      DE: ['Zahnarztpraxis', 'Zahnklinik', 'Zahnimplantate & Kieferorthopädie'],
      FR: ['Cabinet Dentaire', 'Chirurgien-Dentiste', 'Implants Dentaires'],
      default: ['Dental Clinics', 'Dental Hospitals', 'Dental Implants & Orthodontics']
    }
  },
  // ── 2. Eye & Vision Care ──
  {
    key: 'eye_hospital',
    patterns: [/\b(eye\s*(?:hospital|clinic|care|cent(?:er|re))?|netralaya\w*|ophthalmolog\w*|vision\s*care|lasik|cataract|augenklinik|ophtalmolog\w*)\b/i],
    categoryFamily: 'eye',
    label: 'Eye Hospitals & Ophthalmology',
    strictFilterRe: /(eye|netralaya|ophthalmolog|vision|lasik|cataract|cornea|augenklinik|ophtalmolog)/i,
    rejectRe: /(dental|dentist|teeth|tooth|maternity|fertility|gynec|orthopedic|ortho|bone|general\s*hospital|psychiatry|pet\s*hospital|veterinary)/i,
    synonyms: { default: ['Eye Hospitals & Laser Centers', 'Ophthalmology & Cataract Clinics', 'Eye Care Centers'] }
  },
  // ── 3. Orthopedics & Joint Care ──
  {
    key: 'orthopedic_hospital',
    patterns: [/\b(ortho|orthop[ae]dic\w*|joint\s*replacement|spine\s*(?:hospital|clinic|surgery)|arthroscop\w*|knee\s*surgery|bone\s*(?:hospital|clinic)|orthop[aä]d\w*)\b/i],
    categoryFamily: 'ortho',
    label: 'Orthopedic & Joint Hospitals',
    strictFilterRe: /(ortho|bone|joint|spine|arthroscop|knee|shoulder|orthop[aä]d)/i,
    rejectRe: /(dental|dentist|teeth|eye\s*hospital|optician|lenskart|maternity|fertility|gynec|pediatric)/i,
    synonyms: { default: ['Orthopedic & Spine Hospitals', 'Joint Replacement & Arthroscopy Clinics'] }
  },
  // ── 4. Maternity & Women Healthcare ──
  {
    key: 'maternity_clinic',
    patterns: [/\b(materni\w*|women\s*(?:hospital|care|clinic)|gynec\w*|fertilit\w*|ivf|obstetric\w*|frauenklinik)\b/i],
    categoryFamily: 'maternity',
    label: 'Maternity & Women Care Hospitals',
    strictFilterRe: /(materni|women|gynec|fertilit|ivf|obstetric|frauenklinik)/i,
    rejectRe: /(dental|dentist|eye\s*hospital|optician|ortho|bone|spine)/i,
    synonyms: { default: ['Maternity & Fertility Hospitals', 'Women Care & Gynecology Hospitals'] }
  },
  // ── 5. Pediatrics & Child Healthcare ──
  {
    key: 'pediatric_hospital',
    patterns: [/\b(p[ae]diatr\w*|children\s*(?:hospital|clinic)|child\s*specialist|neonat\w*|kinderklinik)\b/i],
    categoryFamily: 'pediatric',
    label: 'Children & Pediatric Hospitals',
    strictFilterRe: /(p[ae]diatr|child|neonat|infant|kinderklinik)/i,
    rejectRe: /(geriatric|eye\s*hospital|optician|dental|dentist)/i,
    synonyms: { default: ['Children & Pediatric Hospitals', 'Neonatal & Child Care Clinics'] }
  },
  // ── 6. Cardiac, Oncology, Neuro, ENT, Gastro, Urology Specific Hospitals ──
  {
    key: 'cardiac_hospital',
    patterns: [/\b(cardiac|cardiolog\w*|heart\s*(?:hospital|cent(?:er|re)|institute)|herzzentrum)\b/i],
    categoryFamily: 'cardiac',
    label: 'Cardiac & Heart Hospitals',
    strictFilterRe: /(cardiac|cardio|heart|vascular|herzzentrum)/i,
    rejectRe: /(dental|dentist|optician|eye\s*hospital|veterinary)/i,
    synonyms: { default: ['Cardiac & Heart Hospitals', 'Cardiology Institutes'] }
  },
  {
    key: 'oncology_hospital',
    patterns: [/\b(oncolog\w*|cancer\s*(?:hospital|cent(?:er|re)|institute))\b/i],
    categoryFamily: 'oncology',
    label: 'Cancer & Oncology Hospitals',
    strictFilterRe: /(oncolog|cancer|tumor|radiotherapy|chemotherapy)/i,
    rejectRe: /(dental|dentist|optician|eye\s*hospital|veterinary)/i,
    synonyms: { default: ['Cancer & Oncology Hospitals', 'Radiation & Medical Oncology Centers'] }
  },
  {
    key: 'ent_hospital',
    patterns: [/\b(\bent\b|ear\s*nose\s*throat|hno[\s-]*klinik)\b/i],
    categoryFamily: 'ent',
    label: 'ENT Hospitals & Clinics',
    strictFilterRe: /(\bent\b|ear|nose|throat|head\s*&\s*neck|audiolog|hno)/i,
    rejectRe: /(dental|dentist|optician|maternity|veterinary)/i,
    synonyms: { default: ['ENT, Head & Neck Hospitals', 'Ear, Nose & Throat Clinics'] }
  },
  // ── 7. Specific Multi-Speciality / Super-Speciality / General Hospital Queries ──
  {
    key: 'multispeciality_hospital',
    patterns: [/\b(multi[\s-]*special\w*\s*hospital\w*|super[\s-]*special\w*\s*hospital\w*|general\s*hospital\w*|trauma\s*(?:care\s*)?hospital\w*)\b/i],
    categoryFamily: 'hospital_specific',
    label: 'Multi-Speciality & General Hospitals',
    strictFilterRe: /(hospital|medical\s*cent(?:er|re)|healthcare|nursing\s*home|trauma|super\s*special|multi\s*special)/i,
    rejectRe: /(optician|lenskart|spectacle|eyewear|\bopticals\b|apollo\s*pharmacy|medical\s*store|pet\s*hospital|animal\s*hospital|veterinary)/i,
    synonyms: { default: ['Multi-Speciality Hospitals', 'Super Speciality Hospitals', 'General Hospitals', 'Trauma & Emergency Hospitals'] }
  },
  // ── 8. Plumbing Service Trades (All 11 Countries — strictly service contractors, never stores/suppliers) ──
  {
    key: 'plumbing_trades',
    patterns: [/\b(plumb\w*|pipe\s*(?:repair|fitter|leak\w*)|drain\w*|leak\w*\s*(?:repair|detection)|boiler\s*(?:repair|service)|gas\s*safe|sewer|septic\s*tank\s*clean\w*|plombier\w*|klempner)\b/i],
    categoryFamily: 'plumbing',
    label: 'Plumbers & Plumbing Contractors',
    strictFilterRe: /\b(plumb\w*|plambar|plambing|pipe\s*(?:repair|fitter|fitting|leak\w*|work\w*)|drain\w*|sewer\w*|septic|leak\w*|water\s*leak\w*|boiler|gas\s*safe|rooter|water\s*works|sanitary\s*(?:inspection|service|contractor|fitting)|plombier\w*|canalisation|klempner|heizung|rohrreinig\w*)\b/i,
    rejectRe: /\b(real\s*estate|builder|apartment\s*(?:building|complex)|housing\s*society|hospital|clinic|dental|dentist|optician|beauty\s*salon|barber|lawyer|restaurant|hotel|training\s*cent\w*|artist|publisher|warehouse|corporate\s*office|electrician\w*|electrical\s*(?:shop|repair|install\w*|engineer|supply|product\w*)|appliance\s*repair|motor\s*repair|machine\s*repair|water\s*purifier|air\s*conditioning|house\s*painter\w*|paint\s*store|tile\s*(?:store|dealer|contractor|fixing)|mirror\s*shop|waterproof\w*|drilling\s*contractor|well\s*drilling|borewell\w*|water\s*tank\w*|pump\s*(?:supplier|dealer|repair)|water\s*pump|submersible|sanitary\s*ware|bathroom\s*(?:supply|fitting|accessory)|pipe\s*(?:supplier|dealer|wholesaler)|geyser|grouting|design\s*engineer|mep\s*design|civil\s*contractor|general\s*contractor|home\s*health|home\s*help|hardware|building\s*material\w*|wholesaler\w*|manufacturer\w*|supplier\w*|dealer\w*|showroom\w*|tools\s*on\s*rent|public\s*bathroom|public\s*toilet|restroom)\b|(?:تركيبات\s*كهربائية|كهربائي|متجر\s*مستلزمات)/i,
    synonyms: {
      IN: [
        'Plumbers', 'Plumbing Contractors', 'Emergency Plumbing Services',
        'Drainage & Septic Tank Cleaning', 'Water Leak Detection Services',
        'Bathroom & Kitchen Pipe Fitting'
      ],
      US: [
        'Plumbers', 'Emergency Plumbing & Rooter', 'Drain Cleaning & Hydro Jetting',
        'Water Heater & Tankless Repair', 'Sewer Line & Trenchless Repair',
        'Commercial Plumbing Contractors'
      ],
      CA: [
        'Plumbers', 'Emergency Plumbing & Rooter', 'Drain Cleaning & Hydro Jetting',
        'Water Heater & Boiler Repair', 'Commercial Plumbing Contractors'
      ],
      GB: [
        'Plumbers & Heating Engineers', 'Gas Safe Boiler Repair',
        'Emergency Drainage & Blocked Drains', 'Bathroom Fitters & Plumbing',
        'Commercial Plumbing Contractors'
      ],
      AU: [
        'Licensed Plumbers & Gasfitters', 'Blocked Drains & Hydro-Jetting',
        'Hot Water System Specialists', 'Roof Plumbing & Stormwater',
        'Commercial Plumbing Contractors'
      ],
      AE: ['Plumbing Contractors & Maintenance', 'MEP Plumbing Services', 'Drainage & Pipe Repair', 'Emergency Leak Repair'],
      default: ['Plumbers', 'Emergency Plumbing & Drain Repair', 'Water Heater & Boiler Service', 'Commercial Plumbing Contractors']
    }
  },
  // ── 8b. Borewell & Water Pump Repair Services ──
  {
    key: 'borewell_pump_repair',
    patterns: [/\b(borewell\w*|submersible\s*pump\s*repair|water\s*pump\s*repair|motor\s*winding)\b/i],
    categoryFamily: 'plumbing',
    label: 'Borewell & Water Pump Repair Services',
    strictFilterRe: /\b(borewell|submersible|water\s*pump|pump\s*repair|motor\s*winding|drilling)\b/i,
    rejectRe: /\b(supplier|dealer|wholesaler|store|shop|showroom|hospital|clinic|dental|lawyer)\b/i,
    synonyms: {
      IN: ['Borewell & Submersible Pump Repair', 'Water Pump Repair & Winding Services', 'Borewell Drilling Contractors'],
      US: ['Well Pump Repair Services', 'Submersible Pump Service Contractors'],
      GB: ['Water Pump & Borehole Engineers', 'Booster Pump Repair Services'],
      AU: ['Bore Pump Repair & Service', 'Submersible Water Pump Technicians'],
      AE: ['Water Booster Pump Repair', 'MEP Submersible Pump Maintenance'],
      default: ['Water Pump Repair & Service', 'Submersible Pump Technicians']
    }
  },
  // ── 8c. Geyser & Appliance Repair Services ──
  {
    key: 'geyser_appliance_repair',
    patterns: [/\b(geyser\s*repair|water\s*heater\s*repair|appliance\s*repair|washing\s*machine\s*repair)\b/i],
    categoryFamily: 'appliances',
    label: 'Geyser & Home Appliance Repair Services',
    strictFilterRe: /\b(geyser|water\s*heater|appliance\s*repair|washing\s*machine|refrigerator\s*repair|microwave\s*repair)\b/i,
    rejectRe: /\b(dealer|supplier|store|showroom|wholesaler|hospital|clinic|lawyer)\b/i,
    synonyms: {
      IN: ['Geyser & Water Heater Repair', 'Washing Machine & Fridge Repair', 'Home Appliance Service Centers'],
      US: ['Appliance Repair Services', 'Water Heater Repair Technicians'],
      GB: ['Domestic Appliance Repair Engineers', 'Boiler & Water Heater Repair'],
      AU: ['Hot Water & Appliance Repair', 'Whitegoods Repair Technicians'],
      AE: ['Home Appliance & Water Heater Repair', 'Kitchen Appliance Maintenance'],
      default: ['Home Appliance Repair Services', 'Water Heater Repair Technicians']
    }
  },
  // ── 8d. Company Formation, PRO & Business Setup Services ──
  {
    key: 'business_formation_pro',
    patterns: [/\b(company\s*formation|business\s*setup|pro\s*services|freezone\s*setup|gst\s*registration|roc\s*filing)\b/i],
    categoryFamily: 'corporate',
    label: 'Company Formation & Corporate PRO Services',
    strictFilterRe: /\b(formation|business\s*setup|pro\s*service|freezone|licensing|corporate\s*service|registration|company\s*secretary)\b/i,
    rejectRe: /\b(hospital|clinic|plumber|electrician|restaurant|hotel|store|shop)\b/i,
    synonyms: {
      IN: ['Company Registration & ROC Consultants', 'GST & Startup Compliance Firms', 'MSME & Trademark Consultants'],
      US: ['LLC & Corporate Formation Services', 'Registered Agent & Business Licensing'],
      GB: ['Company Formation Agents', 'Corporate Secretarial & Compliance Firms'],
      AU: ['ASIC Company Registration Agents', 'Business Setup & ABN Advisors'],
      AE: ['Dubai & Abu Dhabi PRO Services', 'Freezone & Mainland Business Setup', 'DED Licensing & Golden Visa Consultants'],
      default: ['Company Formation Consultants', 'Business Licensing & PRO Services']
    }
  },
  // ── 9. Electrical & Solar ──
  {
    key: 'electrical_trades',
    patterns: [/\b(electr\w*(?!.*goods|.*store|.*shop|.*dealer)|wiring|switchboard|inverter\s*repair|ups\s*repair|solar\s*installer|elektrik\w*|électricien\w*)\b/i],
    categoryFamily: 'electrical',
    label: 'Electricians & Electrical Contractors',
    strictFilterRe: /(electr|wiring|circuit|switchboard|inverter|generator|transformer|elektro|électricien)/i,
    rejectRe: /(plumb|pipe|drain|roof|paint|carpet|beauty\s*salon)/i,
    synonyms: {
      IN: ['Electricians', 'Electrical Contractors', 'Inverter & UPS Battery Repair', 'House Wiring & Switchboard Repair', 'Generator & Transformer Maintenance'],
      US: ['Licensed Electricians', 'Commercial Electrical Contractors', 'Electrical Panel & Rewiring', 'EV Charger Installation', 'Emergency Electricians'],
      GB: ['NICEIC Electricians', 'Domestic Rewiring & Consumer Units', 'Commercial Electrical Contractors', 'EV Charger Installers'],
      AU: ['Licensed Master Electricians', 'Switchboard & Rewiring Specialists', '24/7 Emergency Electricians', 'EV Charger Installers'],
      AE: ['DEWA Approved Electrical Contractors', 'MEP Electrical Maintenance', 'Switchgear & Cabling Contractors'],
      default: ['Licensed Electrical Contractors', 'Residential & Commercial Electricians', 'Wiring & EV Charger Installers']
    }
  },
  // ── 10. HVAC, Roofing, Pest Control, Cleaning, Painting, Solar ──
  {
    key: 'hvac_trades',
    patterns: [/\b(hvac|air\s*conditioning|ac\s*(?:repair|service|installation)|aircon|heating\s*contractor|chiller)\b/i],
    categoryFamily: 'hvac',
    label: 'HVAC & Air Conditioning Contractors',
    strictFilterRe: /(hvac|air\s*condition|\bac\b|aircon|cooling|heating|furnace|duct|chiller|ventilation|refrigerat)/i,
    rejectRe: /(beauty\s*salon|dental|hospital|lawyer)/i,
    synonyms: {
      IN: ['AC Repair & Service', 'Split & Window AC Installation', 'HVAC & VRF Commercial Contractors', 'Cold Storage & Chiller Repair'],
      US: ['HVAC Contractors', 'Air Conditioning Repair & Service', 'Heating & Furnace Repair', 'Duct Cleaning & Ventilation'],
      GB: ['Air Conditioning Engineers', 'Commercial HVAC & Heat Pump Contractors', 'Ventilation & Chiller Engineers'],
      AU: ['Air Conditioning Installers & Repair', 'Ducted HVAC Specialists', 'Commercial Refrigeration & Cooling'],
      AE: ['AC Maintenance & Duct Cleaning', 'HVAC Chillers & VRF Contractors', 'District Cooling Maintenance'],
      default: ['HVAC Contractors', 'Air Conditioning Repair & Service', 'Heating & Ventilation Contractors']
    }
  },
  {
    key: 'roofing_trades',
    patterns: [/\b(roof\w*|gutter|shingle|fascia|waterproofing|terrace\s*leak|dachdecker\w*|couvreur\w*)\b/i],
    categoryFamily: 'roofing',
    label: 'Roofing & Waterproofing Contractors',
    strictFilterRe: /(roof|gutter|shingle|fascia|waterproof|damp\s*proof|leak|epoxy|dachdecker|couvreur|étanchéité)/i,
    rejectRe: /(electr|flooring|carpet|beauty\s*salon)/i,
    synonyms: {
      IN: ['Waterproofing Contractors', 'Terrace & Roof Leakage Repair', 'Roofing Sheet & Shed Contractors', 'Epoxy Grouting & Damp Proofing'],
      US: ['Residential Roofing Contractors', 'Commercial Flat Roofing', 'Storm Damage & Gutter Repair'],
      GB: ['Roofing Contractors & Roofers', 'Flat Roof & Leadwork Specialists', 'Damp Proofing & Gutter Repair'],
      AU: ['Metal & Tile Roofers', 'Roof Restoration & Gutter Guards', 'Waterproofing & Membrane Contractors'],
      AE: ['Roof Waterproofing Contractors', 'Terrace Thermal & Leak Insulation', 'Industrial Roofing & Cladding'],
      default: ['Roofing Contractors & Roof Repair', 'Commercial & Residential Roofing', 'Waterproofing & Gutter Specialists']
    }
  },
  {
    key: 'pest_control',
    patterns: [/\b(pest\s*control|termite|cockroach|rodent|fumigation|exterminator|bed\s*bug)\b/i],
    categoryFamily: 'pest_control',
    label: 'Pest Control & Termite Services',
    strictFilterRe: /(pest|termite|cockroach|rodent|fumigat|exterminat|bed\s*bug|mosquito|sanitiz)/i,
    rejectRe: /(hospital|clinic|restaurant|hotel)/i,
    synonyms: {
      IN: ['Pest Control Services', 'Termite Treatment & Anti-Termite', 'Cockroach & Bed Bug Control', 'Rodent & Mosquito Fogging'],
      US: ['Pest Control & Exterminators', 'Termite Inspection & Treatment', 'Commercial Wildlife & Rodent Removal'],
      GB: ['BPCA Pest Control Services', 'Rodent & Wasp Nest Removal', 'Commercial Pest Management'],
      AU: ['Licensed Pest & Termite Control', 'Pre-Purchase Timber Pest Inspections', 'Cockroach & Spider Treatment'],
      AE: ['Dubai Municipality Approved Pest Control', 'Termite & Bed Bug Control', 'Commercial Sanitization & Fumigation'],
      default: ['Pest Control Services', 'Termite Inspection & Treatment', 'Commercial Exterminators']
    }
  },
  {
    key: 'cleaning_services',
    patterns: [/\b(cleaning\s*service|deep\s*cleaning|housekeeping|janitorial|sofa\s*cleaning|carpet\s*cleaning|facility\s*management)\b/i],
    categoryFamily: 'cleaning',
    label: 'Deep Cleaning & Facility Services',
    strictFilterRe: /(clean|housekeep|janitor|facility|carpet|sofa|maid|sanitiz|tank\s*clean)/i,
    rejectRe: /(dry\s*clean\s*clothes|laundry\s*only|hospital)/i,
    synonyms: {
      IN: ['Home Deep Cleaning Services', 'Office & Commercial Housekeeping', 'Water Tank & Sump Cleaning', 'Sofa & Carpet Cleaning'],
      US: ['Commercial Janitorial & Office Cleaning', 'Residential Deep Cleaning', 'Carpet & Upholstery Cleaning'],
      GB: ['Commercial Office Cleaning', 'End of Tenancy & Deep Cleaning', 'Carpet & Oven Cleaning Services'],
      AU: ['Commercial & Strata Cleaning', 'Bond & End of Lease Cleaning', 'Carpet & Water Tank Cleaning'],
      AE: ['Deep Villa & Apartment Cleaning', 'Water Tank Cleaning & Disinfection', 'Commercial Facility Management'],
      default: ['Commercial Cleaning & Janitorial', 'Residential Deep Cleaning', 'Carpet & Upholstery Cleaning']
    }
  },
  {
    key: 'solar_energy',
    patterns: [/\b(solar|photovoltaic|rooftop\s*solar|solar\s*panel|solar\s*water\s*heater)\b/i],
    categoryFamily: 'solar',
    label: 'Solar EPC & Renewable Energy',
    strictFilterRe: /(solar|photovoltaic|pv\b|inverter|renewable|battery\s*storage)/i,
    rejectRe: /(beauty|salon|hospital)/i,
    synonyms: {
      IN: ['Solar EPC Contractors', 'Rooftop Solar Installers', 'Solar Water Heater Installers', 'Commercial Solar Systems'],
      US: ['Residential Solar Installers', 'Commercial Solar EPC', 'Solar Battery & Backup Systems'],
      GB: ['MCS Accredited Solar PV Installers', 'Solar Battery Storage Installers', 'Commercial Rooftop Solar'],
      AU: ['CEC Accredited Solar Installers', 'Rooftop Solar & Home Battery Systems', 'Commercial Solar Energy'],
      AE: ['DEWA Shams Solar Contractors', 'Commercial Solar EPC', 'Solar Water Heating Systems'],
      default: ['Residential Solar Installers', 'Commercial Solar Contractors', 'Solar Energy & Battery Storage']
    }
  },
  // ── 11. Legal Niches ──
  {
    key: 'personal_injury',
    patterns: [/\b(personal\s*injury|accident\s*lawyer|car\s*accident|slip\s*and\s*fall)\b/i],
    categoryFamily: 'legal',
    label: 'Personal Injury Law',
    strictFilterRe: /(personal\s*injury|accident|slip\s*and\s*fall|catastrophic|injury\s*law)/i,
    rejectRe: /(divorce|family\s*law|corporate\s*tax|estate\s*planning)/i,
    synonyms: { default: ['Personal Injury Law Firms', 'Accident Trial Lawyers'] }
  },
  {
    key: 'divorce_family',
    patterns: [/\b(divorce|family\s*law|child\s*custody|matrimonial)\b/i],
    categoryFamily: 'legal',
    label: 'Divorce & Family Law',
    strictFilterRe: /(divorce|family\s*law|child\s*custody|matrimonial)/i,
    rejectRe: /(personal\s*injury|accident|corporate\s*tax|criminal)/i,
    synonyms: { default: ['Family Law & Divorce Attorneys', 'Child Custody Advocates'] }
  }
];

function classifyQuery(query, countryCode = 'IN') {
  const code = String(countryCode || 'IN').toUpperCase();
  const clean = String(query || '').trim();
  const lower = clean.toLowerCase();
  const intent = detectIntentAndProduct(clean, code);

  // 1. Check Exhaustive Generic Umbrella Registry FIRST
  const umbrella = resolveUmbrella(clean, code);
  if (umbrella) {
    return {
      ...umbrella,
      intentType: resolveIntentForUmbrellaKey(umbrella.key),
      businessModelLabel: intent.businessModelLabel
    };
  }

  // 2. Check Product -> Related Stores / Showrooms / Malls BEFORE generic service trades
  if (intent.matchedProduct) {
    const mp = intent.matchedProduct;
    return {
      key: mp.key,
      isGeneric: false,
      isParticular: true,
      isProductQuery: true,
      intentType: 'store',
      businessModelLabel: 'Product Store / Showroom',
      mode: 'product_store_purity',
      label: mp.label,
      categoryFamily: 'retail_store',
      countryCode: code,
      strictFilterRe: mp.strictFilterRe || null,
      rejectRe: /(repair\s*only|freelance\s*technician|hospital|clinic|lawyer)/i,
      subvectors: mp.subvectors
    };
  }

  // 3. Check All 16 Medical Specialist & Trade Service Niches
  for (const niche of [...SPECIALIST_NICHES, ...PARTICULAR_NICHE_REGISTRY]) {
    if (niche.patterns.some((p) => p.test(lower))) {
      const syns = (niche.synonyms[code]) || ((code === 'IE' || code === 'AU' || code === 'NZ') && niche.synonyms.GB) || niche.synonyms.default;
      return {
        key: niche.key,
        isGeneric: false,
        isParticular: true,
        intentType: intent.intentType || 'service',
        businessModelLabel: intent.businessModelLabel,
        mode: 'laser_domain_purity',
        label: niche.label,
        categoryFamily: niche.categoryFamily,
        countryCode: code,
        strictFilterRe: niche.strictFilterRe || null,
        rejectRe: niche.rejectRe || null,
        subvectors: syns
      };
    }
  }

  // 4. Check Pan-India & Global Commodity Trade Entities (Turmeric, Chilli, Cotton, Rice, Steel, etc.)
  const commodity = resolveCommodity(lower);
  if (commodity) {
    return {
      key: `commodity_${commodity.key}`,
      isGeneric: false,
      isParticular: true,
      intentType: 'b2b',
      businessModelLabel: 'Commodity Mandi & Mill Processing Unit',
      isProductQuery: false,
      mode: 'laser_domain_purity',
      label: commodity.label,
      categoryFamily: 'agro_commodity',
      countryCode: code,
      strictFilterRe: new RegExp(`(?:${commodity.key}|mill|processing|trader|wholesal|mandi|apmc|agro)`, 'i'),
      rejectRe: /\b(book\s*store|computer|laptop|mobile|shoe|clothing|hospital|clinic|doctor|dentist|salon)\b/i,
      subvectors: commodity.subvectors
    };
  }

  // Multi-word & compound niche fallback: split `&` / `/` / `and` as OR clauses; match any core domain noun cleanly
  const clauses = lower
    .split(/\s*(?:&|\/|\band\b|,)\s*/i)
    .map((c) => c.trim())
    .filter(Boolean);

  const domainTokens = [];
  const intentWords = [];
  const ENTITY_TERMS = /^(near|with|best|top|service|services|center|centre|company|companies|care|clinic|clinics|hospital|hospitals|store|stores|shop|shops|dealer|dealers|supplier|suppliers|merchant|merchants|distributor|distributors|contractor|contractors|wholesale|wholesaler|wholesalers)$/i;

  for (const clause of clauses) {
    const normalizedClause = clause.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const rawWords = normalizedClause.split(/\s+/).map((w) => w.replace(/[^a-z0-9]/g, '')).filter(Boolean);
    for (const w of rawWords) {
      if (w.length < 3) continue;
      if (ENTITY_TERMS.test(w)) {
        intentWords.push(w);
      } else {
        domainTokens.push(w);
      }
    }
  }

  // Deduplicate domain tokens and form clean search stems (min length 3, strip trailing suffixes)
  const uniqueStems = [];
  for (const w of Array.from(new Set(domainTokens))) {
    const stripped = w.replace(/(?:ing|ers?|ies|ed|s)$/i, '');
    const baseStem = (stripped.length >= 3 ? stripped : w).slice(0, 6).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    uniqueStems.push(baseStem);
    if (w.startsWith('semiconductor')) uniqueStems.push('semi');
  }
  const stems = uniqueStems.length > 0 ? uniqueStems : ['commercial'];

  // Build OR-based filter: matches ANY valid domain noun (never force simultaneous AND-lookaheads on multiple domains)
  const customFilter = new RegExp(stems.map((s) => `(?:${s})`).join('|'), 'i');

  // Sector-aware reject regex: if chemical/paint/construction, strictly block book stores, electronics, saw mills, seeds
  let sectorRejectRe = null;
  const isChemicalPaintQuery = /(?:paint|waterproof|chemi|coat|hardware|tile|marble|granite|cement|steel)/i.test(lower);
  if (isChemicalPaintQuery) {
    sectorRejectRe = /\b(book\s*(?:store|shop)|stationery|computer|laptop|mobile\s*phone|electronics\s*store|saw\s*mill|timber|seed\s*store|fertilizer|pesticide|pharmacy|chemist|dental|hospital|clinic|doctor|jewell?er|clothing|apparel|shoe\s*store|bakery|restaurant|hotel)\b/i;
  }

  // Generate 3-5 clean, authentic subvectors dynamically
  const isStoreIntent = intent.intentType === 'store' || /store|shop|dealer|showroom|supplier/i.test(lower);
  const headTerm = isStoreIntent ? 'Stores & Dealers' : intent.intentType === 'service' ? 'Services & Contractors' : 'Enterprises';
  const dynamicSubvectors = [];
  for (const clause of clauses) {
    const cleanClause = clause.replace(ENTITY_TERMS, '').trim();
    if (cleanClause.length >= 3) {
      const capClause = cleanClause.charAt(0).toUpperCase() + cleanClause.slice(1);
      dynamicSubvectors.push(`${capClause} ${headTerm}`);
    }
  }
  if (isChemicalPaintQuery) {
    dynamicSubvectors.push('Paint Stores & Dealers', 'Waterproofing Chemical Suppliers', 'Construction Chemical Dealers');
  }
  const cleanSubvectors = Array.from(new Set(dynamicSubvectors)).slice(0, 5);

  return {
    key: `custom_${stems.slice(0, 3).join('_')}`,
    isGeneric: false,
    isParticular: true,
    intentType: intent.intentType,
    businessModelLabel: intent.businessModelLabel,
    isProductQuery: intent.isProductQuery,
    mode: 'direct_niche',
    label: clean,
    categoryFamily: isChemicalPaintQuery ? 'construction_chemicals' : intent.intentType === 'store' ? 'retail_store' : 'custom',
    countryCode: code,
    strictFilterRe: customFilter,
    rejectRe: sectorRejectRe,
    subvectors: cleanSubvectors
  };
}

module.exports = { PARTICULAR_NICHE_REGISTRY, classifyQuery, passesUniversalPurityGate };
