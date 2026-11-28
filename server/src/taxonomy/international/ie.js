'use strict';

/**
 * taxonomy/international/ie.js
 * Sovereign business taxonomy for Ireland (IE).
 */

module.exports = {
  name: 'Ireland',
  code: 'IE',
  sectors: {
    'Education & Schools': {
      schools: [
        'Secondary Schools & Voluntary Academies',
        'Primary National Schools (Gaelscoileanna)',
        'Montessori Schools & Crèches'
      ],
      colleges: [
        'Technological Universities & Colleges',
        'National Universities of Ireland'
      ]
    },
    'Healthcare & Dental': {
      dental: [
        'Dental Surgeries & Orthodontic Clinics',
        'Family Dentistry & Cosmetic Care'
      ],
      doctors: [
        'GP Surgeries & Family Medical Practices',
        'Chartered Physiotherapy Clinics'
      ]
    },
    'Trades & Services': {
      plumbers: [
        'Registered Gas Installers (RGI) & Plumbers',
        'Emergency Boiler Repair & Heating Services'
      ],
      electricians: [
        'Safe Electric Registered Electrical Contractors',
        'EV Charger & Solar PV Installers'
      ],
      builders: [
        'CIRIB Registered Building Contractors',
        'Roofing & Home Insulation Specialists'
      ]
    },
    'Legal & Financial': {
      lawyers: [
        'Solicitors & Legal Practice Firms',
        'Conveyancing & Probate Solicitors'
      ],
      accountants: [
        'Chartered Accountants Ireland',
        'Revenue Tax Consultants & Bookkeepers'
      ],
      realtor: [
        'PSRA Licensed Auctioneers & Estate Agents',
        'Residential Letting Agencies'
      ]
    }
  }
};
