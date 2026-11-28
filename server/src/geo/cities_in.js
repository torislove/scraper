'use strict';

/**
 * cities_in.js
 * Authoritative municipal zone clusters for India (IN).
 */

module.exports = {
  guntur: {
    city: 'Guntur',
    state: 'Andhra Pradesh',
    country: 'IN',
    center: { lat: 16.3067, lng: 80.4365 },
    bounds: { minLat: 16.22, maxLat: 16.38, minLng: 80.36, maxLng: 80.52 },
    rejectTerms: ['mumbai', 'maharashtra', 'mangalagiri', 'tenali', 'vijayawada', 'hyderabad', 'bengaluru', 'chennai', 'delhi'],
    zones: [
      { name: 'Brodipet', lat: 16.3075, lng: 80.4350, radiusKm: 1.5 },
      { name: 'Arundelpet', lat: 16.3030, lng: 80.4420, radiusKm: 1.5 },
      { name: 'Lakshmipuram', lat: 16.3150, lng: 80.4280, radiusKm: 1.5 },
      { name: 'Kothapet', lat: 16.3120, lng: 80.4500, radiusKm: 1.5 },
      { name: 'Collectorate Area', lat: 16.3010, lng: 80.4460, radiusKm: 1.5 },
      { name: 'Gujjanagundla', lat: 16.2950, lng: 80.4200, radiusKm: 1.5 },
      { name: 'Pattabhipuram', lat: 16.3100, lng: 80.4220, radiusKm: 1.5 },
      { name: 'Amaravathi Road', lat: 16.3200, lng: 80.4150, radiusKm: 2.0 },
      { name: 'Old Guntur', lat: 16.2900, lng: 80.4550, radiusKm: 2.0 },
      { name: 'Nallapadu', lat: 16.2750, lng: 80.4050, radiusKm: 2.5 },
      { name: 'Auto Nagar', lat: 16.3350, lng: 80.4580, radiusKm: 2.0 },
      { name: 'Vidya Nagar', lat: 16.3180, lng: 80.4250, radiusKm: 1.5 },
      { name: 'Syamala Nagar', lat: 16.3050, lng: 80.4270, radiusKm: 1.5 },
      { name: 'Koritepadu', lat: 16.3250, lng: 80.4410, radiusKm: 1.5 },
      { name: 'Naaz Centre', lat: 16.3025, lng: 80.4445, radiusKm: 1.0 },
      { name: 'Krishna Nagar', lat: 16.3085, lng: 80.4192, radiusKm: 1.5 },
      { name: 'Brindavan Gardens', lat: 16.3150, lng: 80.4220, radiusKm: 1.5 }
    ]
  },

  tenali: {
    city: 'Tenali',
    state: 'Andhra Pradesh',
    country: 'IN',
    center: { lat: 16.2430, lng: 80.6400 },
    bounds: { minLat: 16.18, maxLat: 16.30, minLng: 80.58, maxLng: 80.70 },
    rejectTerms: ['mumbai', 'hyderabad', 'delhi', 'bangalore'],
    zones: [
      { name: 'Bose Road', lat: 16.2435, lng: 80.6410, radiusKm: 1.5 },
      { name: 'Chenchupet', lat: 16.2410, lng: 80.6450, radiusKm: 1.5 },
      { name: 'Ramalingeswara Pet', lat: 16.2460, lng: 80.6380, radiusKm: 1.5 },
      { name: 'Morrispet', lat: 16.2390, lng: 80.6350, radiusKm: 1.5 },
      { name: 'Station Road', lat: 16.2480, lng: 80.6430, radiusKm: 1.5 },
      { name: 'Market Yard', lat: 16.2360, lng: 80.6480, radiusKm: 1.5 },
      { name: 'Gandhi Nagar', lat: 16.2450, lng: 80.6500, radiusKm: 1.5 }
    ]
  },

  chilakaluripet: {
    city: 'Chilakaluripet',
    state: 'Andhra Pradesh',
    country: 'IN',
    center: { lat: 16.0892, lng: 80.1672 },
    bounds: { minLat: 16.04, maxLat: 16.14, minLng: 80.11, maxLng: 80.22 },
    rejectTerms: ['mumbai', 'hyderabad', 'delhi', 'bangalore'],
    zones: [
      { name: 'NH16 Bypass & Service Road', lat: 16.0880, lng: 80.1650, radiusKm: 1.5 },
      { name: 'Kalamandir Centre', lat: 16.0910, lng: 80.1680, radiusKm: 1.5 },
      { name: 'Subhash Nagar', lat: 16.0930, lng: 80.1630, radiusKm: 1.5 },
      { name: 'Pandaripuram', lat: 16.0860, lng: 80.1710, radiusKm: 1.5 },
      { name: 'Market Yard & Cotton Market', lat: 16.0840, lng: 80.1640, radiusKm: 1.5 },
      { name: 'RTC Bus Stand Area', lat: 16.0905, lng: 80.1665, radiusKm: 1.5 },
      { name: 'Ganapathi Nagar', lat: 16.0950, lng: 80.1700, radiusKm: 1.5 },
      { name: 'Purushothapatnam Road', lat: 16.0929, lng: 80.1550, radiusKm: 2.0 }
    ]
  },

  vijayawada: {
    city: 'Vijayawada',
    state: 'Andhra Pradesh',
    country: 'IN',
    center: { lat: 16.5062, lng: 80.6480 },
    bounds: { minLat: 16.42, maxLat: 16.58, minLng: 80.55, maxLng: 80.75 },
    rejectTerms: ['mumbai', 'hyderabad', 'delhi', 'bangalore', 'chennai'],
    zones: [
      { name: 'Benz Circle', lat: 16.4998, lng: 80.6525, radiusKm: 2.0 },
      { name: 'Governorpet', lat: 16.5120, lng: 80.6270, radiusKm: 1.5 },
      { name: 'Auto Nagar', lat: 16.4950, lng: 80.6820, radiusKm: 2.5 },
      { name: 'Moghalrajpuram', lat: 16.5050, lng: 80.6420, radiusKm: 1.5 },
      { name: 'Suryaraopet', lat: 16.5080, lng: 80.6310, radiusKm: 1.5 },
      { name: 'Bhavanipuram', lat: 16.5260, lng: 80.5980, radiusKm: 2.0 },
      { name: 'One Town', lat: 16.5180, lng: 80.6120, radiusKm: 1.5 },
      { name: 'Patamata', lat: 16.4920, lng: 80.6650, radiusKm: 2.0 },
      { name: 'Labbipet', lat: 16.5020, lng: 80.6390, radiusKm: 1.5 },
      { name: 'Gunadala', lat: 16.5210, lng: 80.6680, radiusKm: 2.0 }
    ]
  },

  hyderabad: {
    city: 'Hyderabad',
    state: 'Telangana',
    country: 'IN',
    center: { lat: 17.3850, lng: 78.4867 },
    bounds: { minLat: 17.20, maxLat: 17.60, minLng: 78.25, maxLng: 78.65 },
    rejectTerms: ['mumbai', 'delhi', 'bangalore', 'chennai', 'kolkata'],
    zones: [
      { name: 'Banjara Hills', lat: 17.4156, lng: 78.4350, radiusKm: 2.5 },
      { name: 'Jubilee Hills', lat: 17.4319, lng: 78.4073, radiusKm: 2.5 },
      { name: 'Hitec City', lat: 17.4474, lng: 78.3762, radiusKm: 3.0 },
      { name: 'Gachibowli', lat: 17.4401, lng: 78.3489, radiusKm: 3.0 },
      { name: 'Secunderabad', lat: 17.4399, lng: 78.4983, radiusKm: 3.0 },
      { name: 'Madhapur', lat: 17.4483, lng: 78.3915, radiusKm: 2.5 },
      { name: 'Kukatpally', lat: 17.4947, lng: 78.3996, radiusKm: 3.0 },
      { name: 'Begumpet', lat: 17.4448, lng: 78.4664, radiusKm: 2.5 },
      { name: 'Kondapur', lat: 17.4699, lng: 78.3578, radiusKm: 2.5 },
      { name: 'Ameerpet', lat: 17.4375, lng: 78.4482, radiusKm: 2.0 },
      { name: 'Dilsukhnagar', lat: 17.3688, lng: 78.5247, radiusKm: 2.5 },
      { name: 'Charminar', lat: 17.3616, lng: 78.4747, radiusKm: 2.0 },
      { name: 'Somajiguda', lat: 17.4265, lng: 78.4578, radiusKm: 2.0 },
      { name: 'Panjagutta', lat: 17.4285, lng: 78.4502, radiusKm: 2.0 },
      { name: 'Mehdipatnam', lat: 17.3916, lng: 78.4385, radiusKm: 2.0 },
      { name: 'Uppal', lat: 17.4018, lng: 78.5602, radiusKm: 3.0 },
      { name: 'LB Nagar', lat: 17.3457, lng: 78.5522, radiusKm: 3.0 },
      { name: 'Miyapur', lat: 17.4968, lng: 78.3614, radiusKm: 2.5 },
      { name: 'Manikonda', lat: 17.4042, lng: 78.3792, radiusKm: 2.5 },
      { name: 'Financial District', lat: 17.4150, lng: 78.3410, radiusKm: 2.5 }
    ]
  },

  bangalore: {
    city: 'Bangalore',
    state: 'Karnataka',
    country: 'IN',
    center: { lat: 12.9716, lng: 77.5946 },
    bounds: { minLat: 12.80, maxLat: 13.15, minLng: 77.45, maxLng: 77.78 },
    rejectTerms: ['mumbai', 'delhi', 'chennai', 'hyderabad', 'kolkata'],
    zones: [
      { name: 'Koramangala', lat: 12.9352, lng: 77.6245, radiusKm: 2.5 },
      { name: 'Indiranagar', lat: 12.9784, lng: 77.6408, radiusKm: 2.5 },
      { name: 'HSR Layout', lat: 12.9121, lng: 77.6446, radiusKm: 2.5 },
      { name: 'Whitefield', lat: 12.9698, lng: 77.7500, radiusKm: 3.5 },
      { name: 'Jayanagar', lat: 12.9308, lng: 77.5838, radiusKm: 2.5 },
      { name: 'Electronic City', lat: 12.8452, lng: 77.6602, radiusKm: 3.5 },
      { name: 'JP Nagar', lat: 12.9063, lng: 77.5857, radiusKm: 2.5 },
      { name: 'Malleshwaram', lat: 13.0031, lng: 77.5643, radiusKm: 2.0 },
      { name: 'Marathahalli', lat: 12.9591, lng: 77.6974, radiusKm: 2.5 },
      { name: 'BTM Layout', lat: 12.9165, lng: 77.6101, radiusKm: 2.0 }
    ]
  },

  mumbai: {
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'IN',
    center: { lat: 19.0760, lng: 72.8777 },
    bounds: { minLat: 18.89, maxLat: 19.30, minLng: 72.75, maxLng: 73.05 },
    rejectTerms: ['delhi', 'bangalore', 'hyderabad', 'kolkata', 'chennai', 'guntur'],
    zones: [
      { name: 'Bandra West', lat: 19.0596, lng: 72.8295, radiusKm: 2.0 },
      { name: 'Andheri West', lat: 19.1197, lng: 72.8468, radiusKm: 2.5 },
      { name: 'Powai', lat: 19.1176, lng: 72.9060, radiusKm: 2.5 },
      { name: 'Colaba', lat: 18.9067, lng: 72.8147, radiusKm: 2.0 },
      { name: 'Bandra Kurla Complex (BKC)', lat: 19.0657, lng: 72.8687, radiusKm: 2.0 },
      { name: 'Dadar', lat: 19.0178, lng: 72.8478, radiusKm: 2.0 },
      { name: 'Borivali', lat: 19.2307, lng: 72.8567, radiusKm: 3.0 },
      { name: 'Juhu', lat: 19.0988, lng: 72.8264, radiusKm: 2.0 },
      { name: 'Lower Parel', lat: 18.9953, lng: 72.8301, radiusKm: 1.5 },
      { name: 'Thane', lat: 19.2183, lng: 72.9781, radiusKm: 3.5 }
    ]
  },

  delhi: {
    city: 'Delhi',
    state: 'Delhi',
    country: 'IN',
    center: { lat: 28.6139, lng: 77.2090 },
    bounds: { minLat: 28.40, maxLat: 28.88, minLng: 76.90, maxLng: 77.45 },
    rejectTerms: ['mumbai', 'bangalore', 'chennai', 'hyderabad', 'kolkata'],
    zones: [
      { name: 'Connaught Place', lat: 28.6315, lng: 77.2167, radiusKm: 2.0 },
      { name: 'South Extension', lat: 28.5729, lng: 77.2215, radiusKm: 2.0 },
      { name: 'Hauz Khas', lat: 28.5494, lng: 77.2001, radiusKm: 2.0 },
      { name: 'Saket', lat: 28.5244, lng: 77.2167, radiusKm: 2.5 },
      { name: 'Karol Bagh', lat: 28.6514, lng: 77.1907, radiusKm: 2.0 },
      { name: 'Rohini', lat: 28.7159, lng: 77.1154, radiusKm: 3.0 },
      { name: 'Dwarka', lat: 28.5921, lng: 77.0460, radiusKm: 3.5 },
      { name: 'Noida Sector 18', lat: 28.5708, lng: 77.3260, radiusKm: 2.5 },
      { name: 'Gurgaon Cyber City', lat: 28.4950, lng: 77.0895, radiusKm: 3.0 },
      { name: 'Lajpat Nagar', lat: 28.5700, lng: 77.2400, radiusKm: 2.0 }
    ]
  },

  chennai: {
    city: 'Chennai',
    state: 'Tamil Nadu',
    country: 'IN',
    center: { lat: 13.0827, lng: 80.2707 },
    bounds: { minLat: 12.90, maxLat: 13.25, minLng: 80.12, maxLng: 80.35 },
    rejectTerms: ['mumbai', 'delhi', 'bangalore', 'hyderabad'],
    zones: [
      { name: 'T Nagar', lat: 13.0418, lng: 80.2341, radiusKm: 2.0 },
      { name: 'Anna Nagar', lat: 13.0850, lng: 80.2101, radiusKm: 2.5 },
      { name: 'Adyar', lat: 13.0012, lng: 80.2565, radiusKm: 2.0 },
      { name: 'Velachery', lat: 12.9815, lng: 80.2180, radiusKm: 2.5 },
      { name: 'Mylapore', lat: 13.0368, lng: 80.2676, radiusKm: 2.0 },
      { name: 'Alwarpet', lat: 13.0334, lng: 80.2505, radiusKm: 1.5 },
      { name: 'Nungambakkam', lat: 13.0569, lng: 80.2425, radiusKm: 2.0 },
      { name: 'Guindy', lat: 13.0067, lng: 80.2030, radiusKm: 2.5 },
      { name: 'OMR Tech Corridor', lat: 12.9249, lng: 80.2289, radiusKm: 3.5 },
      { name: 'Kilpauk', lat: 13.0813, lng: 80.2424, radiusKm: 2.0 }
    ]
  }
};
