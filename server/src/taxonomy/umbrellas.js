'use strict';

/**
 * server/src/taxonomy/umbrellas.js
 * Exhaustive Generic Umbrella Sub-Category Matrix across 15 Major Commercial Sectors
 * and 11 Sovereign Nations (IN, US, GB, AU, CA, DE, FR, AE, SG, NZ, IE).
 * Every sub-category in an umbrella is searched in EVERY municipal zone.
 */

const { DOCTOR_16_BY_COUNTRY } = require('./specialists');
const {
  DENTAL_SUBS_BY_COUNTRY,
  HOTEL_SUBS_BY_COUNTRY,
  AUTOMOTIVE_SUBS_BY_COUNTRY,
  SALON_SUBS_BY_COUNTRY,
  REAL_ESTATE_SUBS_BY_COUNTRY,
  MANUFACTURING_SUBS_BY_COUNTRY,
  WHOLESALE_SUBS_BY_COUNTRY,
  DIAGNOSTICS_SUBS_BY_COUNTRY,
  RETAIL_SUBS_BY_COUNTRY,
  IT_SOFTWARE_SUBS_BY_COUNTRY,
  LOGISTICS_SUBS_BY_COUNTRY,
  FITNESS_SUBS_BY_COUNTRY,
  EVENTS_SUBS_BY_COUNTRY,
  VETERINARY_SUBS_BY_COUNTRY
} = require('./umbrellaSubs');

const HOSPITAL_SUBS_BY_COUNTRY = {
  IN: [
    'Multi-Speciality Hospitals', 'Super Speciality Hospitals', 'General Hospitals & Nursing Homes',
    'Dental Hospitals', 'Orthopedic & Joint Replacement Hospitals', 'Eye Hospitals & Netralayam',
    'Maternity, Gynecology & IVF Hospitals', 'Children & Pediatric Hospitals', 'Cardiac & Heart Hospitals',
    'Cancer & Oncology Hospitals', 'Neurology, Brain & Spine Hospitals', 'ENT, Head & Neck Hospitals',
    'Gastroenterology & Liver Hospitals', 'Kidney, Urology & Dialysis Hospitals', 'Trauma & Emergency Care Hospitals'
  ],
  US: [
    'Regional Medical Centers', 'Acute Care & General Hospitals', 'Multi-Specialty Health Systems',
    'Dental & Oral Surgery Hospitals', 'Orthopedic & Spine Centers', 'Ophthalmic & Eye Institutes',
    'Women & Maternity Hospitals', 'Children\'s Hospitals', 'Heart & Vascular Institutes',
    'Cancer Treatment Centers', 'Neurology & Stroke Centers', 'ENT & Head-Neck Centers',
    'Digestive & Liver Centers', 'Urology & Kidney Centers', 'Level I Trauma & Emergency Hospitals'
  ],
  GB: [
    'Multi-Speciality Private Hospital', 'NHS Trust & Acute Hospital', 'General Hospital & Infirmary',
    'Dental Hospital', 'Orthopaedic & Spine Hospital', 'Ophthalmic & Eye Hospital',
    'Maternity & Women Hospital', 'Children & Paediatric Hospital', 'Cardiac & Heart Hospital',
    'Cancer & Oncology Centre', 'Neurology & Neurosurgery Hospital', 'ENT Hospital',
    'Gastroenterology Hospital', 'Urology & Renal Hospital', 'Trauma & Urgent Care Hospital'
  ],
  AU: [
    'Public & Private Hospitals', 'Regional Base Hospitals', 'Day Surgery & Specialist Hospitals',
    'Dental Hospitals', 'Orthopaedic & Joint Replacement Hospitals', 'Eye & Ophthalmic Hospitals',
    'Maternity & Women\'s Hospitals', 'Children\'s & Paediatric Hospitals', 'Cardiac & Heart Hospitals',
    'Oncology & Cancer Centres', 'Neurology & Spine Hospitals', 'ENT Hospitals',
    'Gastroenterology Hospitals', 'Urology & Renal Hospitals', 'Emergency & Trauma Hospitals'
  ],
  AE: [
    'Multi-Specialty Hospitals', 'JCI Accredited Medical Centers', 'Private & Government Hospitals',
    'Dental Hospitals & Surgical Centers', 'Orthopedic & Spine Centers', 'Eye & Ophthalmology Hospitals',
    'Maternity & IVF Hospitals', 'Pediatric Hospitals', 'Cardiac & Heart Centers',
    'Oncology & Cancer Hospitals', 'Neurology & Neurosurgery Centers', 'ENT & Sinus Hospitals',
    'Gastroenterology Hospitals', 'Urology & Kidney Centers', '24/7 Emergency & Trauma Hospitals'
  ],
  default: [
    'Multi-Speciality Hospitals', 'Super Speciality Medical Centers', 'General Hospitals',
    'Dental Hospitals', 'Orthopedic & Spine Hospitals', 'Eye & Ophthalmic Hospitals',
    'Maternity, Women & Fertility Hospitals', 'Children & Pediatric Hospitals', 'Cardiac & Heart Hospitals',
    'Cancer & Oncology Hospitals', 'Neurology & Neurosurgery Hospitals', 'ENT, Head & Neck Hospitals',
    'Gastroenterology Hospitals', 'Kidney, Urology & Dialysis Hospitals', 'Trauma & Emergency Hospitals'
  ]
};

