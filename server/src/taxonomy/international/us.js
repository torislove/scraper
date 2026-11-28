'use strict';

/**
 * taxonomy/international/us.js
 * Deep localized trade, healthcare, legal, and home vectors for the United States.
 */

module.exports = {
  name: 'United States',
  code: 'US',
  sectors: {
    'Education & Schools': {
      schools: [
        'Public High Schools & Academies',
        'Private & Preparatory Elementary Schools',
        'Charter & STEM Academies',
        'Montessori & Early Childhood Learning',
        'Christian & Catholic High Schools'
      ],
      colleges: [
        'Community & Junior Colleges',
        'State University Campuses & Technical Institutes'
      ],
      coaching: [
        'SAT & ACT Test Prep Centers',
        'Tutoring Services & Learning Centers'
      ]
    },
    'Healthcare & Dental': {
      hospitals: [
        'Regional Medical Centers',
        'General Hospitals & Health Systems',
        'Emergency & Urgent Care Hospitals',
        'Children\'s Hospitals & Pediatric Care'
      ],
      dental: [
        'Family & Cosmetic Dentistry Practices',
        'Orthodontists & Clear Aligner Specialists',
        'Dental Implant & Oral Surgery Centers',
        'Pediatric & Family Dental Clinics',
        'Emergency Dental Care Clinics'
      ],
      doctors: [
        'Primary Care & Family Medicine Clinics',
        'Urgent Care & Walk-in Medical Centers',
        'Orthopedic & Physical Therapy Clinics',
        'Dermatology & Skin Care Centers'
      ]
    },
    'Trade & Home Improvement': {
      roofing: [
        'Residential Roofing Contractors',
        'Commercial Flat Roof Repair Specialists',
        'Storm Damage & Roof Replacement'
      ],
      hvac: [
        'HVAC Installation & Heating Contractors',
        'Air Conditioning Repair & Maintenance',
        'Duct Cleaning & Indoor Air Quality'
      ],
      plumbing: [
        'Residential Emergency Plumbing Services',
        'Commercial Plumbing & Pipe Fitting',
        'Drain Cleaning & Water Heater Repair'
      ],
      solar: [
        'Residential Rooftop Solar Contractors',
        'Commercial Solar Energy Systems',
        'Battery Storage & Solar Installers'
      ],
      electricians: [
        'Licensed Residential Electricians',
        'Commercial Electrical Contractors',
        'EV Charger & Panel Upgrade Electricians'
      ]
    },
    'Legal & Financial': {
      lawyers: [
        'Personal Injury & Accident Law Firms',
        'Criminal Defense & DUI Attorneys',
        'Estate Planning & Probate Lawyers',
        'Family Law & Divorce Attorneys',
        'Corporate & Business Formation Lawyers'
      ],
      accountants: [
        'Certified Public Accountants (CPA)',
        'Small Business Tax & Bookkeeping Services',
        'IRS Tax Resolution & Audit Defense'
      ]
    },
    'Real Estate': {
      realtor: [
        'Residential Real Estate Brokerages',
        'Commercial Real Estate Agents & Brokers',
        'Property Management & Leasing Companies',
        'Multi-Family & Rental Real Estate'
      ]
    },
    'Food & Hospitality': {
      restaurants: [
        'Steakhouses & Fine Dining Grills',
        'Italian Trattorias & Pizzerias',
        'Mexican & Tex-Mex Restaurants',
        'Craft Breweries & Gastropubs',
        'Cafes & Breakfast Diners'
      ]
    }
  },
  colloquials: {
    pharmacy: ['Drugstore', 'Pharmacy'],
    grocery: ['Supermarket', 'Grocery Store'],
    gas_station: ['Gas Station', 'Service Station'],
    attorney: ['Lawyer', 'Law Firm', 'Counsel']
  }
};
