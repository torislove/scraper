'use strict';

/**
 * taxonomy/international/global.js
 * Sovereign business taxonomies for CA, DE, FR, AE, SG, NZ, and IE.
 */

module.exports = {
  CA: {
    name: 'Canada',
    sectors: {
      'Healthcare': ['Dental Clinics & Orthodontists', 'Family Doctors & Medical Walk-ins', 'Physiotherapy Clinics'],
      'Trades & Construction': ['Licensed HVAC Contractors', 'Plumbing & Drain Services', 'Roofing & Snow Removal'],
      'Professional': ['Barristers & Solicitors', 'Chartered Professional Accountants (CPA)', 'Real Estate Brokerages']
    }
  },
  DE: {
    name: 'Germany',
    sectors: {
      'Handwerk & Bau': ['Zahnärzte & Kieferorthopäden', 'Sanitär & Heizungsbau Meisterbetriebe', 'Elektroinstallation & Meisterbetriebe'],
      'Dienstleistungen': ['Rechtsanwälte & Kanzleien', 'Steuerberater & Wirtschaftsprüfer', 'Immobilienmakler']
    }
  },
  FR: {
    name: 'France',
    sectors: {
      'Santé & Médical': ['Chirurgiens Dentistes & Soins', 'Médecins Généralistes & Cabinets', 'Pharmacies de Garde'],
      'Bâtiment & Artisans': ['Plombiers Chauffagistes Rénovation', 'Électriciens Qualifiés', 'Artisans Couvreurs'],
      'Alimentation': ['Boulangeries & Pâtisseries Artisanales', 'Brasseries & Restaurants Traditionnels']
    }
  },
  AE: {
    name: 'United Arab Emirates',
    sectors: {
      'Medical & Dental': ['Dental Clinics & Implant Centers', 'Multi-Specialty Medical Centers', 'Cosmetic Dermatology'],
      'Corporate & Trade': ['General Trading & Commodity Exporters', 'Company Formation Consultants', 'Real Estate & Luxury Villas']
    }
  },
  SG: {
    name: 'Singapore',
    sectors: {
      'Medical': ['Dental Surgeries & Orthodontics', 'Aesthetic & Dermatology Clinics', 'GP Medical Clinics'],
      'Corporate': ['Corporate Secretarial & Accounting', 'Shipping & Logistics Freight Forwarders', 'Tech & Fintech']
    }
  },
  NZ: {
    name: 'New Zealand',
    sectors: {
      'Tradies': ['Registered Plumbers & Gasfitters', 'Master Electricians', 'Roofing & Building Contractors'],
      'Healthcare': ['Dental Practices & Surgeries', 'Medical Centres & Physiotherapy']
    }
  },
  IE: {
    name: 'Ireland',
    sectors: {
      'Trades': ['Registered Gas Installers & Plumbers', 'Safe Electric Contractors', 'Building & Roofing'],
      'Legal & Dental': ['Solicitors & Law Firms', 'Chartered Accountants', 'Dental Surgeries & Orthodontists']
    }
  }
};
