'use strict';

/**
 * server/src/taxonomy/umbrellaSubs.js
 * Exhaustive localized subcategory matrices across 14 commercial sectors
 * for all 5 Sovereign Nations (IN, US, GB, AU, AE) and global default.
 */

const DENTAL_SUBS_BY_COUNTRY = {
  IN: [
    'Dental Clinics & Dental Care', 'Multispeciality Dental Hospitals', 'Dental Implants & Root Canal Centers',
    'Orthodontics & Braces Clinics', 'Pediatric Dentistry & Child Dental', 'Cosmetic Dentistry & Teeth Whitening'
  ],
  US: [
    'Family Dentistry Practices', 'Dental Implant & Oral Surgery Centers', 'Orthodontists & Clear Aligners',
    'Pediatric Dental Clinics', 'Periodontics & Gum Disease Centers', 'Cosmetic & Restorative Dentistry'
  ],
  GB: [
    'NHS & Private Dental Surgeries', 'Dental Implants & Oral Surgery', 'Orthodontic & Teeth Straightening Practices',
    'Paediatric Dental Clinics', 'Cosmetic Dentistry & Smile Clinics', 'Emergency Dental Practices'
  ],
  AU: [
    'Dental Surgeries & Family Dental', 'Dental Implant & Oral Surgery Centers', 'Orthodontists & Clear Aligners',
    'Children\'s Dental Clinics', 'Cosmetic Dentistry Studios', 'Emergency Dental Services'
  ],
  AE: [
    'Dental Clinics & Surgical Centers', 'Cosmetic Dentistry & Hollywood Smile', 'Orthodontic & Aligners Centers',
    'Pediatric Dental Clinics', 'Dental Implantology Centers', 'Laser Dentistry Clinics'
  ],
  default: [
    'Dental Clinics', 'Dental Hospitals', 'Dental Implants Centers',
    'Orthodontics & Braces Clinics', 'Root Canal & Endodontics', 'Pediatric Dentistry',
    'Oral & Maxillofacial Surgery', 'Prosthodontics & Cosmetic Dentistry'
  ]
};

const HOTEL_SUBS_BY_COUNTRY = {
  IN: [
    'Business & Executive Hotels', 'Luxury & Heritage Palace Hotels', 'Budget Hotels & Lodges',
    'Resorts & Hill Station Stays', 'Serviced Apartments & Extended Stays', 'Boutique Hotels'
  ],
  US: [
    'Boutique & Luxury Hotels', 'Business & Conference Hotels', 'Extended Stay Suites & Motels',
    'Resort Hotels & Lodges', 'Airport Hotels & Inns', 'Bed & Breakfast Inns'
  ],
  GB: [
    'Country House Hotels & Inns', 'Luxury & Boutique City Hotels', 'Bed & Breakfast (B&B) & Guest Houses',
    'Serviced Apartments & Aparthotels', 'Budget & Transit Hotels'
  ],
  AU: [
    'City Business Hotels', 'Beachfront & Coastal Resorts', 'Boutique & Heritage Hotels',
    'Motels & Roadside Lodges', 'Serviced Apartments & Suites'
  ],
  AE: [
    '5-Star Luxury & Waterfront Hotels', 'Business & Convention Hotels', 'Desert Resorts & Heritage Retreats',
    'Boutique & City Hotels', 'Serviced Hotel Apartments'
  ],
  default: [
    'Business & Executive Hotels', 'Luxury & Boutique Hotels', 'Budget Hotels & Lodges',
    'Resorts & Retreat Hotels', 'Serviced Apartments & Extended Stays'
  ]
};

