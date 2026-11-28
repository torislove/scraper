'use strict';

/**
 * taxonomy/international/in.js
 * Deep localized trade, healthcare, services, and APMC vectors for India.
 */

module.exports = {
  name: 'India',
  code: 'IN',
  sectors: {
    'Education & Schools': {
      schools: [
        'CBSE & ICSE High Schools',
        'International & Cambridge Schools',
        'Play Schools & Kindergarten',
        'State Board High Schools',
        'Junior Colleges & High Schools',
        'Residential Convent Schools'
      ],
      colleges: [
        'Degree & Engineering Colleges',
        'Medical & Pharmacy Colleges',
        'Junior Colleges & IIT Academies'
      ],
      coaching: [
        'IIT-JEE & NEET Coaching Centers',
        'Civil Services & UPSC Academies',
        'Tuition & Tutorial Classes'
      ]
    },
    'Healthcare & Medical': {
      hospitals: [
        'Multi-Speciality Hospitals',
        'Super Speciality & Emergency Hospitals',
        'General Hospitals',
        'Trauma Care Hospitals',
        'Private & Trust Hospitals'
      ],
      hospital: [
        'Multi-Speciality Hospitals',
        'Super Speciality Hospitals',
        'General Hospitals',
        'Emergency Hospitals'
      ],
      dental: [
        'Dental Clinics & Orthodontists',
        'Dental Hospitals & Implant Centers',
        'Root Canal & Cosmetic Dentistry',
        'Pediatric Dental Specialists'
      ],
      eye: [
        'Eye Hospitals & Laser Centers',
        'Ophthalmology & Cataract Clinics',
        'Eye Care Centers & Netralayas'
      ],
      doctors: [
        'Multi-Speciality Hospitals',
        'Ayurvedic & Homeopathic Clinics',
        'Pediatric & Child Specialist Hospitals',
        'Orthopedic & Trauma Care Centers',
        'Maternity & IVF Fertility Hospitals'
      ],
      pharmacy: [
        '24/7 Medical Stores & Chemists',
        'Wholesale Pharma Distributors',
        'Ayurvedic & Herbal Medicines'
      ]
    },
    'Trade & APMC Commodities': {
      turmeric: [
        'Turmeric Wholesalers & Commission Agents',
        'Turmeric Merchants & Mandi Traders',
        'Turmeric Processing & Polishing Units',
        'Spices & Turmeric Exporters'
      ],
      chilli: [
        'Red Chilli Merchants & Commission Agents',
        'Guntur Chilli Cold Storage & Exporters',
        'Spices & Chilli Powder Processing Mills',
        'APMC Yard Chilli Commission Agents'
      ],
      cotton: [
        'Cotton Ginning & Pressing Mills',
        'Raw Cotton Bales & Seed Merchants',
        'Spinning Mills & Yarn Traders'
      ],
      steel: [
        'TMT Steel Bars Wholesalers & Stockists',
        'Steel Rolling Mills & Fabricators',
        'Iron & Steel Traders'
      ]
    },
    'Food & Hospitality': {
      catering: [
        'Pure Veg Brahmin Wedding Caterers',
        'Hyderabadi Dum Biryani Caterers',
        'Traditional South Indian Meals & Tiffin Catering',
        'Outdoor Party & Live Counter Food Caterers'
      ],
      restaurants: [
        'Family Multi-Cuisine Dine-in Restaurants',
        'Hyderabadi Dum Biryani & Mandi Houses',
        'Pure Vegetarian & Traditional Thali Dining',
        'South Indian Tiffin & Breakfast Centers',
        'Bakeries, Confectioneries & Cake Shops'
      ],
      sweets: [
        'Traditional Mithai & Sweet Stalls',
        'Dry Fruit & Ghee Sweets Outlets',
        'Bakery & Confectionery Marts'
      ]
    },
    'Home & Trade Services': {
      plumbers: [
        'Plumbers',
        'Plumbing Contractors',
        'Emergency Plumbing Repairs',
        'Drainage & Pipe Leak Repair'
      ],
      electricians: [
        'Electrical Contractors & Wiring Specialists',
        'Inverter & Battery Repair Services',
        'Commercial Electricians'
      ],
      contractors: [
        'Building Construction Contractors',
        'Civil & Structural Contractors',
        'Interior Designers & Decorators'
      ]
    },
    'Professional & Legal': {
      lawyers: [
        'High Court & District Advocates',
        'Civil & Property Dispute Lawyers',
        'Criminal Defense Advocates'
      ],
      accountants: [
        'Chartered Accountants (CA)',
        'GST & Income Tax Return Consultants',
        'Company Registration & Auditing Firms'
      ]
    }
  },
  colloquials: {
    restaurant: ['Hotel', 'Dhaba', 'Tiffin Center', 'Bhojanalaya', 'Biryani House', 'Mess'],
    pharmacy: ['Medical Store', 'Chemist', 'Dawa Khana'],
    grocery: ['Kirana Store', 'Provision Store', 'General Store'],
    sweets: ['Mithai Shop', 'Sweet Stall', 'Confectionery']
  }
};
