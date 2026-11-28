'use strict';

/**
 * taxonomy/international/gb.js
 * Deep localized trade, healthcare, legal, and hospitality vectors for the United Kingdom.
 */

module.exports = {
  name: 'United Kingdom',
  code: 'GB',
  sectors: {
    'Education & Schools': {
      schools: [
        'Grammar Schools & Academies',
        'Primary Schools & Nurseries',
        'Independent Preparatory Schools',
        'Secondary Schools & Sixth Form Colleges'
      ],
      colleges: [
        'Further Education Colleges',
        'Universities & Higher Education Institutes'
      ],
      coaching: [
        'GCSE & A-Level Tutoring Centres',
        '11 Plus Exam Tuition Centres'
      ]
    },
    'Trade Services': {
      plumbers: [
        'Gas Safe Registered Plumbers & Heating Engineers',
        'Boiler Repair & Central Heating Installations',
        'Emergency Drainage & Plumbing Specialists',
        'Bathroom Installation Contractors'
      ],
      electricians: [
        'NICEIC Approved Electrical Contractors',
        'Domestic Rewiring & Fuse Box Specialists',
        'Commercial Electrical Contractors',
        'EV Charger Installation Electricians'
      ],
      builders: [
        'Building Contractors & House Extensions',
        'Loft Conversion & Renovation Specialists',
        'Roofing Contractors & Gutter Repairs',
        'Joiners & Carpenters'
      ]
    },
    'Healthcare & Dental': {
      hospitals: [
        'NHS Trust Hospitals',
        'Private Hospitals & Health Clinics',
        'General Infirmaries & Medical Centres'
      ],
      dental: [
        'NHS & Private Dental Surgeries',
        'Cosmetic Dentistry & Smile Clinics',
        'Dental Implant & Orthodontic Centers'
      ],
      doctors: [
        'Private GP & Medical Practices',
        'Physiotherapy & Osteopathy Clinics',
        'Opticians & Eye Care Specialists'
      ]
    },
    'Professional & Legal': {
      lawyers: [
        'Solicitors & Legal Practices',
        'Conveyancing & Property Solicitors',
        'Family Law & Divorce Solicitors',
        'Personal Injury & Claims Solicitors'
      ],
      accountants: [
        'Chartered Accountants (ACCA / ICAEW)',
        'HMRC Self Assessment & Tax Advisors',
        'Small Business Bookkeeping & Payroll'
      ],
      realtor: [
        'Residential Estate Agents & Lettings',
        'Commercial Property Agents',
        'Chartered Surveyors & Valuers'
      ]
    },
    'Food & Hospitality': {
      restaurants: [
        'Traditional British Gastropubs & Inns',
        'Authentic Indian Curry Houses & Tandoori',
        'Fish & Chip Shops (Chippies)',
        'Italian Trattorias & Pizzerias',
        'Artisan Coffee Roasters & Tea Rooms'
      ]
    }
  },
  colloquials: {
    pharmacy: ['Chemist', 'Pharmacy'],
    pub: ['Public House', 'Gastropub', 'Inn', 'Tavern'],
    realtor: ['Estate Agent', 'Lettings Agent'],
    lawyer: ['Solicitor', 'Barrister']
  }
};
