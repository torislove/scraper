'use strict';

/**
 * taxonomy/international/nz.js
 * Sovereign business taxonomy for New Zealand (NZ).
 */

module.exports = {
  name: 'New Zealand',
  code: 'NZ',
  sectors: {
    'Education & Schools': {
      schools: [
        'State High Schools & Colleges',
        'Integrated & Private Secondary Schools',
        'Primary & Intermediate Schools',
        'Early Childhood Education (ECE) Centres'
      ],
      colleges: [
        'Te Pūkenga Polytechnics & Institutes',
        'New Zealand Universities'
      ]
    },
    'Healthcare & Dental': {
      dental: [
        'Dental Practices & Oral Health Surgeries',
        'Orthodontists & Cosmetic Dental Studios'
      ],
      doctors: [
        'General Practice (GP) Medical Centres',
        'Physiotherapy & Allied Health Clinics'
      ]
    },
    'Tradies & Construction': {
      plumbers: [
        'Certifying Plumbers, Drainlayers & Gasfitters',
        'Emergency Plumbing Services'
      ],
      electricians: [
        'Registered Master Electricians',
        'Heat Pump & Solar Installers'
      ],
      builders: [
        'Registered Master Builders',
        'Roofing & Renovation Specialists'
      ]
    },
    'Professional & Legal': {
      lawyers: [
        'Barristers & Solicitors Law Firms',
        'Property & Conveyancing Solicitors'
      ],
      accountants: [
        'Chartered Accountants (CA ANZ)',
        'Small Business Tax & Bookkeeping'
      ],
      realtor: [
        'Licensed Real Estate Agencies (REA)',
        'Residential & Commercial Property Agents'
      ]
    }
  }
};