const AUTOMOTIVE_SUBS_BY_COUNTRY = {
  IN: [
    'Authorized Car Dealerships & Showrooms', 'Multi-Brand Car Service Centers & Garages',
    'Tyre Dealers, Wheel Alignment & Balancing', 'Auto Body Shops & Denting Painting',
    'Car Detailing & Ceramic Coating Centers', 'Car Accessories & Audio Shops', 'Auto Spare Parts & Battery Dealers'
  ],
  US: [
    'Auto Dealerships & Showrooms', 'Independent Auto Repair & Mechanics', 'Collision Repair & Body Shops',
    'Tire & Wheel Service Centers', 'Auto Detailing & Ceramic Protection', 'Transmission & Brake Repair Shops',
    'Auto Parts & Supply Stores'
  ],
  GB: [
    'Car Dealerships & Franchised Dealers', 'MOT Testing Stations & Garages', 'Vehicle Repair & Crash Repair Centres',
    'Tyre Fitting & Exhaust Centres', 'Car Detailing & Valeting Services', 'Motor Factors & Auto Spares'
  ],
  AU: [
    'New & Used Car Dealerships', 'Mechanical & Logbook Service Workshops', 'Panel Beaters & Smash Repairers',
    'Tyre & 4x4 Wheel Service Centers', 'Mobile Mechanics & Roadside Service', 'Car Detailing & Ceramic Coatings'
  ],
  AE: [
    'Luxury & Exotic Car Dealerships', 'Automotive Repair & Service Garages', 'Auto Body & Paint Shops',
    'Tyre & Wheel Alignment Centers', 'Car Tinting, PPF & Detailing Studios', 'Auto Spare Parts Trading Centers'
  ],
  default: [
    'Authorized Car & Vehicle Dealerships', 'Multi-Brand Car Repair & Mechanics', 'Auto Body & Collision Repair Shops',
    'Tyre, Wheel Alignment & Balancing', 'Car Detailing & Ceramic Coating', 'Auto Electrical, AC & Battery Service',
    'Commercial Auto Spare Parts Dealers'
  ]
};

const SALON_SUBS_BY_COUNTRY = {
  IN: [
    'Unisex Hair & Styling Salons', 'Beauty Parlours & Bridal Studios', 'Men\'s Grooming Salons & Barbershops',
    'Skin, Laser & Aesthetic Clinics', 'Nail Art & Lash Extension Studios', 'Day Spas & Wellness Centers'
  ],
  US: [
    'Hair Salons & Color Studios', 'Barbershops & Men\'s Grooming', 'Nail Salons & Spa Pedicures',
    'Medical Spas & Esthetic Clinics', 'Day Spas & Massage Wellness Centers', 'Lash & Brow Studios'
  ],
  GB: [
    'Hairdressing Salons & Stylists', 'Barbershops & Traditional Grooming', 'Beauty Salons & Skin Clinics',
    'Nail Bars & Lash Lounges', 'Day Spas & Holistic Therapy Centres'
  ],
  AU: [
    'Hairdressing Salons & Hair Studios', 'Barbershops & Men\'s Grooming', 'Beauty Therapy & Skin Clinics',
    'Nail Salons & Lash Bars', 'Day Spas & Wellness Retreats'
  ],
  AE: [
    'Luxury Ladies Beauty Salons', 'Gentlemen\'s Grooming & Barbershops', 'Aesthetic & Laser Clinics',
    'Nail & Lash Lounges', 'Moroccan Bath & Day Spas'
  ],
  default: [
    'Unisex Hair & Styling Salons', 'Beauty Parlours & Facial Studios', 'Bridal Makeup Artists & Studios',
    'Barber & Men Grooming Shops', 'Skin, Laser & Aesthetic Clinics', 'Nail & Lash Studios', 'Day Spas & Wellness Centers'
  ]
};

const REAL_ESTATE_SUBS_BY_COUNTRY = {
  IN: [
    'Residential Real Estate Agents & Brokers', 'Commercial Property & Office Space Consultants',
    'Real Estate Developers & Builders', 'RERA Approved Property Advisors', 'Plot, Land & Layout Promoters',
    'Property Management & Rental Agencies'
  ],
  US: [
    'Residential Real Estate Brokerages', 'Commercial Real Estate Brokers', 'Property Management Companies',
    'Luxury Home Realtors', 'Multi-Family & Investment Real Estate', 'Land & Development Real Estate'
  ],
  GB: [
    'Estate Agents & Residential Sales', 'Lettings Agents & Property Management', 'Commercial Property Consultants',
    'Chartered Surveyors & Land Agents', 'New Homes & Development Specialists'
  ],
  AU: [
    'Licensed Real Estate Agencies & Auctions', 'Property Management & Rental Agents', 'Commercial Real Estate Brokers',
    'Buyer\'s Agents & Property Advisors', 'Strata Management & Project Marketing'
  ],
  AE: [
    'RERA Licensed Real Estate Brokerages', 'Off-Plan & Luxury Property Advisors', 'Commercial Leasing & Office Brokerages',
    'Property Management & Holiday Homes', 'Real Estate Developers & Investment Consultants'
  ],
  default: [
    'Residential Real Estate Agents', 'Commercial Property & Office Brokers', 'Real Estate Developers & Builders',
    'Property & Facility Management Firms', 'Land, Plot & Layout Promoters'
  ]
};

