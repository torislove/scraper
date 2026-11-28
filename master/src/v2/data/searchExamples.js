/**
 * master/src/v2/data/searchExamples.js
 * Strictly District & State search examples for Master Fleet across the 5 Revenue Countries (IN, US, GB, AU, AE).
 */

export const MASTER_EXAMPLES_BY_COUNTRY = {
  IN: [
    'Hotels in Guntur District, Andhra Pradesh',
    'Hospitals in NTR District, Andhra Pradesh',
    'Plumbers in Hyderabad District, Telangana',
    'Dental Clinics in Rangareddy District, Telangana',
    'Schools in Pune District, Maharashtra',
    'Pharmacies in Telangana'
  ],
  US: [
    'Roofing Contractors in Harris County, Texas',
    'Dental Clinics in Dallas County, Texas',
    'Plumbers in Austin / Travis County, Texas',
    'HVAC Repair in Los Angeles County, California'
  ],
  GB: [
    'Schools in Greater London, England',
    'Plumbers in Greater Manchester, England',
    'Law Firms in West Midlands, England',
    'Private Clinics in Kent, England'
  ],
  AU: [
    'Solar Installers in City of Parramatta, New South Wales',
    'Plumbers in Greater Sydney, New South Wales',
    'Dental Clinics in Greater Melbourne, Victoria',
    'Builders in City of Brisbane, Queensland'
  ],
  AE: [
    'Plumbers in Dubai Emirate, Dubai',
    'PRO Services in Abu Dhabi Region, Abu Dhabi',
    'Real Estate in Dubai Emirate, Dubai',
    'Medical Centers in Sharjah Emirate, Sharjah'
  ]
};

export const MASTER_QUICK_CHIPS = MASTER_EXAMPLES_BY_COUNTRY;

export function getMasterExamplesForCountry(cc = 'IN') {
  return MASTER_EXAMPLES_BY_COUNTRY[String(cc || 'IN').toUpperCase()] || MASTER_EXAMPLES_BY_COUNTRY.IN;
}
