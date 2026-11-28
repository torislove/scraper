'use strict';

/**
 * taxonomy/niches.js
 * Commercial Niches with verified subcategories and keyword anchors.
 */

const SPECIFIC_NICHES = {
  dental: {
    key: 'dental',
    label: 'Dentists & Dental Hospitals',
    sectorCode: '62',
    patterns: [/\b(dentist|dentists|dental|teeth|tooth|orthodont|implant|root\s*canal)\b/i],
    subvectors: [
      'Dental Clinics & Orthodontists',
      'Dental Hospitals & Implant Centers',
      'Root Canal & Cosmetic Dentistry',
      'Pediatric Dental Specialists',
      'Smile Care Clinics'
    ]
  },
  eye_care: {
    key: 'eye_care',
    label: 'Eye Hospitals & Ophthalmologists',
    sectorCode: '62',
    patterns: [/\b(eye\s*hospital|eye\s*clinic|ophthalmologist|optometrist|lasik|cataract)\b/i],
    subvectors: [
      'Super Speciality Eye Hospitals',
      'Laser & Lasik Surgery Eye Centers',
      'Cataract & Retina Specialists',
      'Optometry & Vision Care Clinics'
    ]
  },
  pediatric: {
    key: 'pediatric',
    label: 'Children & Pediatric Hospitals',
    sectorCode: '62',
    patterns: [/\b(pediatric|paediatric|child\s*specialist|children\s*hospital)\b/i],
    subvectors: [
      'Children & Pediatric Hospitals',
      'Neonatal & Infant Care Centers',
      'Child Care & Vaccination Clinics'
    ]
  },
  maternity: {
    key: 'maternity',
    label: 'Maternity Hospitals & Gynecologists',
    sectorCode: '62',
    patterns: [/\b(maternity|gynecologist|gynaecologist|ivf|fertility)\b/i],
    subvectors: [
      'Maternity Hospitals & Nursing Homes',
      'Gynecology & Obstetrics Clinics',
      'IVF & Fertility Treatment Centers'
    ]
  },
  orthopedic: {
    key: 'orthopedic',
    label: 'Orthopedic & Joint Hospitals',
    sectorCode: '62',
    patterns: [/\b(orthopedic|orthopaedic|bone|joint\s*replacement|spine)\b/i],
    subvectors: [
      'Orthopedic & Trauma Care Hospitals',
      'Joint Replacement & Arthroscopy Centers',
      'Spine & Fracture Care Clinics'
    ]
  },
  real_estate: {
    key: 'real_estate',
    label: 'Real Estate Brokers & Developers',
    sectorCode: '53',
    patterns: [/\b(real\s*estate|realtor|property|plots|villas|apartments|flats)\b/i],
    subvectors: [
      'Residential Real Estate Brokerages',
      'Commercial Property & Plots Developers',
      'Villas & Gated Community Projects',
      'Property Management & Rental Agencies'
    ]
  },
  legal: {
    key: 'legal',
    label: 'Advocates & Legal Counsel',
    sectorCode: '54',
    patterns: [/\b(lawyer|advocate|solicitor|attorney|legal|high\s*court)\b/i],
    subvectors: [
      'High Court & District Advocates',
      'Civil & Property Dispute Lawyers',
      'Criminal Defense Legal Counsel',
      'Corporate & Taxation Law Firms'
    ]
  },
  chartered_accountant: {
    key: 'chartered_accountant',
    label: 'Chartered Accountants & Tax Advisors',
    sectorCode: '54',
    patterns: [/\b(chartered\s*accountant|ca\s*firm|cpa|gst\s*consultant|tax\s*advisor)\b/i],
    subvectors: [
      'Chartered Accountants (CA) & Auditors',
      'GST & Income Tax Return Consultants',
      'Company Incorporation & Auditing Firms',
      'Bookkeeping & Financial Advisory'
    ]
  },
  roofing: {
    key: 'roofing',
    label: 'Roofing Contractors & Waterproofing',
    sectorCode: '23',
    patterns: [/\b(roofing|roofer|roof\s*repair|waterproofing)\b/i],
    subvectors: [
      'Residential Roofing Contractors',
      'Commercial Flat Roof Repair Specialists',
      'Roof Leak & Waterproofing Contractors'
    ]
  },
  hvac: {
    key: 'hvac',
    label: 'HVAC & Air Conditioning Services',
    sectorCode: '23',
    patterns: [/\b(hvac|air\s*conditioning|ac\s*repair|heating\s*contractor)\b/i],
    subvectors: [
      'HVAC Installation & Maintenance',
      'Commercial AC Repair & Duct Services',
      'Emergency Heating & Air Conditioning'
    ]
  },
  solar: {
    key: 'solar',
    label: 'Solar Panel & Renewable Energy',
    sectorCode: '23',
    patterns: [/\b(solar|solar\s*panel|solar\s*inverter|renewable)\b/i],
    subvectors: [
      'Residential Rooftop Solar Installers',
      'Commercial Solar Power Contractors',
      'Solar Inverter & Battery Storage Systems'
    ]
  }
};

function resolveNiche(text) {
  const q = String(text || '').toLowerCase();
  for (const [, niche] of Object.entries(SPECIFIC_NICHES)) {
    for (const pat of niche.patterns) {
      if (pat.test(q)) {
        return niche;
      }
    }
  }
  return null;
}

module.exports = {
  SPECIFIC_NICHES,
  resolveNiche
};
