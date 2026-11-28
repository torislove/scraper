/**
 * shared/data/countries.js
 * Authoritative 5-Market High-Revenue Registry (IN Main + US, GB, AU, AE)
 * with Native Vocabulary, Local Formats, Easy Payment Rail Meta, and Compliance Summaries.
 */

export function flagOf(code) {
  const v = String(code || '').toUpperCase();
  const map = { IN: '🇮🇳', US: '🇺🇸', GB: '🇬🇧', UK: '🇬🇧', AU: '🇦🇺', AE: '🇦🇪' };
  return map[v] || '🌍';
}

export const COUNTRIES = [
  {
    code: 'IN',
    name: 'India',
    nativeName: 'India · भारत',
    flag: '🇮🇳',
    phone: '+91',
    phoneSample: '+91 98480 ••••• · STD 0863 ••••••',
    currency: 'INR (₹)',
    paymentRail: 'Razorpay · UPI / QR / Cards',
    hoursSample: 'Mon–Sat · 09:30–20:30 IST',
    isFocus: true,
    centroid: { lat: 20.5937, lng: 78.9629, zoom: 5 },
    adminHierarchy: 'State → District → Mandal / Municipal Ward → PIN',
    defaultCity: 'Hyderabad',
    cities: ['Hyderabad', 'Bengaluru', 'Mumbai', 'Delhi', 'Chennai', 'Pune', 'Guntur', 'Vijayawada'],
    placeholder: 'e.g. "Plumbers in Hyderabad" or "Sanitaryware in Bengaluru"',
    vocabulary: [
      { term: 'Multi-Speciality Hospital', category: 'Hospitals', sampleCity: 'Hyderabad' },
      { term: 'Plumbing Contractors', category: 'Plumbers', sampleCity: 'Hyderabad' },
      { term: 'Sanitaryware & Pipe Stores', category: 'PVC Pipes', sampleCity: 'Bengaluru' },
      { term: 'Dental Implants & Clinics', category: 'Dental Implants', sampleCity: 'Mumbai' }
    ],
    compliance: {
      laws: 'Digital Personal Data Protection Act (DPDP Act, 2023) & TRAI Commercial Communication Rules',
      summary: 'Covers publicly listed commercial establishments and business contact numbers. Commercial outreach in India is subject to DPDP Act notice/consent rules and TRAI DND preferences.'
    }
  },
  {
    code: 'US',
    name: 'United States',
    nativeName: 'United States',
    flag: '🇺🇸',
    phone: '+1',
    phoneSample: '+1 (214) •••-••••',
    currency: 'USD ($)',
    paymentRail: 'Stripe · Cards / Apple Pay / Link',
    hoursSample: 'Mon–Fri · 8:00 AM – 5:30 PM CT',
    isFocus: true,
    centroid: { lat: 37.0902, lng: -95.7129, zoom: 4 },
    adminHierarchy: 'State → County → City / Metro → ZIP Code',
    defaultCity: 'Dallas',
    cities: ['Dallas', 'Houston', 'Austin', 'New York', 'Chicago', 'Miami', 'Los Angeles', 'Atlanta'],
    placeholder: 'e.g. "Plumbers in Austin" or "Plumbing Supply Stores in Dallas"',
    vocabulary: [
      { term: 'Regional Medical Center', category: 'Hospitals', sampleCity: 'Dallas' },
      { term: 'Emergency Plumbing & Rooter', category: 'Plumbers', sampleCity: 'Austin' },
      { term: 'Kitchen & Bath Showrooms', category: 'Bathroom Fittings', sampleCity: 'Houston' },
      { term: 'Personal Injury Attorneys', category: 'Lawyers', sampleCity: 'Chicago' }
    ],
    compliance: {
      laws: 'CAN-SPAM Act, TCPA (Telephone Consumer Protection Act), & State Privacy Acts (CCPA/CPRA)',
      summary: 'Extracts publicly published business directory listings. Automated calling/SMS and commercial email in the US are regulated by TCPA, Do-Not-Call registries, CAN-SPAM, and state privacy statutes.'
    }
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    nativeName: 'United Kingdom',
    flag: '🇬🇧',
    phone: '+44',
    phoneSample: '+44 7700 •••••• · 020 •••• ••••',
    currency: 'GBP (£)',
    paymentRail: 'Stripe · Cards / Apple Pay / Faster Pay',
    hoursSample: 'Mon–Fri · 08:30–17:30 GMT',
    isFocus: true,
    centroid: { lat: 54.5, lng: -2.5, zoom: 5 },
    adminHierarchy: 'Nation / Region → County → Borough / Postal Town → Postcode',
    defaultCity: 'London',
    cities: ['London', 'Manchester', 'Birmingham', 'Leeds', 'Edinburgh', 'Glasgow', 'Bristol'],
    placeholder: 'e.g. "Gas Safe Plumbers in Manchester" or "Dental Surgery in London"',
    vocabulary: [
      { term: 'NHS & Private Hospital', category: 'Hospitals', sampleCity: 'London' },
      { term: 'Gas Safe Heating Engineer', category: 'Plumbers', sampleCity: 'Manchester' },
      { term: 'Plumbers Merchants & Showrooms', category: 'Bathroom Fittings', sampleCity: 'Birmingham' },
      { term: 'NICEIC Electrician', category: 'Electricians', sampleCity: 'Leeds' }
    ],
    compliance: {
      laws: 'UK GDPR, Data Protection Act 2018, & PECR (Privacy and Electronic Communications Regulations)',
      summary: 'Indexes public corporate and trade listings. B2B outreach in the UK must respect UK GDPR lawful-basis requirements, PECR corporate subscriber rules, and TPS/CTPS screening.'
    }
  },
  {
    code: 'AU',
    name: 'Australia',
    nativeName: 'Australia',
    flag: '🇦🇺',
    phone: '+61',
    phoneSample: '+61 4•• ••• ••• · (02) •••• ••••',
    currency: 'AUD ($)',
    paymentRail: 'Stripe · Cards / Apple Pay / Google Pay',
    hoursSample: 'Mon–Fri · 08:00–17:00 AEST',
    isFocus: true,
    centroid: { lat: -25.2744, lng: 133.7751, zoom: 4 },
    adminHierarchy: 'State / Territory → LGA → Suburb → Postcode',
    defaultCity: 'Sydney',
    cities: ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Canberra', 'Parramatta'],
    placeholder: 'e.g. "Licensed Plumber in Brisbane" or "CEC Solar in Sydney"',
    vocabulary: [
      { term: 'Public & Private Hospital', category: 'Hospitals', sampleCity: 'Sydney' },
      { term: 'Licensed Plumber & Gasfitter', category: 'Plumbers', sampleCity: 'Brisbane' },
      { term: 'CEC Solar Installers', category: 'Solar', sampleCity: 'Melbourne' },
      { term: 'Master Electrician', category: 'Electricians', sampleCity: 'Perth' }
    ],
    compliance: {
      laws: 'Australian Spam Act 2003, Privacy Act 1988 (APPs), & Do Not Call Register Act',
      summary: 'Collects publicly available business contact records. Commercial electronic messages in Australia require consent (express or inferred from conspicuous business publication), sender identification, and an unsubscribe facility.'
    }
  },
  {
    code: 'AE',
    name: 'United Arab Emirates',
    nativeName: 'UAE · الإمارات',
    flag: '🇦🇪',
    phone: '+971',
    phoneSample: '+971 50 ••• •••• · 04 ••• ••••',
    currency: 'AED (د.إ)',
    paymentRail: 'Stripe UAE / Razorpay Intl · Cards & Apple Pay',
    hoursSample: 'Mon–Fri · 09:00–18:00 GST',
    isFocus: true,
    centroid: { lat: 24.4539, lng: 54.3773, zoom: 6 },
    adminHierarchy: 'Emirate → Mainland / Free Zone → Sector',
    defaultCity: 'Dubai',
    cities: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Business Bay', 'JAFZA'],
    placeholder: 'e.g. "MEP Plumbers in Dubai" or "PRO Services in Abu Dhabi"',
    vocabulary: [
      { term: 'Multi-Specialty Hospital', category: 'Hospitals', sampleCity: 'Dubai' },
      { term: 'MEP & Plumbing Contractors', category: 'Plumbers', sampleCity: 'Dubai' },
      { term: 'Sanitaryware & Tile Showrooms', category: 'Bathroom Fittings', sampleCity: 'Sharjah' },
      { term: 'Freezone PRO & Business Setup', category: 'Company Formation', sampleCity: 'Abu Dhabi' }
    ],
    compliance: {
      laws: 'UAE Federal Decree-Law No. 45 of 2021 (PDPL) & TDRA Telemarketing Regulations',
      summary: 'Indexes public mainland and free-zone commercial listings. Commercial calls and electronic outreach in the UAE are subject to PDPL principles and TDRA Do-Not-Call Registry (DNCR) rules.'
    }
  }
];

export const FOCUS_COUNTRIES = COUNTRIES;
export const SOVEREIGN_COUNTRIES = COUNTRIES;
export const ALL_COUNTRIES = COUNTRIES;

export function getCountryByCode(code) {
  const norm = String(code || 'IN').toUpperCase();
  return COUNTRIES.find((c) => c.code === norm) || COUNTRIES[0];
}