const MANUFACTURING_SUBS_BY_COUNTRY = {
  IN: [
    'CNC & Precision Machining Units', 'Metal & Structural Steel Fabricators', 'Plastics, Moulding & Packaging Plants',
    'Food & Agro Processing Units', 'Electrical & Industrial Equipment Manufacturers', 'Pharmaceutical & Formulation Plants',
    'Textile, Garment & Spinning Mills'
  ],
  US: [
    'Precision CNC Machining & Tooling', 'Sheet Metal & Structural Steel Fabrication', 'Plastics Injection Molding & Packaging',
    'Industrial Machinery & Equipment Manufacturing', 'Chemical & Specialty Coating Plants', 'Electronics & PCB Assembly Facilities'
  ],
  GB: [
    'Precision Engineering & CNC Machining', 'Metal Fabrication & Welding Contractors', 'Plastics & Polymers Manufacturing',
    'Food & Drink Processing Plants', 'Industrial Equipment & Electrical Manufacturing', 'Packaging & Box Manufacturers'
  ],
  AU: [
    'Precision Machining & General Engineering', 'Sheet Metal & Heavy Steel Fabricators', 'Plastics & Moulding Manufacturers',
    'Food & Beverage Processing Plants', 'Building Materials & Component Manufacturers', 'Packaging & Container Manufacturers'
  ],
  AE: [
    'Industrial Fabrication & Steel Workshops', 'Plastics, Moulding & Packaging Plants', 'Aluminium & Glass Fabrication Units',
    'Food Processing & Packaging Factories', 'Chemical & Building Product Manufacturers', 'Electrical Panel & Switchgear Factories'
  ],
  default: [
    'CNC & Precision Machining Units', 'Metal & Structural Steel Fabricators', 'Plastics, Moulding & Packaging Manufacturers',
    'Food & Agro Processing Plants', 'Electrical & Industrial Equipment Manufacturers', 'Pharmaceutical & Chemical Manufacturers',
    'Textile, Garment & Spinning Mills'
  ]
};

const WHOLESALE_SUBS_BY_COUNTRY = {
  IN: [
    'FMCG & Food Commodity Wholesalers', 'Pharmaceutical Distributors & Stockists', 'Building Material & Hardware Wholesalers',
    'Electrical & Cable Wholesalers', 'Textile, Saree & Garment Wholesalers', 'Packaging & Plastic Raw Material Distributors'
  ],
  US: [
    'Wholesale Food & Beverage Distributors', 'Pharmaceutical & Medical Supply Wholesalers', 'Building Supply & Lumber Wholesalers',
    'Electrical & Industrial Supply Distributors', 'Apparel & General Merchandise Wholesalers'
  ],
  GB: [
    'Food & Drink Wholesalers & Cash & Carry', 'Pharmaceutical Wholesalers & Factors', 'Builders Merchants & Hardware Wholesalers',
    'Electrical Wholesalers & Trade Counters', 'Textile & Clothing Wholesalers'
  ],
  AU: [
    'Food & Beverage Wholesalers', 'Pharmaceutical & Healthcare Distributors', 'Building Supplies & Trade Wholesalers',
    'Electrical Wholesalers & Suppliers', 'Packaging & Warehouse Supply Distributors'
  ],
  AE: [
    'Foodstuff & FMCG Wholesale Trading', 'Building Materials Wholesale Traders', 'Textile & Garment Wholesale Stockists',
    'Electronics & IT Hardware Wholesalers', 'Industrial Supply & Hardware Wholesalers'
  ],
  default: [
    'FMCG & Food Wholesalers', 'Pharmaceutical Distributors & Stockists', 'Building & Construction Material Wholesalers',
    'Electrical, Plumbing & Hardware Wholesalers', 'Agricultural & Commodity Wholesale Traders', 'Textile & Apparel Wholesalers'
  ]
};

