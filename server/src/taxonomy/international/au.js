'use strict';

/**
 * taxonomy/international/au.js
 * Deep localized tradies, renewable solar, medical, and hospitality vectors for Australia.
 */

module.exports = {
  name: 'Australia',
  code: 'AU',
  sectors: {
    'Education & Schools': {
      schools: [
        'Public Primary & High Schools',
        'Secondary Colleges & Academies',
        'Grammar & Independent Schools',
        'Catholic Regional Colleges',
        'Early Learning & Daycare Centres'
      ],
      colleges: [
        'TAFE Institutes & Vocational Training',
        'University Campuses & Higher Education'
      ],
      coaching: [
        'HSC & VCE Tutoring Colleges',
        'Primary & Secondary Math Tutoring Centers'
      ]
    },
    'Tradies & Construction': {
      plumbers: [
        'Licensed Plumbers & Gasfitters',
        'Blocked Drains & Hydro-Jetting Specialists',
        'Hot Water System Replacement & Heat Pumps',
        'Commercial Plumbing Contractors'
      ],
      electricians: [
        'Licensed Master Electricians',
        'Residential Switchboard Upgrades',
        'Emergency 24/7 Electricians',
        'EV Charger Installation'
      ],
      solar: [
        'CEC Accredited Solar Installers',
        'Rooftop Solar & Battery Storage Systems',
        'Commercial Solar Energy Contractors'
      ],
      builders: [
        'Master Builders & Home Renovations',
        'Carpenters & Decking Specialists',
        'Roof & Gutter Repair Contractors',
        'Concreters & Landscaping Specialists'
      ]
    },
    'Healthcare & Medical': {
      hospitals: [
        'Public & Private Hospitals',
        'Regional Health Services & Base Hospitals',
        'Specialist Medical & Surgical Centres'
      ],
      dental: [
        'Family Dental Care & Dental Surgeries',
        'Orthodontists & Clear Aligners',
        'Dental Implant & Cosmetic Centers'
      ],
      doctors: [
        'Bulk Billing Medical Centres',
        'General Practitioners (GP Clinics)',
        'Physiotherapy & Allied Health Clinics',
        'Skin Cancer & Dermatology Clinics'
      ]
    },
    'Professional & Legal': {
      lawyers: [
        'Solicitors & Legal Practices',
        'Conveyancing & Property Lawyers',
        'Family Law & Estate Planning Solicitors'
      ],
      accountants: [
        'CPA Australia & Chartered Accountants',
        'ATO Tax Return & BAS Agents',
        'Small Business Accounting & Bookkeeping'
      ],
      realtor: [
        'Licensed Real Estate Agents & Auctions',
        'Property Managers & Rental Agencies',
        'Commercial Real Estate Brokers'
      ]
    },
    'Food & Hospitality': {
      cafes: [
        'Specialty Coffee Roasters & Espresso Bars',
        'All-Day Breakfast & Brunch Cafes',
        'Artisan Bakeries & Patisseries'
      ],
      restaurants: [
        'Modern Australian Dining & Bistros',
        'Craft Breweries & Pub Dining',
        'Italian Pizzerias & Trattorias',
        'Asian Fusion & Thai Restaurants'
      ]
    }
  },
  colloquials: {
    contractor: ['Tradie', 'Tradesperson'],
    doctor: ['Medical Centre', 'GP', 'Doctor Surgery'],
    liquor: ['Bottle Shop', 'Bottle-o'],
    pharmacy: ['Chemist', 'Pharmacy']
  }
};
