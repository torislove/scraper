'use strict';

/**
 * taxonomy/international/ca.js
 * Sovereign business taxonomy for Canada (CA).
 */

module.exports = {
  name: 'Canada',
  code: 'CA',
  sectors: {
    'Education & Schools': {
      schools: [
        'Public Elementary & Secondary Schools',
        'Catholic District High Schools',
        'Private & French Immersion Schools',
        'Montessori & Early Learning Daycares'
      ],
      colleges: [
        'Community Colleges & Polytechs',
        'Canadian Universities & Research Institutes'
      ]
    },
    'Healthcare & Dental': {
      dental: [
        'Dental Clinics & Orthodontists',
        'Family Dentistry & Implant Centers',
        'Emergency Dental Walk-in Clinics'
      ],
      doctors: [
        'Family Medicine Walk-in Clinics',
        'Medical Diagnostic & Imaging Centers',
        'Physiotherapy & Sports Rehab Clinics'
      ]
    },
    'Trades & Construction': {
      hvac: [
        'Licensed HVAC & Heating Contractors',
        'Furnace Repair & Air Conditioning'
      ],
      plumbing: [
        'Licensed Plumbers & Drain Cleaning',
        'Emergency Residential Plumbing'
      ],
      roofing: [
        'Roofing Contractors & Snow Removal',
        'Commercial Flat Roof Waterproofing'
      ],
      electricians: [
        'Certified Master Electricians',
        'Residential & Commercial Wiring'
      ]
    },
    'Professional & Financial': {
      lawyers: [
        'Barristers & Solicitors',
        'Immigration & Real Estate Law Firms',
        'Personal Injury & Family Law Counsel'
      ],
      accountants: [
        'Chartered Professional Accountants (CPA)',
        'CRA Tax Prep & Corporate Auditing'
      ],
      realtor: [
        'Licensed Real Estate Brokerages',
        'Commercial Property Agents'
      ]
    }
  }
};