const DIAGNOSTICS_SUBS_BY_COUNTRY = {
  IN: [
    'Pathology & Blood Test Labs', 'MRI, CT Scan & Diagnostic Centers', 'Ultrasound & Sonography Clinics',
    'X-Ray & Digital Radiology Labs', 'Health Checkup & Screening Centers'
  ],
  US: [
    'Clinical Pathology & Diagnostic Labs', 'Medical Imaging & Radiology Centers', 'MRI & CT Scan Centers',
    'Ultrasound & Mammography Clinics', 'Outpatient Diagnostic & Blood Draw Labs'
  ],
  GB: [
    'Private Pathology & Blood Test Labs', 'Diagnostic Imaging & MRI Centres', 'Ultrasound & Screening Clinics',
    'Radiology & X-Ray Centres', 'Health Screening & Diagnostic Clinics'
  ],
  AU: [
    'Pathology Collection Centres & Labs', 'Diagnostic Imaging & Radiology Clinics', 'MRI & CT Scanning Centers',
    'Ultrasound & Women\'s Imaging', 'Medical Diagnostic Clinics'
  ],
  AE: [
    'Accredited Pathology & Diagnostic Labs', 'Radiology & Medical Imaging Centers', 'MRI & CT Scan Clinics',
    'Ultrasound & Genetic Testing Centers', 'Comprehensive Health Screening Centers'
  ],
  default: [
    'Pathology & Blood Test Labs', 'MRI, CT Scan & Radiology Centers', 'Diagnostic & Health Checkup Centers',
    'Ultrasound & Sonography Clinics', 'Blood Banks & Genetic Labs'
  ]
};

const RETAIL_SUBS_BY_COUNTRY = {
  IN: [
    'Supermarkets & Hypermarkets', 'Electronics & Home Appliance Showrooms', 'Jewellery & Gold Showrooms',
    'Clothing & Saree Boutiques', 'Furniture & Home Decor Stores', 'Optical & Eyewear Stores', 'Mobile & Computer Stores'
  ],
  US: [
    'Supermarkets & Grocery Stores', 'Electronics & Appliance Stores', 'Jewelry Stores & Watch Retailers',
    'Apparel & Clothing Boutiques', 'Furniture & Home Furnishing Stores', 'Footwear & Sneaker Stores', 'Department Stores & Malls'
  ],
  GB: [
    'Supermarkets & Food Halls', 'Electrical & Appliance Retailers', 'Jewellers & Watch Boutiques',
    'Fashion Boutiques & Clothing Stores', 'Furniture & Bedding Showrooms', 'Shoe Shops & Footwear Retailers'
  ],
  AU: [
    'Supermarkets & Fresh Food Markets', 'Electronics & Appliance Retailers', 'Jewellery & Diamond Showrooms',
    'Clothing & Fashion Boutiques', 'Furniture & Homewares Stores', 'Footwear Stores'
  ],
  AE: [
    'Hypermarkets & Supermarkets', 'Electronics & Gadget Megastores', 'Gold Souk & Fine Jewellery Galleries',
    'Luxury Fashion & Apparel Boutiques', 'Furniture & Home Decor Showrooms', 'Perfume & Cosmetics Stores'
  ],
  default: [
    'Supermarkets & Hypermarkets', 'Electronics & Appliance Showrooms', 'Jewellery & Gold Showrooms',
    'Clothing & Apparel Boutiques', 'Furniture & Home Decor Stores', 'Optical & Eyewear Stores', 'Mobile & Computer Stores'
  ]
};

