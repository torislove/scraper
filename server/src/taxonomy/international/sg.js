'use strict';

/**
 * taxonomy/international/sg.js
 * Sovereign business taxonomy for Singapore (SG).
 */

module.exports = {
  name: 'Singapore',
  code: 'SG',
  sectors: {
    'Education & Schools': {
      schools: [
        'MOE Secondary & Primary Schools',
        'International & IB World Schools',
        'Pre-Schools & Childcare Centres',
        'Tuition & Enrichment Centres'
      ],
      colleges: [
        'Autonomous Universities & Polytechnics',
        'Private Education Institutes'
      ]
    },
    'Healthcare & Dental': {
      dental: [
        'Dental Surgeries & Orthodontic Clinics',
        'Specialist Dental Implant Centres'
      ],
      doctors: [
        'GP Clinics & Family Medicine',
        'Aesthetics & Medical Specialist Centres'
      ]
    },
    'Trade & Services': {
      aircon: [
        'Aircon Servicing & Chemical Overhaul',
        'Commercial Aircon Maintenance'
      ],
      renovation: [
        'HDB & Condo Renovation Contractors',
        'Commercial Interior Designers'
      ],
      plumbing: [
        'PUB Licensed Plumbers',
        'Emergency 24/7 Sanitary Plumbers'
      ]
    },
    'Corporate & Finance': {
      corporate: [
        'Corporate Secretarial & Incorporation Services',
        'ACRA Registered Filing Agents'
      ],
      lawyers: [
        'Advocates & Solicitors Law Corporations',
        'Commercial & Conveyancing Law Practices'
      ],
      accountants: [
        'Chartered Accountants of Singapore (ISCA)',
        'Audit & Corporate Tax Advisors'
      ]
    }
  }
};
