'use strict';

/**
 * server/src/master/adminRegistry.js
 * Authoritative 11-Sovereign-Country Administrative Hierarchy Registry (States/Regions & Districts/Counties)
 * for Master Fleet ONLY. Client city zones remain untouched in server/src/geo/.
 */

const COUNTRY_ADMIN_LABELS = {
  IN: { level1: 'State / UT', level2: 'District', level3: 'Mandal / Taluk & Town', districtSuffixRe: /\b(district|dist\.?|zilla)\b/i },
  US: { level1: 'State', level2: 'County / Borough', level3: 'Township / City / CDP', districtSuffixRe: /\b(county|parish|borough)\b/i },
  GB: { level1: 'Nation / Region', level2: 'County / Metro Borough', level3: 'Borough / Market Town / Parish', districtSuffixRe: /\b(county|shire|borough|greater\s+\w+)\b/i },
  AU: { level1: 'State / Territory', level2: 'Region / LGA', level3: 'Suburb / Town / Shire', districtSuffixRe: /\b(shire|lga|region|council|city\s+of)\b/i },
  AE: { level1: 'Emirate', level2: 'Emirate / Region', level3: 'Sector / Town / Community', districtSuffixRe: /\b(emirate|region|municipality)\b/i }
};

const MASTER_ADMIN_PACK = {
  IN: {
    states: [
      { name: 'Andhra Pradesh', aliases: ['ap', 'andhra'], capitalDistrict: 'NTR District', districts: ['Guntur District', 'NTR District', 'Krishna District', 'Visakhapatnam District', 'Tirupati District', 'Chittoor District', 'East Godavari District', 'West Godavari District', 'Prakasam District', 'Nellore District', 'Kurnool District', 'Anantapur District', 'Kadapa District', 'Palnadu District', 'Bapatla District', 'Srikakulam District', 'Vizianagaram District', 'Eluru District', 'Kakinada District'] },
      { name: 'Telangana', aliases: ['ts', 'tg'], capitalDistrict: 'Hyderabad District', districts: ['Hyderabad District', 'Rangareddy District', 'Medchal-Malkajgiri District', 'Sangareddy District', 'Warangal District', 'Hanamkonda District', 'Nizamabad District', 'Karimnagar District', 'Khammam District', 'Nalgonda District', 'Mahabubnagar District', 'Suryapet District', 'Siddipet District'] },
      { name: 'Maharashtra', aliases: ['mh'], capitalDistrict: 'Mumbai Suburban District', districts: ['Mumbai Suburban District', 'Mumbai City District', 'Pune District', 'Thane District', 'Nagpur District', 'Nashik District', 'Chhatrapati Sambhajinagar District', 'Kolhapur District', 'Solapur District', 'Raigad District'] },
      { name: 'Karnataka', aliases: ['ka'], capitalDistrict: 'Bengaluru Urban District', districts: ['Bengaluru Urban District', 'Bengaluru Rural District', 'Mysuru District', 'Dakshina Kannada District', 'Hubballi-Dharwad District', 'Belagavi District', 'Kalaburagi District', 'Udupi District'] },
      { name: 'Tamil Nadu', aliases: ['tn'], capitalDistrict: 'Chennai District', districts: ['Chennai District', 'Coimbatore District', 'Madurai District', 'Tiruchirappalli District', 'Salem District', 'Chengalpattu District', 'Vellore District', 'Tirunelveli District'] },
      { name: 'Delhi', aliases: ['ncr', 'new delhi'], capitalDistrict: 'Central Delhi District', districts: ['Central Delhi District', 'South Delhi District', 'New Delhi District', 'North Delhi District', 'East Delhi District', 'West Delhi District'] },
      { name: 'Gujarat', aliases: ['gj'], capitalDistrict: 'Ahmedabad District', districts: ['Ahmedabad District', 'Surat District', 'Vadodara District', 'Rajkot District', 'Gandhinagar District'] },
      { name: 'Rajasthan', aliases: ['rj'], capitalDistrict: 'Jaipur District', districts: ['Jaipur District', 'Jodhpur District', 'Udaipur District', 'Kota District', 'Ajmer District'] },
      { name: 'Uttar Pradesh', aliases: ['up'], capitalDistrict: 'Lucknow District', districts: ['Lucknow District', 'Gautam Buddha Nagar District', 'Ghaziabad District', 'Kanpur Nagar District', 'Varanasi District', 'Agra District', 'Prayagraj District'] },
      { name: 'West Bengal', aliases: ['wb'], capitalDistrict: 'Kolkata District', districts: ['Kolkata District', 'North 24 Parganas District', 'South 24 Parganas District', 'Howrah District', 'Darjeeling District'] },
      { name: 'Kerala', aliases: ['kl'], capitalDistrict: 'Ernakulam District', districts: ['Ernakulam District', 'Thiruvananthapuram District', 'Kozhikode District', 'Thrissur District', 'Kottayam District'] }
    ],
    districts: {
      'guntur district': {
        state: 'Andhra Pradesh', hq: 'Guntur', center: { lat: 16.3067, lng: 80.4365 },
        towns: ['Tenali', 'Mangalagiri', 'Ponnur', 'Tadepalle', 'Chilakaluripet', 'Narasaraopet', 'Sattenapalle', 'Bapatla', 'Repalle'],
        mandals: ['Guntur East', 'Guntur West', 'Prathipadu', 'Phirangipuram', 'Tadikonda', 'Medikonduru', 'Pedakakani', 'Chebrolu', 'Vatticherukuru', 'Duggirala', 'Kollipara', 'Tsundur', 'Amaravathi', 'Thullur', 'Kakumanu', 'Muppalla', 'Pedanandipadu']
      },
      'ntr district': {
        state: 'Andhra Pradesh', hq: 'Vijayawada', center: { lat: 16.5062, lng: 80.6480 },
        towns: ['Ibrahimpatnam', 'Jaggaiahpeta', 'Nandigama', 'Tiruvuru', 'Kondapalli'],
        mandals: ['Vijayawada Central', 'Vijayawada East', 'Vijayawada West', 'Vijayawada North', 'Mylavaram', 'G. Konduru', 'Kanchikacherla', 'Veerullapadu', 'Chandarlapadu', 'Penuganchiprolu', 'Vatsavai', 'A. Konduru', 'Gampalagudem', 'Reddigudem', 'Vissannapeta']
      },
      'krishna district': {
        state: 'Andhra Pradesh', hq: 'Machilipatnam', center: { lat: 16.1875, lng: 81.1389 },
        towns: ['Gudivada', 'Vuyyuru', 'Nuzvid', 'Pedana', 'Avanigadda'],
        mandals: ['Machilipatnam', 'Gudivada', 'Gannavaram', 'Kankipadu', 'Penamaluru', 'Unguturu', 'Pamarru', 'Movva', 'Challapalli', 'Ghantasala', 'Koduru', 'Nagayalanka', 'Bantumilli', 'Kruthivennu']
      },
      'hyderabad district': {
        state: 'Telangana', hq: 'Hyderabad', center: { lat: 17.3850, lng: 78.4867 },
        towns: ['Secunderabad', 'Golconda', 'Charminar'],
        mandals: ['Amberpet', 'Asifnagar', 'Bahadurpura', 'Bandlaguda', 'Charminar', 'Golconda', 'Himayatnagar', 'Khairatabad', 'Maredpally', 'Musheerabad', 'Nampally', 'Saidabad', 'Secunderabad', 'Shaikpet', 'Tirumalagiri', 'Ameerpet']
      },
      'rangareddy district': {
        state: 'Telangana', hq: 'Hyderabad', center: { lat: 17.3000, lng: 78.4000 },
        towns: ['Shamshabad', 'Rajendranagar', 'Shadnagar', 'Ibrahimpatnam', 'Maheshwaram', 'Chevella', 'Serilingampally', 'L. B. Nagar'],
        mandals: ['Serilingampally', 'Rajendranagar', 'Gandipet', 'Shamshabad', 'Maheshwaram', 'Kandukur', 'Hayathnagar', 'Abdullapurmet', 'Saroornagar', 'Balapur', 'Moinabad', 'Shankarpally', 'Chevella', 'Shabad', 'Farooqnagar']
      },
      'visakhapatnam district': {
        state: 'Andhra Pradesh', hq: 'Visakhapatnam', center: { lat: 17.6868, lng: 83.2185 },
        towns: ['Bheemunipatnam', 'Gajuwaka', 'Pendurthi', 'Anakapalle'],
        mandals: ['Visakhapatnam Urban', 'Visakhapatnam Rural', 'Bheemunipatnam', 'Gajuwaka', 'Pendurthi', 'Anandapuram', 'Padmanabham', 'Pedagantyada', 'Seethammadhara', 'Gopalapatnam', 'Maharanipeta']
      },
      'pune district': {
        state: 'Maharashtra', hq: 'Pune', center: { lat: 18.5204, lng: 73.8567 },
        towns: ['Pimpri-Chinchwad', 'Baramati', 'Lonavala', 'Talegaon Dabhade', 'Chakan', 'Shirur', 'Daund', 'Indapur'],
        mandals: ['Pune City', 'Haveli', 'Maval', 'Mulshi', 'Khed', 'Shirur', 'Baramati', 'Junnar', 'Ambegaon', 'Bhor', 'Purandar', 'Indapur', 'Daund', 'Velhe']
      },
      'mumbai suburban district': {
        state: 'Maharashtra', hq: 'Mumbai', center: { lat: 19.1136, lng: 72.8697 },
        towns: ['Andheri', 'Borivali', 'Kurla'],
        mandals: ['Andheri', 'Borivali', 'Kurla']
      },
      'bengaluru urban district': {
        state: 'Karnataka', hq: 'Bengaluru', center: { lat: 12.9716, lng: 77.5946 },
        towns: ['Yelahanka', 'Kengeri', 'Anekal', 'Electronic City', 'Whitefield'],
        mandals: ['Bengaluru North', 'Bengaluru South', 'Bengaluru East', 'Yelahanka', 'Anekal']
      },
      'chennai district': {
        state: 'Tamil Nadu', hq: 'Chennai', center: { lat: 13.0827, lng: 80.2707 },
        towns: ['Ambattur', 'Sholinganallur', 'Tiruvottiyur', 'Alandur', 'Madhavaram'],
        mandals: ['Egmore', 'Mylapore', 'Guindy', 'Adyar', 'Velachery', 'Ambattur', 'Madhavaram', 'Perambur', 'Tondiarpet', 'Sholinganallur', 'Alandur', 'Aminjikarai']
      }
    }
  },
  US: {
    states: [
      { name: 'Texas', aliases: ['tx'], capitalDistrict: 'Travis County', districts: ['Harris County', 'Dallas County', 'Travis County', 'Bexar County', 'Tarrant County', 'Collin County'] },
      { name: 'California', aliases: ['ca'], capitalDistrict: 'Sacramento County', districts: ['Los Angeles County', 'San Diego County', 'Orange County', 'Santa Clara County', 'San Francisco County'] },
      { name: 'New York', aliases: ['ny'], capitalDistrict: 'New York County', districts: ['New York County', 'Kings County', 'Queens County', 'Nassau County', 'Suffolk County'] },
      { name: 'Illinois', aliases: ['il'], capitalDistrict: 'Cook County', districts: ['Cook County', 'DuPage County', 'Lake County'] },
      { name: 'Florida', aliases: ['fl'], capitalDistrict: 'Miami-Dade County', districts: ['Miami-Dade County', 'Broward County', 'Orange County', 'Hillsborough County'] }
    ],
    districts: {
      'harris county': { state: 'Texas', hq: 'Houston', center: { lat: 29.7604, lng: -95.3698 }, towns: ['Pasadena', 'Baytown', 'Katy', 'Spring', 'Humble', 'Cypress', 'Bellaire'], mandals: ['North Houston', 'West Houston', 'Clear Lake', 'Tomball', 'La Porte'] },
      'dallas county': { state: 'Texas', hq: 'Dallas', center: { lat: 32.7767, lng: -96.7970 }, towns: ['Irving', 'Garland', 'Grand Prairie', 'Mesquite', 'Richardson', 'Carrollton'], mandals: ['North Dallas', 'Oak Cliff', 'Farmers Branch', 'DeSoto', 'Duncanville'] },
      'los angeles county': { state: 'California', hq: 'Los Angeles', center: { lat: 34.0522, lng: -118.2437 }, towns: ['Long Beach', 'Glendale', 'Santa Clarita', 'Pasadena', 'Torrance', 'Burbank', 'Santa Monica'], mandals: ['San Fernando Valley', 'San Gabriel Valley', 'South Bay', 'Westside'] }
    }
  },
  GB: {
    states: [
      { name: 'England', aliases: ['uk'], capitalDistrict: 'Greater London', districts: ['Greater London', 'Greater Manchester', 'Kent', 'West Midlands', 'West Yorkshire', 'Surrey'] },
      { name: 'Scotland', aliases: [], capitalDistrict: 'City of Edinburgh', districts: ['City of Edinburgh', 'Glasgow City', 'Aberdeenshire'] }
    ],
    districts: {
      'greater manchester': { state: 'England', hq: 'Manchester', center: { lat: 53.4808, lng: -2.2426 }, towns: ['Salford', 'Bolton', 'Stockport', 'Oldham', 'Rochdale', 'Bury', 'Wigan', 'Altrincham'], mandals: ['Trafford', 'Tameside', 'Manchester Central', 'Didsbury', 'Chorlton'] },
      'kent': { state: 'England', hq: 'Maidstone', center: { lat: 51.2787, lng: 0.5217 }, towns: ['Canterbury', 'Maidstone', 'Ashford', 'Dartford', 'Tunbridge Wells', 'Dover', 'Margate'], mandals: ['Sevenoaks', 'Tonbridge', 'Folkestone', 'Gravesham', 'Medway'] },
      'greater london': { state: 'England', hq: 'London', center: { lat: 51.5074, lng: -0.1278 }, towns: ['Croydon', 'Barnet', 'Ealing', 'Bromley', 'Enfield', 'Kingston upon Thames'], mandals: ['Westminster', 'Camden', 'Islington', 'Hackney', 'Southwark', 'Wandsworth'] }
    }
  },
  AU: {
    states: [
      { name: 'New South Wales', aliases: ['nsw'], capitalDistrict: 'Greater Sydney', districts: ['Greater Sydney', 'City of Parramatta', 'Hunter Region'] },
      { name: 'Victoria', aliases: ['vic'], capitalDistrict: 'Greater Melbourne', districts: ['Greater Melbourne', 'Greater Geelong'] },
      { name: 'Queensland', aliases: ['qld'], capitalDistrict: 'City of Brisbane', districts: ['City of Brisbane', 'City of Gold Coast'] }
    ],
    districts: {
      'city of parramatta': { state: 'New South Wales', hq: 'Parramatta', center: { lat: -33.8151, lng: 151.0011 }, towns: ['Epping', 'Westmead', 'Carlingford', 'Granville', 'Rydalmere'], mandals: ['Harris Park', 'Northmead', 'Wentworthville'] },
      'greater sydney': { state: 'New South Wales', hq: 'Sydney', center: { lat: -33.8688, lng: 151.2093 }, towns: ['Parramatta', 'Chatswood', 'Liverpool', 'Penrith', 'Hurstville', 'Bondi'], mandals: ['CBD', 'Surry Hills', 'North Sydney', 'Manly'] }
    }
  },
  AE: {
    states: [
      { name: 'Abu Dhabi', aliases: [], capitalDistrict: 'Abu Dhabi Region', districts: ['Abu Dhabi Region', 'Al Ain Region', 'Al Dhafra Region'] },
      { name: 'Dubai', aliases: [], capitalDistrict: 'Dubai Emirate', districts: ['Dubai Emirate'] },
      { name: 'Sharjah', aliases: [], capitalDistrict: 'Sharjah Emirate', districts: ['Sharjah Emirate'] }
    ],
    districts: {
      'abu dhabi region': { state: 'Abu Dhabi', hq: 'Abu Dhabi', center: { lat: 24.4539, lng: 54.3773 }, towns: ['Mussafah', 'Khalifa City', 'Al Shahama', 'Bani Yas'], mandals: ['Al Reem Island', 'Al Maryah Island', 'Yas Island'] },
      'dubai emirate': { state: 'Dubai', hq: 'Dubai', center: { lat: 25.2048, lng: 55.2708 }, towns: ['Deira', 'Business Bay', 'Al Quoz', 'Jebel Ali', 'Marina'], mandals: ['Al Barsha', 'Bur Dubai', 'Jumeirah', 'Karama'] }
    }
  }
};

function getCountryAdminLabels(cc = 'IN') {
  return COUNTRY_ADMIN_LABELS[String(cc || 'IN').toUpperCase()] || COUNTRY_ADMIN_LABELS.IN;
}

module.exports = {
  COUNTRY_ADMIN_LABELS,
  MASTER_ADMIN_PACK,
  getCountryAdminLabels
};