const UMBRELLA_REGISTRY = [
  {
    key: 'hospitals',
    label: 'Hospitals (All Specialties)',
    matchRe: /^(?:hospitals?(?:\s*(?:&|and|\/)\s*nursing\s*homes?)?|general\s*hospitals?|multi[\s-]*speciali?ty\s*hospitals?|super[\s-]*speciali?ty\s*hospitals?|krankenh(?:aus|äuser)|kliniken|h[oô]pitaux|h[oô]pital|medical\s+cent(?:er|re)s?)$/i,
    strictFilterRe: /(hospital|krankenhaus|klinik|klinikum|h[oô]pital|clinique|medical\s*cent(?:er|re)|nursing\s*home|infirmary|netralaya|netralayam|trauma|maternity|herzzentrum|unfallklinik|sanatorium|health\s*cent(?:er|re)|medicity)/i,
    rejectRe: /(optician|lenskart|spectacle|eyewear|sunglass|eye\s*care\s*opticals|\bopticals\b|apollo\s*pharmacy|medplus|medical\s*store|\bchemist\b|pet\s*hospital|animal\s*hospital|veterinary|\bvet\s*clinic\b|dog\s*clinic|medical\s*equipment\s*supplier)/i,
    subcategoriesByCountry: HOSPITAL_SUBS_BY_COUNTRY
  },
  {
    key: 'clinics',
    label: 'Medical Clinics & Doctors (All 16 Specialties)',
    matchRe: /^(?:clinics?(?:\s*(?:&|and|\/)\s*doctors?)?|medical\s+clinics?|doctors?(?:\s*(?:&|and|\/)\s*clinics?)?|physicians?|polyclinics?|arztprax(?:is|en)|[aä]rzte|cabinets?\s+m[eé]dicaux|m[eé]decins?)$/i,
    strictFilterRe: /(clinic|doctor|physician|polyclinic|specialist|dent|ortho|eye|ophthalm|dermat|skin|pediatr|ent\b|gynec|cardio|neuro|gastro|urolog|oncolog|diabet|endocrin|pulmon|nephrol|psychiatr|physio|diagnostic|patholog|praxis|arzt|cabinet|m[eé]decin)/i,
    rejectRe: /(pet\s*clinic|animal\s*clinic|veterinary|lenskart|\bopticals\b|optician|eyewear|sunglass|medical\s*store|\bchemist\b)/i,
    subcategoriesByCountry: DOCTOR_16_BY_COUNTRY
  },
  {
    key: 'dental',
    label: 'Dental & Oral Care (All Sub-Categories)',
    matchRe: /^(?:dental|dentists?(?:\s*(?:&|and|\/)\s*dental\s*(?:hospitals?|clinics?|care))?|dental\s*(?:hospitals?|clinics?|practices?|surger(?:y|ies)|care)|dentistry|zahn(?:arzt|ärzte|medizin|klinik)|dentistes?)$/i,
    strictFilterRe: /(dental|dentist|orthodont|endodont|teeth|tooth|dental\s*implant|periodont|prosthodont|oral\s*care|oral\s*surgery|dento|zahn|chirurgien\s*dentiste|cabinet\s*dentaire)/i,
    rejectRe: /(eye\s*clinic|eye\s*hospital|optician|lenskart|optical|netralaya|ophthalmolog|maternity|fertility|gynec|orthopedic|ortho\s*care|general\s*hospital|hair\s*implant|breast\s*implant|cochlear|veterinary)/i,
    subcategoriesByCountry: DENTAL_SUBS_BY_COUNTRY
  },
  {
    key: 'schools',
    label: 'Schools (All Sub-Categories)',
    matchRe: /^(?:schools?|education|schulen|[eé]coles?)$/i,
    strictFilterRe: /(school|academy|vidyalaya|montessori|kindergarten|preschool|high\s*school|public\s*school|convent|grammar\s*school|schule|[eé]cole|lyc[eé]e)/i,
    rejectRe: /(driving\s*school|motor\s*training|dog\s*training|pet\s*school|bookstore|uniform\s*shop|plant\s*nursery|garden\s*cent(?:er|re)|hairdresser|beauty\s*(?:school|therapy|academy)|scuba|diving\s*instructor|martial\s*arts|karate|taekwondo|kickboxing|samba\s*school|flamenco\s*school|salsa\s*school|dance\s*(?:school|studio|academy)|ballet\s*school|religious\s*organi[sz]ation|church|mosque|temple|synagogue|swim\s*school|language\s*school)/i,
    subcategoriesByCountry: {
      IN: ['CBSE & ICSE High Schools', 'International & IB Schools', 'State Board High Schools', 'Primary & Elementary Schools', 'Montessori & Play Schools', 'Residential & Convent Schools'],
      US: ['Public & Charter High Schools', 'Private & Preparatory Schools', 'Elementary & Middle Schools', 'STEM & Magnet Academies', 'Montessori & Preschools'],
      GB: ['Grammar & Independent Schools', 'Primary Schools & Nurseries', 'Secondary Schools & Academies', 'Sixth Form Colleges', 'Montessori Preschools'],
      AU: ['Public Primary & High Schools', 'Independent & Grammar Schools', 'Catholic Regional Colleges', 'Early Learning & Preschools'],
      AE: ['British & IB Curriculum Schools', 'American International Schools', 'CBSE & Indian High Schools', 'Nurseries & Early Learning Centers'],
      default: ['Primary & Elementary Schools', 'High & Secondary Schools', 'International & Private Schools', 'Montessori & Preschools']
    }
  },
  {
    key: 'colleges',
    label: 'Colleges & Universities (All Disciplines)',
    matchRe: /^(?:colleges?|universit(?:y|ies)|higher\s+education)$/i,
    strictFilterRe: /(college|university|universities|polytechnic|institute\s+of\s+|tech(?:nical)?\s+institute|engineering\s*(?:college|institute|university|school|faculty|academy)|medical\s*(?:college|school|university)|business\s*school|law\s*(?:college|school)|nursing\s*(?:college|school)|sixth\s*form|tafe|academy\s+of)/i,
    rejectRe: /(play\s*school|daycare|driving\s*school|motor\s*training|dog\s*training|nursery|hospital|medical\s*cent(?:er|re)|clinic|dental|dentist|pharmacy|chemist|diagnostic|women'?s\s*institute|non-profit\s*organi[sz]ation|wikipedia|britannica|libretexts|explained)/i,
    subcategoriesByCountry: {
      IN: ['Engineering & Technology Colleges', 'Medical & Nursing Colleges', 'Degree, Arts & Science Colleges', 'Management & MBA Institutes', 'Pharmacy & Polytechnic Colleges', 'Law Colleges'],
      US: ['Universities & State Colleges', 'Community & Junior Colleges', 'Medical & Nursing Schools', 'Business & MBA Schools', 'Law Schools', 'Technical & Trade Institutes'],
      GB: ['Universities & Higher Education', 'Further Education (FE) Colleges', 'Medical & Law Schools', 'Business Schools', 'Sixth Form & Technical Colleges'],
      AU: ['Universities & Campuses', 'TAFE & Vocational Institutes', 'Medical & Nursing Faculties', 'Business & Law Schools'],
      AE: ['International University Campuses', 'Higher Colleges of Technology', 'Business & Management Institutes', 'Engineering & Aviation Academies'],
      default: ['Engineering & Technology Colleges', 'Medical & Nursing Colleges', 'Degree, Arts & Science Colleges', 'Management & MBA Institutes']
    }
  },
  {
    key: 'contractors',
    label: 'Contractors & Home Trades (All Trades)',
    matchRe: /^(?:contractors?|trades|tradies|home\s+services?|builders?)$/i,
    strictFilterRe: /(contractor|builder|construction|plumb|electr|hvac|heating|air\s*conditioning|roof|paint|carpent|joiner|mason|floor|tiling|solar|waterproof)/i,
    rejectRe: /(real\s*estate\s*agent|property\s*broker|interior\s*gift\s*shop|paint\s*store\s*only|hardware\s*store\s*only|sanitary\s*store|tile\s*store)/i,
    subcategoriesByCountry: {
      IN: ['Building Construction Contractors', 'Plumbing Contractors', 'Electrical Contractors', 'AC & HVAC Repair Contractors', 'Waterproofing & Roofing Contractors', 'Painting & Interior Contractors', 'Carpentry & Modular Kitchen', 'Solar EPC Installers'],
      US: ['General Building Contractors', 'Plumbers & Rooter Contractors', 'Licensed Electricians', 'HVAC & Heating Contractors', 'Roofing & Siding Contractors', 'Painting & Remodeling Contractors', 'Solar Panel Installers'],
      GB: ['Building & Extension Contractors', 'Gas Safe Plumbers & Heating', 'NICEIC Electricians', 'Roofing & Loft Conversion', 'Carpenters & Joiners', 'Painters & Decorators'],
      AU: ['Master Builders & Tradies', 'Licensed Plumbers & Gasfitters', 'Master Electricians', 'Air Conditioning & HVAC Tradies', 'Roofing & Concreting Contractors', 'CEC Solar Installers'],
      AE: ['MEP & Fit-Out Contractors', 'Civil & Villa Construction', 'AC & Chiller Maintenance', 'DEWA Electrical & Plumbing Contractors', 'Interior Fit-Out & Renovation'],
      default: ['General Building Contractors', 'Plumbers & Heating Engineers', 'Licensed Electricians', 'HVAC & Air Conditioning Contractors', 'Roofing & Waterproofing Contractors', 'Solar EPC & Installers']
    }
  },
  {
    key: 'lawyers',
    label: 'Lawyers & Law Firms (All Practice Areas)',
    matchRe: /^(?:lawyers?|attorneys?|solicitors?|advocates?|law\s+firms?)$/i,
    strictFilterRe: /(lawyer|attorney|solicitor|barrister|advocate|law\s*firm|legal|chambers)/i,
    rejectRe: /(stamp\s*vendor|photocopy|xerox\s*shop|legal\s*stationery|printing\s*press)/i,
    subcategoriesByCountry: {
      IN: ['High Court & Civil Advocates', 'Corporate & Commercial Lawyers', 'Property & RERA Lawyers', 'Family & Matrimonial Advocates', 'Criminal Defense Advocates', 'Tax & GST Advocates'],
      US: ['Personal Injury Attorneys', 'Corporate & Business Law Firms', 'Family Law & Divorce Attorneys', 'Criminal Defense & DUI Lawyers', 'Real Estate & Estate Planning Attorneys', 'Immigration Lawyers'],
      GB: ['Solicitors & Law Practices', 'Conveyancing & Property Solicitors', 'Family & Divorce Solicitors', 'Corporate & Commercial Law Firms', 'Personal Injury & Employment Solicitors'],
      AU: ['Solicitors & Legal Practices', 'Conveyancing & Property Lawyers', 'Family & Estate Lawyers', 'Commercial & Corporate Law Firms', 'Criminal & Migration Lawyers'],
      AE: ['Advocates & Legal Consultants', 'DIFC & ADGM Corporate Law Firms', 'Real Estate & RERA Legal Advisors', 'Arbitration & Commercial Lawyers'],
      default: ['Civil & Litigation Law Firms', 'Corporate & Commercial Lawyers', 'Real Estate & Property Lawyers', 'Family & Divorce Lawyers', 'Criminal Defense Advocates']
    }
  },
  {
    key: 'restaurants',
    label: 'Restaurants & Dining (All Cuisines)',
    matchRe: /^(?:restaurants?|dining|food\s+and\s+dining|eateries)$/i,
    strictFilterRe: /(restaurant|dining|bistro|brasserie|cafe|coffee|biryani|grill|barbecue|steakhouse|pizzeria|thali|tiffin|dhaba|kitchen|eatery|gastropub)/i,
    rejectRe: /(kitchen\s*equipment|utensil\s*wholesaler|grocery\s*supermarket|fertilizer|commercial\s*catering\s*equipment|restaurant\s*supply\s*store)/i,
    subcategoriesByCountry: {
      IN: ['Family Multi-Cuisine Restaurants', 'Biryani & Tandoor Restaurants', 'Pure Vegetarian & Thali Restaurants', 'South Indian Tiffin & Dining', 'Fine Dining & Rooftop Restaurants', 'Cafes & Coffee Houses'],
      US: ['Steakhouses & American Grills', 'Italian Trattorias & Pizzerias', 'Mexican & Tex-Mex Restaurants', 'Family & Casual Dining', 'Cafes & Breakfast Diners', 'Seafood & Sushi Restaurants'],
      GB: ['British Gastropubs & Inns', 'Indian Curry Houses & Tandoori', 'Fish & Chip Shops', 'Italian Restaurants & Pizzerias', 'Artisan Cafes & Tea Rooms'],
      AU: ['Modern Australian Bistros', 'Specialty Coffee & Brunch Cafes', 'Craft Breweries & Pub Dining', 'Asian Fusion & Thai Restaurants', 'Italian Pizzerias'],
      AE: ['Arabic & Levantine Fine Dining', 'Multi-Cuisine & Luxury Hotel Dining', 'Indian & Pakistani Restaurants', 'Specialty Cafes & Shawarma Grills', 'Seafood & Waterfront Restaurants'],
      default: ['Family & Casual Dining Restaurants', 'Fine Dining & Bistros', 'Steakhouse & Grill', 'Cafes & Coffee Houses', 'Seafood Restaurants']
    }
  },
  {
    key: 'hotels',
    label: 'Hotels & Hospitality (All Tiers)',
    matchRe: /^(?:hotels?|hospitality|accommodations?|lodging)$/i,
    strictFilterRe: /(hotel|resort|inn|suites|lodge|serviced\s*apartment|boutique\s*stay|motel|residency)/i,
    rejectRe: /(student\s*hostel\s*mess|railway\s*ticket\s*agent|hostel\s*mess|pg\s*mess|bus\s*stand|real\s*estate\s*agent)/i,
    subcategoriesByCountry: HOTEL_SUBS_BY_COUNTRY
  },
  {
    key: 'automotive',
    label: 'Automotive Sales & Service (All Sub-Categories)',
    matchRe: /^(?:automotive|auto\s+services?|car\s+services?|garages?)$/i,
    strictFilterRe: /(auto|car|motor|vehicle|mechanic|garage|tyre|tire|wheel|body\s*shop|collision|smash\s*repair|detailing|showroom|dealership)/i,
    rejectRe: /(driving\s*school|bicycle\s*toy\s*shop|toy\s*cars|cycle\s*store|bicycle\s*repair\s*only)/i,
    subcategoriesByCountry: AUTOMOTIVE_SUBS_BY_COUNTRY
  },
  {
    key: 'salons',
    label: 'Salons, Beauty & Aesthetics (All Sub-Categories)',
    matchRe: /^(?:salons?|beauty|beauty\s+salons?|spas?)$/i,
    strictFilterRe: /(salon|parlour|parlor|barber|hair|beauty|makeup|bridal|spa|nail|lash|aesthetic|cosmetolog)/i,
    rejectRe: /(hardware|automobile|pet\s*grooming|veterinary|medical\s*clinic)/i,
    subcategoriesByCountry: SALON_SUBS_BY_COUNTRY
  },
  {
    key: 'real_estate',
    label: 'Real Estate & Property (All Sub-Categories)',
    matchRe: /^(?:real\s+estate|realtors?|property|estate\s+agents?|immobilien)$/i,
    strictFilterRe: /(real\s*estate|realtor|property|estate\s*agent|developer|builder|housing|commercial\s*leasing|immobilien|agence\s*immobili[eè]re)/i,
    rejectRe: /(cement\s*retail|paint\s*shop|hardware\s*store|building\s*materials?\s*store)/i,
    subcategoriesByCountry: REAL_ESTATE_SUBS_BY_COUNTRY
  },
  {
    key: 'financial',
    label: 'Accountants & Financial Services (All Sub-Categories)',
    matchRe: /^(?:accountants?|accounting|financial\s+services?|tax\s+consultants?|steuerberater)$/i,
    strictFilterRe: /(accountant|chartered\s*accountant|\bca\b|\bcpa\b|tax|audit|bookkeep|wealth|financial\s*advisor|insurance|mortgage|steuerberater|expert[\s-]comptable)/i,
    rejectRe: /(atm\s*machine|pawn\s*shop|cash\s*point\s*only|money\s*transfer\s*kiosk\s*only)/i,
    subcategoriesByCountry: {
      IN: ['Chartered Accountants (CA)', 'GST & Income Tax Consultants', 'Audit & Bookkeeping Firms', 'Wealth & Mutual Fund Advisors', 'Business Loan & Insurance Agencies'],
      US: ['Certified Public Accountants (CPA)', 'IRS Tax & Bookkeeping Firms', 'Audit & Assurance Practices', 'Wealth Management Advisors', 'Commercial Insurance Brokers'],
      GB: ['Chartered Accountants (ACCA / ICAEW)', 'HMRC Tax & VAT Advisors', 'Bookkeeping & Payroll Firms', 'FCA Financial Advisors', 'Commercial Insurance Brokers'],
      AU: ['CPA Australia & Chartered Accountants', 'ATO Tax & BAS Agents', 'Bookkeeping & SMSF Advisors', 'Mortgage & Business Finance Brokers'],
      AE: ['Corporate Audit & VAT Consultants', 'UAE Corporate Tax Advisors', 'PRO & Business Setup Accountants', 'Commercial Insurance & Wealth Advisors'],
      default: ['Chartered Accountants & CPA Firms', 'Tax, GST & VAT Consultants', 'Audit & Bookkeeping Services', 'Wealth & Investment Advisors']
    }
  },
  {
    key: 'manufacturing',
    label: 'Manufacturing & Industrial Units (All Sub-Categories)',
    matchRe: /^(?:manufacturing|manufacturers?|factories|industrial|industries)$/i,
    strictFilterRe: /(manufactur|factory|industrial|machining|\bcnc\b|fabricat|plastic|packaging|processing|engineering\s*works|mill|chemical|pharma|elektronik|maschinenbau)/i,
    rejectRe: /(beauty\s*salon|grocery\s*retail|retail\s*store\s*only|residential\s*society)/i,
    subcategoriesByCountry: MANUFACTURING_SUBS_BY_COUNTRY
  },
  {
    key: 'wholesale',
    label: 'Wholesalers & Distributors (All Sub-Categories)',
    matchRe: /^(?:wholesalers?|wholesale|distributors?|traders?)$/i,
    strictFilterRe: /(wholesal|distributor|stockist|dealer|trader|merchant|commission\s*agent|mandi|cash\s*and\s*carry|supplier|export)/i,
    rejectRe: /(salon|beauty\s*parlour|retail\s*shop\s*only|hospital|clinic)/i,
    subcategoriesByCountry: WHOLESALE_SUBS_BY_COUNTRY
  },
  {
    key: 'pharmacies',
    label: 'Pharmacies, Chemists & Medical Stores',
    matchRe: /^(?:pharmac(?:y|ies)|chemists?|medical\s+stores?|drugstores?|apothek(?:e|en)|pharmacies?)$/i,
    strictFilterRe: /(pharmac|chemist|medical\s*store|drugstore|apotheke|apollo\s*pharmacy|medplus|wellness\s*forever|generic\s*medicine)/i,
    rejectRe: /(veterinary|animal\s*clinic|pet\s*clinic|beauty\s*salon)/i,
    subcategoriesByCountry: {
      IN: ['Retail Medical Stores & Chemists', '24/7 Apollo / MedPlus Pharmacies', 'Surgical & Medical Supply Stores', 'Ayurvedic & Homeopathy Pharmacies'],
      US: ['Retail Pharmacies & Drugstores', '24/7 Drive-Thru Pharmacies', 'Compounding & Specialty Pharmacies', 'Surgical & Mobility Supply Stores'],
      GB: ['NHS & Community Chemists', 'Late-Night Pharmacies', 'Mobility & Medical Equipment Shops', 'Private Travel Clinics & Pharmacies'],
      AU: ['Discount & Community Chemists', '24/7 Late-Night Pharmacies', 'Compounding Pharmacies', 'Medical & Mobility Supply Stores'],
      AE: ['24/7 Licensed Pharmacies', 'Hospital & Clinic Pharmacies', 'Surgical & Medical Equipment Stores'],
      default: ['Retail Pharmacies & Chemists', '24/7 Medical & Drug Stores', 'Surgical & Medical Supply Stores']
    }
  },
  {
    key: 'diagnostics',
    label: 'Diagnostic Labs & Pathology Centers',
    matchRe: /^(?:diagnostics?|diagnostic\s+cent(?:er|re)s?|pathology|labs?|radiology|mri|ct\s*scan)$/i,
    strictFilterRe: /(diagnostic|pathology|lab|laboratory|radiology|imaging|mri|ct\s*scan|ultrasound|blood\s*bank|scan\s*cent(?:er|re))/i,
    rejectRe: /(veterinary|animal|computer\s*lab|photo\s*lab|blood\s*donation\s*camp\s*only)/i,
    subcategoriesByCountry: DIAGNOSTICS_SUBS_BY_COUNTRY
  },
  {
    key: 'retail',
    label: 'Retail, Showrooms & Commercial Stores',
    matchRe: /^(?:retail|stores?|shops?|showrooms?|supermarkets?|jewellery|jewelry|electronics|furniture\s*stores?|clothing|boutiques?)$/i,
    strictFilterRe: /(store|shop|showroom|supermarket|hypermarket|mart|boutique|jewel|furniture|electronics|appliance|apparel|footwear|optical|bookstore)/i,
    rejectRe: /(wholesale\s*only|hospital|clinic|lawyer|plumber)/i,
    subcategoriesByCountry: RETAIL_SUBS_BY_COUNTRY
  },
  {
    key: 'it_software',
    label: 'IT, Software & Digital Agencies',
    matchRe: /^(?:it\s*compan(?:y|ies)|software\s*compan(?:y|ies)|software|it\s*services?|digital\s*marketing|web\s*design|tech\s*companies)$/i,
    strictFilterRe: /(software|it\s*service|technology|digital\s*marketing|seo|web\s*design|app\s*dev|saas|cloud|cybersecurity|systems|infotech|solutions)/i,
    rejectRe: /(mobile\s*repair|computer\s*spare\s*shop|cafe|cyber\s*cafe|xerox)/i,
    subcategoriesByCountry: IT_SOFTWARE_SUBS_BY_COUNTRY
  },
  {
    key: 'logistics',
    label: 'Logistics, Transport & Packers',
    matchRe: /^(?:logistics?|transport|packers?\s*(?:and|&)?\s*movers?|freight|cargo|warehousing|couriers?)$/i,
    strictFilterRe: /(logistics|transport|packer|mover|freight|cargo|shipping|warehouse|cold\s*storage|courier|supply\s*chain|fleet)/i,
    rejectRe: /(travel\s*agent|driving\s*school|bus\s*stop|auto\s*stand)/i,
    subcategoriesByCountry: LOGISTICS_SUBS_BY_COUNTRY
  },
  {
    key: 'fitness',
    label: 'Fitness, Gyms & Sports Clubs',
    matchRe: /^(?:gyms?|fitness|fitness\s*cent(?:er|re)s?|yoga|pilates|crossfit|sports\s*club)$/i,
    strictFilterRe: /(gym|fitness|yoga|pilates|crossfit|zumba|health\s*club|workout|martial\s*arts|sports\s*academy|swimming)/i,
    rejectRe: /(sports\s*equipment\s*shop|supplement\s*retail\s*only|physiotherapy|hospital)/i,
    subcategoriesByCountry: FITNESS_SUBS_BY_COUNTRY
  },
  {
    key: 'events',
    label: 'Events, Weddings & Catering',
    matchRe: /^(?:events?|event\s*management|weddings?|wedding\s*planners?|catering|photographers?|banquet\s*halls?)$/i,
    strictFilterRe: /(event|wedding|cater|photographer|videograph|banquet|convention|decorator|florist|mandap|bridal)/i,
    rejectRe: /(photo\s*xerox|passport\s*photo\s*booth|stationery\s*shop)/i,
    subcategoriesByCountry: EVENTS_SUBS_BY_COUNTRY
  },
  {
    key: 'veterinary',
    label: 'Veterinary & Pet Care',
    matchRe: /^(?:veterinar(?:y|ians?)|vets?|pet\s*clinics?|pet\s*hospitals?|animal\s*hospitals?|pet\s*care)$/i,
    strictFilterRe: /(vet|veterinar|pet\s*clinic|pet\s*hospital|animal\s*hospital|animal\s*clinic|pet\s*care|pet\s*grooming|kennel)/i,
    rejectRe: /(human\s*hospital|dental\s*clinic|maternity|orthopedic|cardiology|pediatric)/i,
    subcategoriesByCountry: VETERINARY_SUBS_BY_COUNTRY
  }
];

function resolveUmbrella(query, countryCode = 'IN') {
  const clean = String(query || '').trim();
  if (!clean) return null;
  const stripped = clean.replace(/\s+(?:in|near|at|around)\s+[\w\s,.-]+$/i, '').trim();
  const code = String(countryCode || 'IN').toUpperCase();

  for (const item of UMBRELLA_REGISTRY) {
    if (item.matchRe.test(clean) || (stripped && item.matchRe.test(stripped)) || clean.toLowerCase() === item.key.toLowerCase() || (stripped && stripped.toLowerCase() === item.key.toLowerCase())) {
      const subs =
        item.subcategoriesByCountry[code] ||
        item.subcategoriesByCountry.default ||
        [];
      return {
        key: item.key,
        label: item.label,
        isGeneric: true,
        isParticular: false,
        mode: 'umbrella',
        countryCode: code,
        strictFilterRe: item.strictFilterRe,
        rejectRe: item.rejectRe,
        subvectors: subs
      };
    }
  }
  return null;
}

module.exports = { UMBRELLA_REGISTRY, resolveUmbrella };
