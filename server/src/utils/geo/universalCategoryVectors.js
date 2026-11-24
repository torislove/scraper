/**
 * universalCategoryVectors.js
 * Universal category & locality intelligence engine with contextual query expansions.
 */

const querySpecificityClassifier = require('../querySpecificityClassifier');
const indiaTradeIntelligence = require('../indiaTradeIntelligence');

// ── UNIVERSAL CATEGORY & LOCALITY INTELLIGENCE ENGINE ──
function getUniversalCategoryVectors(category, cleanLoc, countryCode = 'IN') {
  let cat = (category || 'Business').trim();
  cat = cat.replace(new RegExp(`\\s+(in|near|at|around)\\s+.*$`, 'i'), '').trim();
  if (!cat) cat = 'Business';
  const isIntl = countryCode && String(countryCode).toUpperCase() !== 'IN';

  // 0. Deterministic Specificity Classifier (Laser Domain Purity First)
  const specificity = querySpecificityClassifier.classifyQuerySpecificity(cat, countryCode);
  if (specificity.isParticular && Array.isArray(specificity.microSynonyms) && specificity.microSynonyms.length > 0) {
    return specificity.microSynonyms.map(synonym => ({
      zoneName: `${cleanLoc} · ${synonym}`,
      queryText: `${synonym} in ${cleanLoc}`,
      isVectorQuery: true
    }));
  }

  // 0b. International Localized Multi-Vector Expansion (Country-Specific Search Vectors)
  if (isIntl) {
    const tradeVectors = indiaTradeIntelligence.getSubvectorsForQuery(cat, countryCode);
    if (Array.isArray(tradeVectors) && tradeVectors.length > 0) {
      return tradeVectors.map(v => ({
        zoneName: `${cleanLoc} · ${v}`,
        queryText: `${v} in ${cleanLoc}`,
        isVectorQuery: true
      }));
    }
  }

  const lowerCat = cat.toLowerCase();

  // 1. Manufacturers & Industrial Units
  if (lowerCat.match(/manufactur|factory|factories|industrial|fabricat|oem|production|plant|mill|processing|packaging material|corrugated/i)) {
    return [
      { zoneName: `${cleanLoc} Industrial Equipment Manufacturers`, queryText: `Industrial Equipment Manufacturers in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Fabrication Works & Workshops`, queryText: `Fabrication Works in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} OEM Parts & Machinery Manufacturers`, queryText: `Machinery Manufacturers in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Plastic & Packaging Manufacturers`, queryText: `Packaging Material Manufacturers in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Industrial Area Factory Units`, queryText: `Factories in Industrial Area ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Chemical & Processing Plants`, queryText: `Manufacturing Plants in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 1b. Shopping Malls & Commercial Complexes
  if (lowerCat.match(/\b(mall|malls|shopping mall|shopping malls|shopping cent(?:er|re)|commercial complex|retail plaza|hypermarket)\b/i)) {
    return [
      { zoneName: `${cleanLoc} Shopping Malls & Retail Plazas`, queryText: `Shopping Malls in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Commercial Shopping Complexes`, queryText: `Commercial Shopping Complex in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Central Shopping Centers`, queryText: `Shopping Center in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Hypermarket & Departmental Malls`, queryText: `Hypermarket in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Entertainment & Multiplex Malls`, queryText: `Mall Multiplex in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 2. Computer Stores, IT Hardware & Laptops (Strictly zero CCTV)
  if (lowerCat.match(/\b(computer|laptop|pc|desktop|pc builder|hardware store|gaming pc)\b/i) && !lowerCat.match(/\b(cctv|surveillance|security|biometric|dvr|nvr)\b/i)) {
    return [
      { zoneName: `${cleanLoc} Laptop & Computer Showrooms`, queryText: `Laptop Store in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Computer Hardware & PC Builders`, queryText: `Computer Hardware Shop in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Computer & Laptop Repair Centers`, queryText: `Computer Repair and Service in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Refurbished & Used Laptop Stores`, queryText: `Second Hand Laptop Shop in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Computer Peripherals & Accessories`, queryText: `Computer Accessories Shop in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Networking & Server Equipment`, queryText: `Networking Solutions in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 2a. CCTV & Security Surveillance (Dedicated Independent Category)
  if (lowerCat.match(/\b(cctv|surveillance|security camera|security systems|biometric|access control|dvr|nvr)\b/i)) {
    return [
      { zoneName: `${cleanLoc} CCTV & Security System Dealers`, queryText: `CCTV Camera Dealers in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} CCTV Installation & Wiring Services`, queryText: `CCTV Installation Services in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} IP Camera & Wireless Surveillance`, queryText: `IP Security Camera Store in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Biometric Attendance & Access Control`, queryText: `Biometric Attendance System Dealers in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} DVR NVR Hardware & Setup`, queryText: `DVR NVR Security Systems in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 2b. Camera Stores, DSLR Dealers, Lenses & Camera Repair (Distinct from CCTV & Photo Studios!)
  if (lowerCat.match(/\b(camera|cameras|camra|dslr|mirrorless|camera lens|photography gear|gimbal)\b/i) && !lowerCat.match(/\b(cctv|surveillance|security|biometric|dvr|nvr)\b/i)) {
    return [
      { zoneName: `${cleanLoc} Camera & DSLR Showrooms`, queryText: `Camera Shop in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Canon Nikon Sony Camera Dealers`, queryText: `DSLR Camera Store in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Camera Lenses & Studio Gear`, queryText: `Camera Lens and Accessories Store in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Camera & Lens Repair Centres`, queryText: `Camera Repair Center in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Drone & Gimbal Dealers`, queryText: `Drone and Gimbal Store in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Used & Refurbished Cameras`, queryText: `Second Hand Camera Shop in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 3. Photography, Studios, Videography & Cinematography (HIGH-YIELD MULTI-VECTOR EXPANSION)
  if (lowerCat.match(/photo|photographer|photographers|photography|studio|album|shoot|video|videographer|candid|cinemat/i) && !lowerCat.match(/cctv|xerox|photocopy|tattoo/i)) {
    return [
      { zoneName: `${cleanLoc} Just Born & Newborn Baby Photoshoots`, queryText: `Just Born Baby Photoshoot in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Maternity & Baby Shower Photographers`, queryText: `Maternity Photoshoot in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Wedding & Candid Wedding Photographers`, queryText: `Wedding Photographers in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Pre-Wedding & Outdoor Couple Shoots`, queryText: `Pre Wedding Photoshoot in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Drone Videographers & Aerial Cinematography`, queryText: `Drone Videography in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Birthday, Events & Corporate Photographers`, queryText: `Event Photographers in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Fashion Portfolio & Model Studios`, queryText: `Fashion Portrait Studio in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Commercial & Product Photography`, queryText: `Commercial Photographer in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Photo Studios & Digital Colour Labs`, queryText: `Photo Studio in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 4a. Pure Catering Services (Food Catering for Weddings, Corporate, Parties)
  if (lowerCat.match(/\b(caterer|caterers|catering|wedding cater)\b/i)) {
    return [
      { zoneName: `${cleanLoc} Wedding & Reception Caterers`, queryText: `Wedding Catering in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Corporate Lunch & Event Catering`, queryText: `Corporate Catering in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Birthday & Private Party Caterers`, queryText: `Party Caterers in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Pure Vegetarian & Vegan Caterers`, queryText: `Vegetarian Catering in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} BBQ & Outdoor Food Service`, queryText: `Outdoor Catering in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Buffet & Banquet Catering`, queryText: `Buffet Catering in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 4b. Pure Decorators (Stage, flower, balloon decoration)
  if (lowerCat.match(/\b(decorator|decorators|stage decor|flower decor|mandap decor)\b/i) && !lowerCat.match(/\b(interior|home decor)\b/i)) {
    return [
      { zoneName: `${cleanLoc} Wedding & Stage Decorators`, queryText: `Wedding Decorators in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Flower Decorators & Florists`, queryText: `Flower Decoration in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Balloon & Theme Party Decorators`, queryText: `Balloon Decoration in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Mandap & Event Decoration`, queryText: `Mandap Decorators in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 4c. Venues, Banquets, Mandaps & Function Halls
  if (lowerCat.match(/banquet|function hall|kalyana mandapam|convention|marriage hall/i)) {
    return [
      { zoneName: `${cleanLoc} Convention & Function Halls`, queryText: `Function Hall in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} AC Banquet Halls`, queryText: `Banquet Hall in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Marriage & Reception Venues`, queryText: `Marriage Hall in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Party Lawns & Event Spaces`, queryText: `Event Venue in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 4d. Event Planning & Management (Broad Wedding / Corporate Planning)
  if (lowerCat.match(/\b(event|event management|event planners|event organizers|wedding planner)\b/i)) {
    return [
      { zoneName: `${cleanLoc} Wedding Planners & Coordinators`, queryText: `Wedding Planners in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Corporate Event Organizers`, queryText: `Corporate Event Management in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Birthday Party & Theme Planners`, queryText: `Birthday Party Planners in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} DJ Sound & Lighting Rentals`, queryText: `DJ Sound and Lighting in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Stage & Floral Decorators`, queryText: `Stage Decorators in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Banquet Halls & Venues`, queryText: `Banquet Halls in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 5a. Pharmacies, Chemists, Medical Stores & Drugstores
  if (lowerCat.match(/\b(pharmacy|pharmacies|medical store|medical stores|medical shop|medical shops|chemist|chemists|druggist|drug store|drug stores|jan aushadhi|medicine shop)\b/i)) {
    return [
      { zoneName: `${cleanLoc} 24 Hours Pharmacies & Chemists`, queryText: `24 Hours Pharmacy in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Retail Medical Stores & Drugstores`, queryText: `Medical Store in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Wholesale Pharmaceutical Distributors`, queryText: `Wholesale Medicine Distributors in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Surgical & Medical Equipment Suppliers`, queryText: `Surgical Equipment Suppliers in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Generic Medicine Stores`, queryText: `Generic Medicine Store in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 5-dental. Dentists & Dental Clinics
  if (lowerCat.match(/\b(dentist|dentists|dental|teeth|tooth|orthodont|implant\s*cent(?:er|re)|root\s*canal)\b/i)) {
    return [
      { zoneName: `${cleanLoc} Dental Clinics & Implant Centers`, queryText: `Dental Clinic in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Cosmetic Dentistry & Smile Studios`, queryText: `Cosmetic Dentistry in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Orthodontic & Braces Clinics`, queryText: `Orthodontist in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Root Canal Specialists`, queryText: `Root Canal Dentist in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Pediatric Child Dental Clinics`, queryText: `Pediatric Dentist in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 5b. Hospitals & Emergency Care (Strictly Inpatient & Trauma)
  if (lowerCat.match(/\b(hospital|hospitals|nursing home|nursing homes|trauma|emergency care|icu|maternity home)\b/i) && !lowerCat.match(/\b(dental|dentist|teeth|tooth|eye|veterinary)\b/i)) {
    return [
      { zoneName: `${cleanLoc} Multispeciality Hospitals`, queryText: `Multispeciality Hospital in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Emergency & Trauma Care Centers`, queryText: `Emergency Hospital in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Children & Pediatric Hospitals`, queryText: `Children Hospital in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Maternity & Gynecologist Hospitals`, queryText: `Maternity Hospital in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Orthopedic & Fracture Hospitals`, queryText: `Orthopedic Hospital in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Cardiology & Heart Hospitals`, queryText: `Heart Hospital in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 5c. Doctors, Clinics & Specialist Consultations
  if (lowerCat.match(/\b(clinic|clinics|doctor|doctors|physician|dermatolog|pediatric|gynecolog|ent|physiotherapy|chiropract)\b/i)) {
    return [
      { zoneName: `${cleanLoc} General Physician & Family Clinics`, queryText: `Clinics in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Skin & Dermatology Clinics`, queryText: `Skin Specialist Clinic in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Eye Care & Optometry Clinics`, queryText: `Eye Clinic in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Pediatric & Child Care Clinics`, queryText: `Pediatrician Clinic in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Physiotherapy & Rehab Centers`, queryText: `Physiotherapy Centre in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Urgent Care & Walk-In Clinics`, queryText: `Urgent Care in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 5d. Diagnostics, Scan Centers & Pathology Labs
  if (lowerCat.match(/\b(diagnostic|diagnostics|pathology|blood test|scan|mri|ct scan|x ray|ultrasound|lab|laboratory)\b/i)) {
    return [
      { zoneName: `${cleanLoc} Diagnostic & Imaging Centers`, queryText: `Diagnostic Centre in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Pathology & Blood Test Labs`, queryText: `Pathology Lab in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} MRI & CT Scan Centers`, queryText: `MRI Scan Centre in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Ultrasound & X-Ray Clinics`, queryText: `Scan Centre in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Health Checkup Centers`, queryText: `Clinical Laboratory in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 6. Plumbers & Plumbing Contractors (Home Services)
  if (lowerCat.match(/\b(plumber|plumbers|plumbing|drain|drainage|rooter)\b/i)) {
    return [
      { zoneName: `${cleanLoc} 24/7 Emergency Plumbers`, queryText: `Emergency Plumber in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Drain Cleaning & Rooter Specialists`, queryText: `Drain Cleaning in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Water Heater Repair & Installation`, queryText: `Water Heater Repair in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Licensed Plumbing Contractors`, queryText: `Plumbing Contractor in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Pipe Leak Detection & Repair`, queryText: `Leak Detection in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 7. Electricians & Electrical Contractors
  if (lowerCat.match(/\b(electrician|electricians|electrical|wiring)\b/i)) {
    return [
      { zoneName: `${cleanLoc} 24/7 Emergency Electricians`, queryText: `Emergency Electrician in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Licensed Electrical Contractors`, queryText: `Electrical Contractor in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Commercial Electrical & Panel Upgrades`, queryText: `Panel Upgrade Electrician in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} EV Charger & Home Lighting Installation`, queryText: `EV Charger Installation in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Generator & Backup Power Setup`, queryText: `Generator Electrician in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 8. HVAC, Air Conditioning & Heating Contractors
  if (lowerCat.match(/\b(hvac|air condition|air conditioning|ac repair|furnace|heating repair|duct cleaning)\b/i)) {
    return [
      { zoneName: `${cleanLoc} HVAC Installation & AC Repair`, queryText: `AC Repair in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Heating & Furnace Repair Services`, queryText: `Heating Repair in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Duct Cleaning & Air Quality`, queryText: `Air Duct Cleaning in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Commercial Refrigeration & Heat Pumps`, queryText: `Heat Pump Service in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} 24/7 Emergency HVAC Services`, queryText: `Emergency HVAC in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 9. Roofing & Roof Repair Contractors
  if (lowerCat.match(/\b(roof|roofer|roofers|roofing|gutter|gutters)\b/i)) {
    return [
      { zoneName: `${cleanLoc} Roofing Contractors & Replacement`, queryText: `Roofing Contractor in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Roof Leak Repair & Storm Damage`, queryText: `Roof Repair in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Commercial Flat Roofing Specialists`, queryText: `Commercial Roofing in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Gutter Installation & Repair`, queryText: `Gutter Installation in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Emergency Roof Tarping & Inspection`, queryText: `Roof Inspection in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 10. Painters & Painting Contractors
  if (lowerCat.match(/\b(painter|painters|painting|whitewash)\b/i)) {
    return [
      { zoneName: `${cleanLoc} Interior House Painters`, queryText: `Interior Painters in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Exterior Painting Contractors`, queryText: `Exterior Painters in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Commercial Building Painting`, queryText: `Commercial Painters in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Cabinet Painting & Refinishing`, queryText: `Cabinet Painting in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 11. Interior Designers & Architects
  if (lowerCat.match(/\b(interior|interior designer|interior designers|interior design|architect|architects|architecture)\b/i)) {
    return [
      { zoneName: `${cleanLoc} Residential Interior Designers`, queryText: `Interior Designers in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Modular Kitchen & Wardrobe Specialists`, queryText: `Modular Kitchen in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Commercial Office Interior Design`, queryText: `Office Interior Designers in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Luxury Villa Architects & 3D Planners`, queryText: `Architects in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} False Ceiling & Lighting Decorators`, queryText: `False Ceiling Contractors in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 12. General Contractors & Home Remodeling
  if (lowerCat.match(/\b(contractor|contractors|remodel|remodeling|renovation|builder|builders)\b/i) && !lowerCat.match(/plumb|electr|paint|roof/i)) {
    return [
      { zoneName: `${cleanLoc} General Contractors & Builders`, queryText: `General Contractors in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Kitchen Remodeling Specialists`, queryText: `Kitchen Remodeling in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Bathroom Remodeling Contractors`, queryText: `Bathroom Remodeling in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Room Additions & Home Renovations`, queryText: `Home Renovation in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Hardwood Flooring & Tile Contractors`, queryText: `Flooring Contractors in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 13. Lawyers, Attorneys & Legal Services
  if (lowerCat.match(/\b(lawyer|lawyers|attorney|attorneys|advocate|advocates|legal|solicitor|law firm)\b/i)) {
    return [
      { zoneName: `${cleanLoc} Personal Injury Lawyers`, queryText: `Personal Injury Lawyer in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Family & Divorce Lawyers`, queryText: `Divorce Lawyer in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Criminal Defense Attorneys`, queryText: `Criminal Defense Attorney in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Real Estate & Property Lawyers`, queryText: `Real Estate Lawyer in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Corporate & Business Law Firms`, queryText: `Business Lawyer in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Estate Planning & Probate Attorneys`, queryText: `Estate Planning Lawyer in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 14. Accountants, CPAs, Tax & Bookkeeping
  if (lowerCat.match(/\b(accountant|accountants|cpa|chartered accountant|tax consultant|bookkeeping|accounting)\b/i)) {
    return [
      { zoneName: `${cleanLoc} Certified Public Accountants (CPA)`, queryText: `CPA in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Tax Preparation & Filing Services`, queryText: `Tax Preparation in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Small Business Bookkeeping & Payroll`, queryText: `Bookkeeping Services in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Corporate Tax & Audit Consultants`, queryText: `Tax Consultant in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 15. Real Estate, Realtors & Property Management
  if (lowerCat.match(/\b(real estate|realtor|realtors|property dealer|property management|estate agent)\b/i)) {
    return [
      { zoneName: `${cleanLoc} Residential Real Estate Agents`, queryText: `Real Estate Agents in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Commercial Real Estate Brokers`, queryText: `Commercial Real Estate in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Property Management Companies`, queryText: `Property Management in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Luxury Homes & Condo Realtors`, queryText: `Realtors in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Apartment Leasing & Rental Agencies`, queryText: `Apartment Rentals in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 16. Auto Repair, Mechanics & Body Shops
  if (lowerCat.match(/\b(mechanic|mechanics|auto repair|car repair|garage|car service|auto shop)\b/i)) {
    return [
      { zoneName: `${cleanLoc} Auto Repair Shops & Mechanics`, queryText: `Auto Repair in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Brake & Transmission Repair Specialists`, queryText: `Brake Repair in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Auto Body Repair & Collision Centers`, queryText: `Auto Body Shop in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Tire Shops & Wheel Alignment`, queryText: `Tire Shop in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Mobile Mechanics & 24/7 Towing`, queryText: `Towing Service in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 17. Auto Detailing, PPF & Car Wash
  if (lowerCat.match(/\b(detailing|auto detail|car wash|ceramic coating|ppf)\b/i)) {
    return [
      { zoneName: `${cleanLoc} Mobile Auto Detailing Studios`, queryText: `Auto Detailing in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Ceramic Coating & PPF Specialists`, queryText: `Ceramic Coating in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Hand Car Wash & Interior Shampoo`, queryText: `Car Wash in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Paint Correction & Scratch Repair`, queryText: `Paint Correction in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 18. Salons, Barbershops & Hair Styling
  if (lowerCat.match(/\b(salon|salons|hair|haircut|barber|barbers|barbershop)\b/i) && !lowerCat.match(/pet|dog/i)) {
    return [
      { zoneName: `${cleanLoc} Hair Salons & Master Stylists`, queryText: `Hair Salon in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Barbershops & Men's Grooming`, queryText: `Barbershop in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Bridal Hair & Makeup Studios`, queryText: `Bridal Makeup in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Hair Color & Balayage Specialists`, queryText: `Hair Colorist in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 19. Spas, Med Spas, Nails & Wellness
  if (lowerCat.match(/\b(spa|spas|med spa|nail|nails|massage|laser hair|botox|facial)\b/i)) {
    return [
      { zoneName: `${cleanLoc} Medical Spas, Botox & Laser Clinics`, queryText: `Med Spa in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Nail Salons & Acrylic Nail Studios`, queryText: `Nail Salon in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Day Spas & Massage Therapy`, queryText: `Massage Therapy in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Skin Care & Facial Clinics`, queryText: `Facials in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 20. Gyms, Fitness Centers, Yoga & Personal Trainers
  if (lowerCat.match(/\b(gym|gyms|fitness|personal trainer|yoga|pilates|crossfit|martial arts|boxing)\b/i)) {
    return [
      { zoneName: `${cleanLoc} Gyms & 24/7 Fitness Centers`, queryText: `Gyms in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Personal Trainers & Strength Studios`, queryText: `Personal Trainer in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} CrossFit Boxes & Functional Training`, queryText: `CrossFit in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Yoga & Pilates Studios`, queryText: `Yoga Studio in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Boxing & Martial Arts Gyms`, queryText: `Boxing Gym in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 21. Vets, Pet Grooming & Pet Services
  if (lowerCat.match(/\b(vet|vets|veterinary|veterinarian|dog groom|pet groom|pet boarding|dog daycare)\b/i)) {
    return [
      { zoneName: `${cleanLoc} Veterinary Hospitals & Animal Clinics`, queryText: `Veterinarian in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Dog Grooming & Pet Spas`, queryText: `Dog Grooming in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Dog Daycare & Pet Boarding Kennels`, queryText: `Pet Boarding in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Dog Training & Puppy Classes`, queryText: `Dog Training in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 22. Cleaning & Janitorial Services
  if (lowerCat.match(/\b(cleaning|cleaners|janitorial|maid service|house cleaning)\b/i)) {
    return [
      { zoneName: `${cleanLoc} Residential House Cleaning Services`, queryText: `House Cleaning in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Commercial Office Janitorial Services`, queryText: `Commercial Cleaning in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Deep Cleaning & Move-In/Out Cleaning`, queryText: `Deep Cleaning in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Carpet & Upholstery Steam Cleaning`, queryText: `Carpet Cleaning in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 23. Restaurants, Family Dine-in, Cafes, Bakeries & Pubs
  if (lowerCat.match(/\b(restaurant|restaurants|restaurent|dining|food court|eatery|eateries|dhaba|bistro|cafe|cafes|bakery|bakeries|pub|pubs|gastropub)\b/i) && !lowerCat.match(/\b(cater|catering|mandap|event|hotel room|lodge)\b/i)) {
    const tradeVectors = indiaTradeIntelligence.getSubvectorsForQuery(cat, countryCode);
    if (Array.isArray(tradeVectors) && tradeVectors.length > 0) {
      return tradeVectors.map(v => ({
        zoneName: `${cleanLoc} · ${v}`,
        queryText: `${v} in ${cleanLoc}`,
        isVectorQuery: true
      }));
    }
    return [
      { zoneName: `${cleanLoc} Family Dine-in & Multi-Cuisine Restaurants`, queryText: `Family Restaurant in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Hyderabadi Dum Biryani & Mandi Houses`, queryText: `Biryani Restaurant in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Pure Veg & Traditional Thali Restaurants`, queryText: `Pure Veg Restaurant in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Cafes, Coffee Shops & Hangout Lounges`, queryText: `Cafe in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} South Indian Tiffin & Breakfast Centers`, queryText: `Tiffin Center in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} North Indian & Punjabi Dhabas`, queryText: `Dhaba in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Fast Food & Chinese Eateries`, queryText: `Fast Food in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Live Bakeries & Cake Studios`, queryText: `Bakery in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 24. Solar Energy, Rooftop EPC & Battery Installers
  if (lowerCat.match(/\b(solar|solar panels?|solar energy|rooftop solar)\b/i)) {
    const tradeVectors = indiaTradeIntelligence.getSubvectorsForQuery(cat, countryCode);
    if (Array.isArray(tradeVectors) && tradeVectors.length > 0) {
      return tradeVectors.map(v => ({ zoneName: `${cleanLoc} · ${v}`, queryText: `${v} in ${cleanLoc}`, isVectorQuery: true }));
    }
    return [
      { zoneName: `${cleanLoc} Residential Solar Panel Installers`, queryText: `Solar Panel Installation in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Commercial Solar EPC Contractors`, queryText: `Commercial Solar in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Rooftop Solar Energy Companies`, queryText: `Rooftop Solar in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Solar Inverter & Battery Storage`, queryText: `Solar Battery Storage in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 25. Water Damage Restoration & Mold Remediation
  if (lowerCat.match(/\b(restoration|water damage|flood cleanup|mold remediation|fire damage)\b/i)) {
    const tradeVectors = indiaTradeIntelligence.getSubvectorsForQuery(cat, countryCode);
    if (Array.isArray(tradeVectors) && tradeVectors.length > 0) {
      return tradeVectors.map(v => ({ zoneName: `${cleanLoc} · ${v}`, queryText: `${v} in ${cleanLoc}`, isVectorQuery: true }));
    }
    return [
      { zoneName: `${cleanLoc} 24/7 Water Damage Restoration`, queryText: `Water Damage Restoration in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Emergency Flood Extraction & Drying`, queryText: `Flood Cleanup in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Certified Mold Remediation Specialists`, queryText: `Mold Remediation in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Fire & Smoke Damage Restoration`, queryText: `Fire Damage Restoration in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 26. Swimming Pool Builders & Gunite Contractors
  if (lowerCat.match(/\b(pool builder|pool contractors?|swimming pool|inground pool|gunite pool)\b/i) && !lowerCat.match(/\b(cleaning|supplies|chlorine)\b/i)) {
    return [
      { zoneName: `${cleanLoc} Custom Inground Swimming Pool Builders`, queryText: `Pool Builders in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Gunite & Concrete Pool Contractors`, queryText: `Gunite Pool Contractors in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Luxury Backyard Pool & Spa Designers`, queryText: `Swimming Pool Contractors in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Inground Fiberglass Pool Installers`, queryText: `Inground Pools in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 27. Plastic Surgery, Cosmetic Surgery & Body Contouring
  if (lowerCat.match(/\b(plastic surg|cosmetic surg|rhinoplasty|liposuction|tummy tuck|breast augmentation)\b/i)) {
    return [
      { zoneName: `${cleanLoc} Board Certified Plastic Surgeons`, queryText: `Plastic Surgeons in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Cosmetic Surgery Centers`, queryText: `Cosmetic Surgery in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Rhinoplasty & Facial Plastic Surgeons`, queryText: `Rhinoplasty Specialist in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Body Contouring & Breast Centers`, queryText: `Body Contouring Clinic in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 28. Hair Transplant & Hair Restoration
  if (lowerCat.match(/\b(hair transplant|fue hair|hair restoration)\b/i)) {
    return [
      { zoneName: `${cleanLoc} FUE Hair Transplant Clinics`, queryText: `Hair Transplant Clinic in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Advanced Hair Restoration Surgeons`, queryText: `Hair Restoration Doctors in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Robotic Hair Transplant Centers`, queryText: `FUE Hair Transplant in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 29. IVF & Fertility Treatment Centers
  if (lowerCat.match(/\b(ivf|fertility clinic|test tube baby|infertility)\b/i)) {
    return [
      { zoneName: `${cleanLoc} IVF & Fertility Treatment Centers`, queryText: `IVF Center in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Advanced Reproductive Medicine Clinics`, queryText: `Fertility Clinic in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Egg Freezing & Infertility Specialists`, queryText: `Infertility Specialist in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 30. Scrap Metal Recyclers & Industrial Scrap Yards
  if (lowerCat.match(/\b(scrap metal|metal recycling|scrap yard|copper scrap|iron scrap)\b/i)) {
    return [
      { zoneName: `${cleanLoc} Industrial Scrap Metal Recyclers`, queryText: `Scrap Metal Recyclers in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Scrap Yards & Copper Buyers`, queryText: `Scrap Yard in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Ferrous & Non-Ferrous Scrap Dealers`, queryText: `Metal Recycling in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // 31. CNC Machining & Precision Fabrication
  if (lowerCat.match(/\b(cnc machining|precision machining|machine shop|laser cutting metal|sheet metal fabrication)\b/i)) {
    return [
      { zoneName: `${cleanLoc} Precision CNC Machining Centers`, queryText: `CNC Machining in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Industrial Laser Cutting Services`, queryText: `Laser Cutting Services in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Custom Sheet Metal Fabrication Shops`, queryText: `Sheet Metal Fabrication in ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  // Generic Dynamic Vectors (Tailored by country)
  if (isIntl) {
    return [
      { zoneName: `${cleanLoc} Downtown & Commercial Core`, queryText: `${cat} in Downtown ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Central Business District`, queryText: `Central ${cat} in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Top Rated Specialists`, queryText: `Best ${cat} in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Local Services`, queryText: `${cat} Services in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} 24 Hours / Emergency`, queryText: `24/7 ${cat} in ${cleanLoc}`, isVectorQuery: true },
      { zoneName: `${cleanLoc} Metro Area`, queryText: `${cat} near ${cleanLoc}`, isVectorQuery: true }
    ];
  }

  return [
    { zoneName: `${cleanLoc} Core`, queryText: `${cat} in ${cleanLoc}`, isVectorQuery: true },
    { zoneName: `${cleanLoc} Top Rated`, queryText: `Best ${cat} in ${cleanLoc}`, isVectorQuery: true },
    { zoneName: `${cleanLoc} Central / Main`, queryText: `${cat} in ${cleanLoc} Central`, isVectorQuery: true },
    { zoneName: `${cleanLoc} Commercial Market`, queryText: `${cat} near Market, ${cleanLoc}`, isVectorQuery: true },
    { zoneName: `${cleanLoc} Station & Bus Stand Area`, queryText: `${cat} near Railway Station / Bus Stand, ${cleanLoc}`, isVectorQuery: true },
    { zoneName: `${cleanLoc} Wholesale & Services`, queryText: `${cat} Services in ${cleanLoc}`, isVectorQuery: true }
  ];
}


module.exports = {
  getUniversalCategoryVectors
};