const IT_SOFTWARE_SUBS_BY_COUNTRY = {
  IN: [
    'Software Development & SaaS Companies', 'Web Design & Mobile App Development', 'IT Consulting & Managed Services',
    'Digital Marketing & SEO Agencies', 'Cloud Infrastructure & Cybersecurity Firms', 'Data Analytics & AI Solutions'
  ],
  US: [
    'Software Engineering & SaaS Companies', 'Custom Web & Mobile App Developers', 'Managed IT Services (MSP)',
    'Digital Marketing & Growth Agencies', 'Cloud & Cybersecurity Consultants', 'Enterprise IT Consulting Firms'
  ],
  GB: [
    'Software Development & Technology Companies', 'Web Design & Digital Agencies', 'Managed IT Support & MSPs',
    'Digital Marketing & SEO Agencies', 'Cloud Solutions & Cybersecurity Firms'
  ],
  AU: [
    'Software & App Development Companies', 'Managed IT Services & IT Support', 'Digital Marketing & Web Agencies',
    'Cloud & Cyber Security Consultants', 'Enterprise Technology Consultants'
  ],
  AE: [
    'Software & Mobile App Development Firms', 'IT Solutions & Infrastructure Providers', 'Digital Marketing & SEO Agencies',
    'Cloud Services & Cybersecurity Companies', 'AI & Digital Transformation Consultancies'
  ],
  default: [
    'Software & App Development Companies', 'IT Consulting & Managed Services', 'Digital Marketing & SEO Agencies',
    'Web Design & Creative Studios', 'Cloud, Data & Cybersecurity Firms'
  ]
};

const LOGISTICS_SUBS_BY_COUNTRY = {
  IN: [
    'Packers & Movers (Household & Office)', 'Freight Forwarding & Cargo Logistics', 'Cold Storage & Warehousing Facilities',
    'Express Courier & Parcel Services', 'Surface Transport & Fleet Operators', 'Customs Clearing & Forwarding Agents'
  ],
  US: [
    'Moving & Storage Companies', 'Freight Forwarding & Logistics Brokerages', 'Warehousing & 3PL Distribution Centers',
    'Express Courier & Delivery Services', 'Truckload & Intermodal Transport Carriers'
  ],
  GB: [
    'Removals & Storage Companies', 'Freight Forwarders & Global Logistics', 'Warehousing & Fulfilment Centres',
    'Same Day Courier & Express Delivery', 'Road Haulage & Distribution Contractors'
  ],
  AU: [
    'Removalists & Storage Services', 'Freight Forwarding & Customs Clearance', 'Warehousing & 3PL Logistics',
    'Couriers & Express Freight Services', 'Interstate Road Freight & Transport'
  ],
  AE: [
    'International Freight Forwarders', 'Moving & Relocation Companies', 'Warehousing & Logistics Centers',
    'Courier & Express Cargo Services', 'Customs Clearance & Sea/Air Cargo Agents'
  ],
  default: [
    'Freight & Cargo Forwarders', 'Packers & Movers', 'Cold Storage & Warehousing',
    'Courier & Express Parcel Services', 'Commercial Fleet & Transport Contractors'
  ]
};

const FITNESS_SUBS_BY_COUNTRY = {
  IN: [
    'Gyms & Fitness Centers', 'Yoga & Meditation Centers', 'CrossFit & Functional Training Gyms',
    'Martial Arts & Boxing Academies', 'Swimming Pools & Aquatic Centers', 'Zumba & Dance Fitness Studios'
  ],
  US: [
    'Gyms & Health Clubs', 'CrossFit & Functional Fitness Boxes', 'Yoga & Pilates Studios',
    'Personal Training Studios', 'Martial Arts & Boxing Gyms', 'Aquatics & Swimming Centers'
  ],
  GB: [
    'Gyms & Fitness Clubs', 'CrossFit & Strength Training Studios', 'Yoga & Pilates Studios',
    'Martial Arts & Boxing Academies', 'Leisure Centres & Swimming Pools'
  ],
  AU: [
    '24/7 Gyms & Fitness Clubs', 'CrossFit & Functional Training Centers', 'Pilates & Yoga Studios',
    'Martial Arts & Boxing Gyms', 'Aquatic & Swim Centres'
  ],
  AE: [
    'Luxury Gyms & Fitness Centers', 'CrossFit & Strength Training Studios', 'Yoga & Pilates Reformer Studios',
    'Martial Arts & Kickboxing Academies', 'Ladies Only Fitness Clubs'
  ],
  default: [
    'Gyms & Health Clubs', 'Yoga & Pilates Studios', 'CrossFit & Functional Training',
    'Sports & Swimming Academies', 'Martial Arts & Boxing Studios'
  ]
};

