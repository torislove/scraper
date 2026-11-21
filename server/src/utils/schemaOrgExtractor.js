/**
 * schemaOrgExtractor.js
 *
 * Zero-Fee, In-Process Schema.org JSON-LD Extractor & NAICS Sector Resolver
 *
 * Extracts structured machine-readable microdata directly from web page HTML
 * without external APIs or paid parsers. Maps standard Schema.org entity types
 * to official NAICS 2022 economic sectors.
 */

const cheerio = require('cheerio');

// Map Schema.org LocalBusiness sub-types directly to NAICS 2022 Sector Codes
const SCHEMA_TYPE_TO_NAICS = {
  // Healthcare & Social Assistance (62)
  Dentist: '62',
  MedicalClinic: '62',
  Hospital: '62',
  Physician: '62',
  MedicalBusiness: '62',
  DiagnosticLab: '62',
  Pharmacy: '62',

  // Accommodation & Food Services (72)
  Bakery: '72',
  Restaurant: '72',
  CafeOrCoffeeShop: '72',
  BarOrPub: '72',
  FastFoodRestaurant: '72',
  IceCreamShop: '72',
  Hotel: '72',
  Motel: '72',
  Hostel: '72',
  Resort: '72',
  BedAndBreakfast: '72',
  FoodEstablishment: '72',

  // Other Services - Personal Care & Repair (81)
  AutoRepair: '81',
  AutoBodyShop: '81',
  BeautySalon: '81',
  HairSalon: '81',
  NailSalon: '81',
  DaySpa: '81',
  Locksmith: '81',
  DryCleaningOrLaundry: '81',
  ShoeRepair: '81',
  TattooParlor: '81',

  // Construction & Contracting (23)
  Electrician: '23',
  Plumber: '23',
  GeneralContractor: '23',
  RoofingContractor: '23',
  HVACBusiness: '23',
  Painter: '23',
  HomeAndConstructionBusiness: '23',

  // Wholesale Trade (42)
  WholesaleStore: '42',

  // Retail Trade (44-45)
  Store: '44-45',
  ClothingStore: '44-45',
  JewelryStore: '44-45',
  ElectronicsStore: '44-45',
  GroceryStore: '44-45',
  HardwareStore: '44-45',
  ShoeStore: '44-45',
  BookStore: '44-45',
  FurnitureStore: '44-45',
  PetStore: '44-45',
  Florist: '44-45',
  DepartmentStore: '44-45',
  ShoppingCenter: '44-45',

  // Professional, Scientific & Technical (54)
  AccountingService: '54',
  LegalService: '54',
  Attorney: '54',
  ArchitecturalService: '54',
  ResearchOrganization: '54',
  EngineeringService: '54',
  ProfessionalService: '54',

  // Arts, Entertainment & Recreation (71)
  ExerciseGym: '71',
  HealthClub: '71',
  SportsClub: '71',
  StadiumOrArena: '71',
  MovieTheater: '71',
  AmusementPark: '71',
  Museum: '71',
  ArtGallery: '71',
  EntertainmentBusiness: '71',

  // Educational Services (61)
  School: '61',
  CollegeOrUniversity: '61',
  Preschool: '61',
  EducationalOrganization: '61',

  // Finance and Insurance (52)
  BankOrCreditUnion: '52',
  FinancialService: '52',
  InsuranceAgency: '52',

  // Real Estate (53)
  RealEstateAgent: '53',

  // Transportation & Warehousing (48-49)
  MovingCompany: '48-49',
  CargoDelivery: '48-49'
};

/**
 * Resolves NAICS sector code from Schema.org @type (handling arrays and string values).
 */
function mapSchemaTypeToNaics(schemaType) {
  if (!schemaType) return null;
  const types = Array.isArray(schemaType) ? schemaType : [schemaType];
  for (const t of types) {
    const cleanType = String(t).replace(/^https?:\/\/schema\.org\//i, '').trim();
    if (SCHEMA_TYPE_TO_NAICS[cleanType]) {
      return SCHEMA_TYPE_TO_NAICS[cleanType];
    }
  }
  return null;
}

/**
 * Extracts and parses all JSON-LD blocks from HTML.
 */
function extractSchemaOrgEntities(html) {
  if (!html || typeof html !== 'string') return [];
  const entities = [];

  try {
    const $ = cheerio.load(html);
    $('script[type="application/ld+json"]').each((_, elem) => {
      try {
        const rawText = $(elem).html();
        if (!rawText) return;
        const parsed = JSON.parse(rawText.trim());
        if (Array.isArray(parsed)) {
          entities.push(...parsed);
        } else if (parsed && parsed['@graph'] && Array.isArray(parsed['@graph'])) {
          entities.push(...parsed['@graph']);
        } else if (parsed && typeof parsed === 'object') {
          entities.push(parsed);
        }
      } catch (err) {
        // Silently skip malformed JSON blocks
      }
    });
  } catch (e) {}

  return entities;
}

/**
 * Normalizes address structure from Schema.org PostalAddress.
 */
function formatPostalAddress(addr) {
  if (!addr) return '';
  if (typeof addr === 'string') return addr.trim();

  const parts = [
    addr.streetAddress,
    addr.addressLocality,
    addr.addressRegion,
    addr.postalCode,
    addr.addressCountry
  ].filter(Boolean);

  return parts.join(', ').trim();
}

/**
 * Extracts the primary LocalBusiness / Organization entity from page HTML.
 */
function extractPrimaryBusiness(html) {
  const entities = extractSchemaOrgEntities(html);
  if (!entities.length) return null;

  // Search for LocalBusiness or Organization or known commercial types
  for (const ent of entities) {
    if (!ent || typeof ent !== 'object') continue;
    const type = ent['@type'];
    if (!type) continue;

    const types = Array.isArray(type) ? type : [type];
    const isBusiness = types.some(t => {
      const clean = String(t).replace(/^https?:\/\/schema\.org\//i, '');
      return clean === 'LocalBusiness' || clean === 'Organization' || clean === 'Place' || SCHEMA_TYPE_TO_NAICS[clean];
    });

    if (isBusiness && ent.name) {
      const lat = ent.geo ? Number(ent.geo.latitude) : null;
      const lng = ent.geo ? Number(ent.geo.longitude) : null;
      const primaryType = Array.isArray(type) ? type[0] : type;
      const naicsCode = mapSchemaTypeToNaics(type);

      return {
        name: String(ent.name).trim(),
        schemaType: String(primaryType).replace(/^https?:\/\/schema\.org\//i, ''),
        naicsCode: naicsCode || null,
        phone: ent.telephone ? String(ent.telephone).trim() : null,
        email: ent.email ? String(ent.email).trim() : null,
        address: formatPostalAddress(ent.address),
        latitude: Number.isFinite(lat) ? lat : null,
        longitude: Number.isFinite(lng) ? lng : null,
        website: ent.url ? String(ent.url).trim() : null,
        priceRange: ent.priceRange || null,
        description: ent.description ? String(ent.description).trim() : null
      };
    }
  }

  return null;
}

module.exports = {
  SCHEMA_TYPE_TO_NAICS,
  mapSchemaTypeToNaics,
  extractSchemaOrgEntities,
  extractPrimaryBusiness
};