const EVENTS_SUBS_BY_COUNTRY = {
  IN: [
    'Wedding Planners & Event Coordinators', 'Banquet Halls & Marriage Mandaps', 'Event Photographers & Cinematographers',
    'Catering Services (Veg & Non-Veg)', 'Sound, Lighting & Stage Decorators', 'Corporate Event Management Agencies'
  ],
  US: [
    'Event & Wedding Planners', 'Banquet & Reception Halls', 'Event Photographers & Videographers',
    'Catering Companies', 'Audio Visual & Event Production', 'Corporate Event Planners'
  ],
  GB: [
    'Wedding Planners & Coordinators', 'Event Venues & Banquet Halls', 'Event Photographers & Videographers',
    'Catering & Event Dining Services', 'Marquee Hire & Event Production', 'Corporate Event Organisers'
  ],
  AU: [
    'Wedding Planners & Stylists', 'Function Centres & Reception Venues', 'Event & Wedding Photographers',
    'Catering Services', 'Audio Visual & Event Hire', 'Corporate Event Managers'
  ],
  AE: [
    'Luxury Wedding Planners & Designers', 'Ballrooms & Banquet Event Venues', 'Event Photographers & Production Teams',
    'Event Catering Companies', 'Corporate Event & Exhibition Organizers'
  ],
  default: [
    'Wedding Planners & Decorators', 'Photographers & Videographers', 'Catering Services',
    'Banquet & Convention Halls', 'Corporate Event Management Agencies'
  ]
};

const VETERINARY_SUBS_BY_COUNTRY = {
  IN: [
    'Veterinary Hospitals & Surgeons', 'Pet Clinics & Vaccination Centers', 'Pet Grooming Studios & Spas',
    'Pet Boarding & Kennels', 'Animal Care & NGO Shelters'
  ],
  US: [
    'Veterinary Hospitals & Emergency Clinics', 'Animal Clinics & Pet Wellness', 'Veterinary Surgical Centers',
    'Pet Grooming & Boarding Facilities', 'Mobile Veterinary Services'
  ],
  GB: [
    'Veterinary Surgeries & Animal Hospitals', 'Emergency Pet Vets', 'Veterinary Referral Centres',
    'Pet Grooming & Boarding Kennels'
  ],
  AU: [
    'Veterinary Hospitals & Clinics', 'Emergency Vet Hospitals', 'Specialist Veterinary Centers',
    'Pet Grooming & Boarding Services'
  ],
  AE: [
    'Veterinary Hospitals & Animal Clinics', 'Pet Vaccination & Surgery Centers', 'Pet Grooming Salons & Spas',
    'Pet Hotels & Boarding Facilities', 'Equine & Falcon Hospitals'
  ],
  default: [
    'Veterinary Hospitals & Surgeons', 'Pet Clinics & Vaccination Centers',
    'Pet Grooming, Boarding & Kennels', 'Animal Diagnostics & Care'
  ]
};

module.exports = {
  DENTAL_SUBS_BY_COUNTRY,
  HOTEL_SUBS_BY_COUNTRY,
  AUTOMOTIVE_SUBS_BY_COUNTRY,
  SALON_SUBS_BY_COUNTRY,
  REAL_ESTATE_SUBS_BY_COUNTRY,
  MANUFACTURING_SUBS_BY_COUNTRY,
  WHOLESALE_SUBS_BY_COUNTRY,
  DIAGNOSTICS_SUBS_BY_COUNTRY,
  RETAIL_SUBS_BY_COUNTRY,
  IT_SOFTWARE_SUBS_BY_COUNTRY,
  LOGISTICS_SUBS_BY_COUNTRY,
  FITNESS_SUBS_BY_COUNTRY,
  EVENTS_SUBS_BY_COUNTRY,
  VETERINARY_SUBS_BY_COUNTRY
};
