/**
 * clusters/india.js
 * Authoritative commercial clusters and micro-markets for major Indian cities & metros.
 */

// ── AUTHORITATIVE COMMERCIAL CLUSTERS FOR MAJOR INDIAN CITIES & METROS ──
const AUTHORITATIVE_CLUSTERS = {
  'mumbai': [
    'Colaba & Cuffe Parade', 'Fort & Marine Drive', 'Lower Parel & Worli',
    'Dadar & Prabhadevi', 'Byculla & Mazgaon', 'Bandra West & BKC',
    'Khar & Santacruz West', 'Juhu & Vile Parle', 'Andheri West & Lokhandwala',
    'Andheri East & MIDC', 'Jogeshwari & Oshiwara', 'Goregaon West & East',
    'Malad West & Mindspace', 'Kandivali West & East', 'Borivali West & IC Colony',
    'Dahisar', 'Kurla & BKC Annex', 'Ghatkopar & Vidyavihar',
    'Chembur & Govandi', 'Sion & Chunabhatti', 'Vikhroli & Kanjurmarg',
    'Powai & Hiranandani', 'Bhandup & Mulund', 'Thane West & Naupada'
  ],
  'bombay': [
    'Colaba & Cuffe Parade', 'Fort & Marine Drive', 'Lower Parel & Worli',
    'Dadar & Prabhadevi', 'Byculla & Mazgaon', 'Bandra West & BKC',
    'Khar & Santacruz West', 'Juhu & Vile Parle', 'Andheri West & Lokhandwala',
    'Andheri East & MIDC', 'Jogeshwari & Oshiwara', 'Goregaon West & East',
    'Malad West & Mindspace', 'Kandivali West & East', 'Borivali West & IC Colony',
    'Dahisar', 'Kurla & BKC Annex', 'Ghatkopar & Vidyavihar',
    'Chembur & Govandi', 'Sion & Chunabhatti', 'Vikhroli & Kanjurmarg',
    'Powai & Hiranandani', 'Bhandup & Mulund', 'Thane West & Naupada'
  ],
  'delhi': [
    'Connaught Place', 'Hauz Khas', 'South Extension', 'Karol Bagh', 'Saket', 
    'Lajpat Nagar', 'Vasant Kunj', 'Dwarka', 'Rohini', 'Pitampura', 
    'Chandni Chowk', 'Janakpuri', 'Laxmi Nagar', 'Noida Sector 18', 'Gurugram Cyber City'
  ],
  'new delhi': [
    'Connaught Place', 'Hauz Khas', 'South Extension', 'Karol Bagh', 'Saket', 
    'Lajpat Nagar', 'Vasant Kunj', 'Dwarka', 'Rohini', 'Pitampura', 
    'Chandni Chowk', 'Janakpuri', 'Laxmi Nagar', 'Noida Sector 18', 'Gurugram Cyber City'
  ],
  'bangalore': [
    'Indiranagar', 'Koramangala', 'Whitefield', 'HSR Layout', 'Jayanagar', 
    'Electronic City', 'Malleshwaram', 'Hebbal', 'Marathahalli', 'BTM Layout', 
    'JP Nagar', 'Rajajinagar', 'Yelahanka', 'Banashankari', 'Bellandur',
    'Sarjapur Road', 'Manyata Tech Park', 'MG Road Bangalore', 'Brigade Road', 'Commercial Street Bangalore',
    'Basavanagudi', 'Richmond Town', 'Domlur', 'Ulsoor', 'Frazer Town',
    'RT Nagar', 'Kalyan Nagar', 'Kammanahalli', 'Bannerghatta Road', 'Kengeri',
    'Mahadevapura', 'KR Puram', 'Varthur', 'Kundalahalli', 'Brookefield',
    'Nagawara', 'Hennur', 'Thanisandra', 'Peenya Industrial Area', 'Yeshwanthpur'
  ],
  'bengaluru': [
    'Indiranagar', 'Koramangala', 'Whitefield', 'HSR Layout', 'Jayanagar', 
    'Electronic City', 'Malleshwaram', 'Hebbal', 'Marathahalli', 'BTM Layout', 
    'JP Nagar', 'Rajajinagar', 'Yelahanka', 'Banashankari', 'Bellandur',
    'Sarjapur Road', 'Manyata Tech Park', 'MG Road Bangalore', 'Brigade Road', 'Commercial Street Bangalore',
    'Basavanagudi', 'Richmond Town', 'Domlur', 'Ulsoor', 'Frazer Town',
    'RT Nagar', 'Kalyan Nagar', 'Kammanahalli', 'Bannerghatta Road', 'Kengeri',
    'Mahadevapura', 'KR Puram', 'Varthur', 'Kundalahalli', 'Brookefield',
    'Nagawara', 'Hennur', 'Thanisandra', 'Peenya Industrial Area', 'Yeshwanthpur'
  ],
  'hyderabad': [
    // West IT Corridor & High Growth
    'HITEC City', 'Madhapur', 'Gachibowli', 'Kondapur', 'Financial District', 
    'Nanakramguda', 'Kokapet', 'Gandipet', 'Manikonda', 'Puppalaguda', 
    'Shaikpet', 'Rai Durg', 'Hafeezpet', 'Tellapur', 'Kollur',
    
    // North-West Commercial & High-Density Residential
    'Kukatpally', 'KPHB Colony', 'Nizampet', 'Bachupally', 'Pragathi Nagar', 
    'Miyapur', 'Chandanagar', 'Serilingampally', 'Lingampally', 'BHEL', 
    'Patancheru', 'Beeramguda', 'Ameenpur',
    
    // Central Commercial, Dining & Healthcare
    'Banjara Hills', 'Jubilee Hills', 'Somajiguda', 'Punjagutta', 'Begumpet', 
    'Prakash Nagar', 'Ameerpet', 'SR Nagar', 'Sanath Nagar', 'Erragadda', 
    'Balkampet', 'Khairatabad', 'Lakdikapul', 'Nampally', 'Abids', 
    'Koti', 'Sultan Bazar', 'Basheerbagh', 'Himayatnagar', 'Chikkadpally', 
    'Narayanguda', 'Domalguda', 'RTC X Roads', 'Ashok Nagar', 'Gandhi Nagar',
    
    // Secunderabad & Cantonment Belt
    'Secunderabad', 'Paradise Secunderabad', 'MG Road Secunderabad', 'Marredpally', 
    'East Marredpally', 'West Marredpally', 'Trimulgherry', 'Bowenpally', 
    'Old Bowenpally', 'Karkhana', 'Gunrock', 'Alwal', 'Old Alwal', 
    'Lothkunta', 'Bolarum', 'Yapral', 'Kowkoor', 'Hakimpet',
    
    // East Tech & Industrial Corridor
    'Uppal', 'Ramanthapur', 'Habsiguda', 'Tarnaka', 'Nacharam', 
    'Mallapur', 'ECIL', 'Kushaiguda', 'AS Rao Nagar', 'Sainikpuri', 
    'Kapra', 'Moula Ali', 'Cherlapally', 'Peerzadiguda', 'Boduppal', 
    'Medipally', 'Chengicherla', 'Ghatkesar',
    
    // South Heritage & Old City Commercial
    'Charminar', 'Laad Bazaar', 'Chowmahalla', 'Madina', 'High Court', 
    'City College', 'Nayapul', 'Pathergatti', 'Moghalpura', 'Falaknuma', 
    'Chandrayangutta', 'Santoshnagar', 'Malakpet', 'Old Malakpet', 
    'New Malakpet', 'Saidabad', 'Chanchalguda', 'Bahadurpura', 'Purana Pul', 
    'Tadbun', 'Jahanuma',
    
    // South-East Residential & Transit Corridor
    'Dilsukhnagar', 'Moosarambagh', 'Kothapet', 'Chaitanyapuri', 'LB Nagar', 
    'Sagar Ring Road', 'Mansoorabad', 'Saroornagar', 'Karmanghat', 'Champapet', 
    'Vanasthalipuram', 'Hastinapuram', 'Hayathnagar', 'Auto Nagar Hyderabad', 'BN Reddy Nagar',
    
    // South-West Transit & Airport Corridor
    'Mehdipatnam', 'Gudimalkapur', 'Tolichowki', 'Paramount Hills', 'Attapur', 
    'Hyderguda Attapur', 'Upperpally', 'Rajendranagar', 'Bandlaguda Jagir', 
    'Sun City', 'Langer Houz', 'Shamshabad', 'Airport Road Hyderabad', 
    'Aramghar', 'Mailardevpally', 'Kattedan'
  ],
  'secunderabad': [
    'Paradise Secunderabad', 'MG Road Secunderabad', 'Sainikpuri', 'Trimulgherry',
    'Alwal', 'Marredpally', 'Tarnaka', 'Begumpet'
  ],
  'pune': [
    'Shivaji Nagar & Deccan Gymkhana',
    'Kothrud & Karve Road',
    'Koregaon Park & Bund Garden',
    'Kalyani Nagar & Nagar Road',
    'Viman Nagar & Airport Road',
    'Baner & Balewadi High Street',
    'Aundh & University Road',
    'Hinjawadi IT Park Phase 1 & 2',
    'Wakad & Dange Chowk',
    'Pimple Saudagar & Rahatani',
    'Pimpri & Chinchwad Station',
    'Bhosari & MIDC Industrial Area',
    'Nigdi & Akurdi Pradhikaran',
    'Hadapsar & Magarpatta City',
    'Fatima Nagar & Wanowrie',
    'Camp & MG Road (Pune Cantonment)',
    'Swargate & Tilak Road',
    'Bibwewadi & Market Yard',
    'Katraj & Kondhwa',
    'Sinhagad Road & Dhayari',
    'Warje & Karve Nagar',
    'Yerawada & Vishrantwadi',
    'Dhanori & Lohegaon',
    'Wagholi & Kharadi IT Hub'
  ],
  'punecity': [
    'Shivaji Nagar & Deccan Gymkhana',
    'Kothrud & Karve Road',
    'Koregaon Park & Bund Garden',
    'Kalyani Nagar & Nagar Road',
    'Viman Nagar & Airport Road',
    'Baner & Balewadi High Street',
    'Aundh & University Road',
    'Hinjawadi IT Park Phase 1 & 2',
    'Wakad & Dange Chowk',
    'Pimple Saudagar & Rahatani',
    'Pimpri & Chinchwad Station',
    'Bhosari & MIDC Industrial Area',
    'Nigdi & Akurdi Pradhikaran',
    'Hadapsar & Magarpatta City',
    'Fatima Nagar & Wanowrie',
    'Camp & MG Road (Pune Cantonment)',
    'Swargate & Tilak Road',
    'Bibwewadi & Market Yard',
    'Katraj & Kondhwa',
    'Sinhagad Road & Dhayari',
    'Warje & Karve Nagar',
    'Yerawada & Vishrantwadi',
    'Dhanori & Lohegaon',
    'Wagholi & Kharadi IT Hub'
  ],
  'guntur': [
    'Brodipet', 'Arundelpet', 'Lalapet & Market Center', 'Kothapet', 'Pattabhipuram', 
    'Brindavan Gardens', 'Lakshmipuram', 'Old Guntur', 'SVN Colony', 'Guvvalagutta', 
    'Collector Office Road Guntur', 'Amaravathi Road', 'Gorantla & Inner Ring Road',
    'Gujjanagundla', 'Syamala Nagar', 'Vidyanagar', 'Chandramouli Nagar',
    'Autonagar Guntur', 'Nallapadu', 'Nallacheruvu', 'Stambhalagaruvu',
    'Pedakakani Road Guntur', 'Etukuru Road Guntur', 'Chowdavaram & RVR Guntur'
  ],
  'tenali': [
    'Tenali Central', 'Morrispet', 'Chenchupet', 'Bose Road Tenali', 'Ganganammapet Tenali',
    'Kothapet Tenali', 'Ithanagar Tenali', 'Ganga Mandiram', 'Chinaravuru', 
    'Nazarpet', 'Guntur Road Tenali', 'Gandhinagar Tenali'
  ],
  'mangalagiri': [
    'Mangalagiri Town', 'Temple Road Mangalagiri', 'Nowlur', 'Atmakur Mangalagiri', 
    'Old Bus Stand Mangalagiri', 'Tadepalle'
  ],
  'vijayawada': [
    'Governorpet', 'NTR Complex Governorpet', 'Besant Road', 'Eluru Road', 'Bandar Road',
    'Suryaraopeta', 'Benz Circle', 'Labbipet', 'Moghalrajpuram', 'Patamata', 'Auto Nagar',
    'One Town Vijayawada', 'Tarapet', 'Gandhinagar Vijayawada', 'Satyanarayanapuram',
    'Machavaram', 'Bhavanipuram', 'Vidyadharapuram', 'Ajith Singh Nagar', 'Krishna Lanka',
    'Gunadala', 'Currency Nagar', 'Guru Nanak Colony', 'Ramavarappadu', 'Enikepadu',
    'Prasadampadu', 'Gollapudi', 'Kanuru', 'Poranki', 'Penamaluru'
  ],
  'visakhapatnam': [
    'Dwaraka Nagar', 'Siripuram', 'MVP Colony', 'Jagadamba Centre', 'Gajuwaka', 
    'Madhurawada', 'Rushikonda', 'Seethammadhara', 'Asilmetta', 'Dabagardens', 
    'RTC Complex Vizag', 'Poorna Market', 'Kurmannapalem', 'Pendurthi', 'Gopalapatnam', 
    'NAD Junction', 'Muralinagar', 'Kancharapalem', 'Simhachalam', 'Lawsons Bay Colony', 
    'Beach Road Vizag', 'Akkayyapalem', 'Resapuvanipalem', 'Yendada', 'Auto Nagar Vizag'
  ],
  'vizag': [
    'Dwaraka Nagar', 'Siripuram', 'MVP Colony', 'Jagadamba Centre', 'Gajuwaka', 
    'Madhurawada', 'Rushikonda', 'Seethammadhara', 'Asilmetta', 'Dabagardens', 
    'RTC Complex Vizag', 'Poorna Market', 'Kurmannapalem', 'Pendurthi', 'Gopalapatnam', 
    'NAD Junction', 'Muralinagar', 'Kancharapalem', 'Simhachalam', 'Lawsons Bay Colony', 
    'Beach Road Vizag', 'Akkayyapalem', 'Resapuvanipalem', 'Yendada', 'Auto Nagar Vizag'
  ],
  'chennai': [
    'T Nagar', 'Anna Nagar', 'Nungambakkam', 'Adyar', 'Velachery', 
    'Besant Nagar', 'Alwarpet', 'Mylapore', 'OMR Chennai', 'Kilpauk', 'Guindy', 'Porur',
    'Tambaram', 'Chromepet', 'Vadapalani', 'Kodambakkam', 'Teynampet', 'Royapettah',
    'Sowcarpet', 'George Town Chennai', 'Perambur', 'Mogappair', 'Sholinganallur', 
    'Thoraipakkam', 'Medavakkam', 'Pallavaram', 'Egmore', 'Purasawalkam', 
    'Ambattur Industrial Estate', 'Saidapet', 'Kotturpuram', 'Thiruvanmiyur', 'Madipakkam'
  ],
  'madras': [
    'T Nagar', 'Anna Nagar', 'Nungambakkam', 'Adyar', 'Velachery', 
    'Besant Nagar', 'Alwarpet', 'Mylapore', 'OMR Chennai', 'Kilpauk', 'Guindy', 'Porur',
    'Tambaram', 'Chromepet', 'Vadapalani', 'Kodambakkam', 'Teynampet', 'Royapettah',
    'Sowcarpet', 'George Town Chennai', 'Perambur', 'Mogappair', 'Sholinganallur', 
    'Thoraipakkam', 'Medavakkam', 'Pallavaram', 'Egmore', 'Purasawalkam', 
    'Ambattur Industrial Estate', 'Saidapet', 'Kotturpuram', 'Thiruvanmiyur', 'Madipakkam'
  ],
  'tirupati': [
    'Alipiri', 'Renigunta Road', 'MR Palli', 'Korlagunta', 'Bairagipatteda', 
    'RC Road Tirupati', 'Leela Mahal Centre', 'Bhavani Nagar Tirupati', 'Balaji Colony', 
    'AIR Bypass Road', 'Chandragiri Road', 'Karakambadi Road', 'Padmavathi Puram', 
    'Settipalli', 'Tiruchanoor Road', 'RTC Bus Stand Tirupati', 'Kapilatheertham', 
    'Old Tirupati', 'Nehru Nagar Tirupati', 'Gandhi Road Tirupati', 'TTD Administrative Area', 'Annamayya Circle'
  ],
  'nellore': [
    'VRC Centre Nellore', 'Trunk Road Nellore', 'Magunta Layout', 'Pogathota', 
    'Stonehousepet', 'Haranathapuram', 'Dargamitta', 'Muthukur Road', 'Ramamurthy Nagar Nellore', 
    'Vedayapalem', 'Podalakur Road', 'Childrens Park Area Nellore', 'Current Office Centre', 
    'Santhapet Nellore', 'Fathekhanpet', 'Nawabpet Nellore', 'BV Nagar', 'Balaji Nagar Nellore', 
    'Atmakur Bus Stand Nellore', 'Auto Nagar Nellore'
  ],
  'warangal': [
    'Naimnagar', 'Subedari', 'Kazipet', 'Chowrasta Warangal', 'Balasamudram', 
    'Waddepally', 'Hunter Road', 'Kishanpura', 'Mandi Bazar Warangal', 'Hanamkonda Chowrasta', 
    'Kakatiya University Road', 'Mulugu Road', 'Lashkar Bazar', 'Enumamula Market Yard', 
    'Pochamma Maidan', 'Girmajipet', 'Station Road Warangal', 'Fatima Nagar Kazipet', 
    'Bhimaram', 'KU Cross Road', 'Ramnagar Hanamkonda', 'Ursu Gutta'
  ],
  'hanumakonda': [
    'Naimnagar', 'Subedari', 'Kazipet', 'Chowrasta Warangal', 'Balasamudram', 
    'Waddepally', 'Hunter Road', 'Kishanpura', 'Mandi Bazar Warangal', 'Hanamkonda Chowrasta', 
    'Kakatiya University Road', 'Mulugu Road', 'Lashkar Bazar', 'Enumamula Market Yard', 
    'Pochamma Maidan', 'Girmajipet', 'Station Road Warangal', 'Fatima Nagar Kazipet', 
    'Bhimaram', 'KU Cross Road', 'Ramnagar Hanamkonda', 'Ursu Gutta'
  ],
  'hanamkonda': [
    'Naimnagar', 'Subedari', 'Kazipet', 'Chowrasta Warangal', 'Balasamudram', 
    'Waddepally', 'Hunter Road', 'Kishanpura', 'Mandi Bazar Warangal', 'Hanamkonda Chowrasta', 
    'Kakatiya University Road', 'Mulugu Road', 'Lashkar Bazar', 'Enumamula Market Yard', 
    'Pochamma Maidan', 'Girmajipet', 'Station Road Warangal', 'Fatima Nagar Kazipet', 
    'Bhimaram', 'KU Cross Road', 'Ramnagar Hanamkonda', 'Ursu Gutta'
  ],
  'rajahmundry': [
    'Main Road Rajahmundry', 'Danavaipeta', 'Kotipalli Bus Stand', 'Morampudi', 
    'Innespeta', 'Prakash Nagar Rajahmundry', 'Kambala Cheruvu', 'Shyamala Nagar Rajahmundry', 
    'Diwancheruvu', 'Lalacheruvu', 'Aryapuram', 'Tilak Road Rajahmundry', 'JN Road Rajahmundry', 
    'Venkateswara Rao Peta', 'Katheru', 'Dowleswaram', 'Syndicate Bank Colony', 
    'Devi Chowk', 'Alcot Gardens', 'Pushkar Ghat Area'
  ],
  'rajamahendravaram': [
    'Main Road Rajahmundry', 'Danavaipeta', 'Kotipalli Bus Stand', 'Morampudi', 
    'Innespeta', 'Prakash Nagar Rajahmundry', 'Kambala Cheruvu', 'Shyamala Nagar Rajahmundry', 
    'Diwancheruvu', 'Lalacheruvu', 'Aryapuram', 'Tilak Road Rajahmundry', 'JN Road Rajahmundry', 
    'Venkateswara Rao Peta', 'Katheru', 'Dowleswaram', 'Syndicate Bank Colony', 
    'Devi Chowk', 'Alcot Gardens', 'Pushkar Ghat Area'
  ],
  'kakinada': [
    'Main Road Kakinada', 'Bhanugudi Junction', 'Cinema Road Kakinada', 'Jagannaickpur', 
    'Surya Rao Peta', 'Ramanayyapeta', 'Pratap Nagar Kakinada', 'Sarpavaram', 
    'Sambamurthy Nagar', 'Port Road Kakinada', 'Madhavapatnam', 'NFCL Road', 
    'Turangi', 'Gandhinagar Kakinada', 'Srinagar Kakinada', 'Temple Street Kakinada', 
    'Vakalapudi', 'Indrapalem', 'Boat Club Road Kakinada', 'Collector Office Road Kakinada'
  ],
  'kurnool': [
    'Park Road Kurnool', 'Raj Vihar Centre', 'Budhawarpet', 'C-Camp Kurnool', 
    'B-Camp Kurnool', 'Birla Compound', 'Old City Kurnool', 'Nandyal Check Post', 
    'Joharapuram', 'Bellary Road Kurnool', 'Maddur Nagar', 'Roza Dargah Area', 
    'Kallur Kurnool', 'Deva Nagar', 'STBC College Road', 'Venkatramana Colony'
  ],
  'kadapa': [
    'Madras Road Kadapa', 'RTC Bus Stand Kadapa', 'Nagarajupalli', 'Yerramukkapalli', 
    'Co-operative Colony Kadapa', 'RIMS Road Kadapa', 'Ravindra Nagar', 'Seven Roads Circle', 
    'Akkayapalli', 'Bhavani Nagar Kadapa', 'Chinna Chowk', 'Pedda Chowk', 
    'NGO Colony Kadapa', 'Ameen Peer Dargah Area', 'Palempalli', 'Maruthi Nagar Kadapa'
  ],
  'anantapur': [
    'Subhash Road Anantapur', 'Clock Tower Anantapur', 'Kamala Nagar Anantapur', 
    'Rudrampeta', 'Ram Nagar Anantapur', 'Housing Board Colony Anantapur', 
    'Court Road Anantapur', 'Sai Nagar Anantapur', 'Saptagiri Circle', 
    'Tapovanam', 'Gooty Road Anantapur', 'Old Town Anantapur', 'Sharada Nagar', 
    'Maruthi Nagar Anantapur', 'Somnath Nagar'
  ],
  'eluru': [
    'RR Pet Eluru', 'Powerpet', 'Fire Station Centre Eluru', 'Sanivarapupeta', 
    'Tangellamudi', 'Ashok Nagar Eluru', 'Old Bus Stand Eluru', 'Ameenapet', 
    'Gavaravaram', 'One Town Eluru', 'Kothapet Eluru', 'Satrampadu', 
    'Vangayagudem', 'Ponangi Road'
  ],
  'kolkata': [
    'Park Street', 'Salt Lake', 'New Town', 'Ballygunge', 'Alipore', 
    'Gariahat', 'Howrah Central', 'Behala', 'Dum Dum', 'Rajarhat'
  ],
  'jaipur': [
    'C Scheme', 'Malviya Nagar', 'Vaishali Nagar', 'Mansarovar', 
    'Raja Park', 'Tonk Road', 'MI Road', 'Jagatpura', 'Ajmer Road'
  ],
  'ahmedabad': [
    'SG Highway', 'Bodakdev', 'Satellite', 'Vastrapur', 'Prahlad Nagar', 
    'Navrangpura', 'Maninagar', 'Thaltej', 'Sindhu Bhavan', 'Ashram Road'
  ],
  'surat': [
    'Adajan', 'Athwa', 'Vesu', 'Ghod Dod Road', 'Varachha', 'Ring Road Surat', 'Katargam', 'Piplod'
  ],
  'lucknow': [
    'Gomti Nagar', 'Hazratganj', 'Alambagh', 'Indira Nagar', 'Mahanagar', 'Aminabad', 'Aliganj', 'Ashiyana'
  ],
  'kanpur': [
    'Civil Lines Kanpur', 'Swaroop Nagar', 'Mall Road Kanpur', 'Kakadeo', 'Kidwai Nagar', 'Govind Nagar', 'Gumti No 5', 'Harsh Nagar'
  ],
  'nagpur': [
    'Dharampeth', 'Ramdaspeth', 'Sitabuldi', 'Sadar', 'Wardha Road', 'Civil Lines Nagpur', 'Pratap Nagar', 'Manish Nagar'
  ],
  'indore': [
    'Vijay Nagar', 'Palasia', 'MG Road Indore', 'Rajwada', 'Chappan Dukan', 'Sapna Sangeeta', 'Bhawarkua', 'Annapurna'
  ],
  'bhopal': [
    'MP Nagar', 'Arera Colony', 'New Market Bhopal', 'Kolar Road', 'TT Nagar', 'Hoshangabad Road', 'Bairagarh', 'Govindpura'
  ],
  'coimbatore': [
    'RS Puram', 'Gandhipuram', 'Saibaba Colony', 'Peelamedu', 'Race Course', 'Ramanathapuram', 'Saravanampatti', 'Singanallur'
  ],
  'madurai': [
    'KK Nagar Madurai', 'Simmakkal', 'Anna Nagar Madurai', 'Town Hall Road', 'West Tower Street', 'Mattuthavani', 'Sellur', 'Bye Pass Road'
  ],
  'kochi': [
    'MG Road Kochi', 'Marine Drive Kochi', 'Edappally', 'Kaloor', 'Kakkanad', 'Fort Kochi', 'Panampilly Nagar', 'Palarivattom'
  ],
  'chandigarh': [
    'Sector 17', 'Sector 35', 'Sector 22', 'Sector 8', 'Sector 9', 'Sector 26', 'Industrial Area Phase 1', 'Mohali Phase 7'
  ],
  'nashik': [
    'College Road Nashik', 'Gangapur Road', 'Panchavati', 'Dwarka Nashik', 'Indira Nagar Nashik', 'Mahatma Nagar', 'Satpur', 'Nashik Road'
  ],
  'rajkot': [
    'Yagnik Road', 'Kalawad Road', 'Ring Road Rajkot', 'University Road', 'Dhebar Road', 'Amin Marg', 'Kotecha Chowk', 'Mavdi'
  ],
  'varanasi': [
    'Sigra', 'Cantt Varanasi', 'Bhelupur', 'Godowlia', 'Lanka', 'Orderly Bazar', 'Mahmoorganj', 'Chowk Varanasi'
  ],
  'agra': [
    'Sanjay Place', 'Civil Lines Agra', 'Kamla Nagar', 'Tajganj', 'Dayal Bagh', 'MG Road Agra', 'Shahganj', 'Sadar Bazar Agra'
  ],
  'patna': [
    'Frazer Road', 'Boring Road', 'Kankarbagh', 'Bailey Road', 'Rajendra Nagar', 'Exhibition Road', 'Patliputra', 'Ashiana Nagar'
  ],
  'vadodara': [
    'Alkapuri', 'Sayajigunj', 'Fatehgunj', 'Gotri', 'Vasna Road', 'Manjalpur', 'Karelibaug', 'Old Padra Road'
  ],
  'ludhiana': [
    'Ferozepur Road', 'Model Town Ludhiana', 'Sarabha Nagar', 'Mall Road Ludhiana', 'Ghumar Mandi', 'Civil Lines Ludhiana', 'Pakhowal Road', 'Focal Point'
  ],
  'amritsar': [
    'Lawrence Road Amritsar', 'Mall Road Amritsar', 'Ranjit Avenue', 'Hall Bazar', 'Katra Jaimal Singh', 'Circular Road', 'Majitha Road', 'Cantonment'
  ],
  'dehradun': [
    'Rajpur Road', 'Paltan Bazar', 'Chakrata Road', 'Ballupur', 'Clement Town', 'Saharanpur Road', 'Dharampur', 'Karanpur'
  ],
  'guwahati': [
    'GS Road Guwahati', 'Christian Basti', 'Paltan Bazar Guwahati', 'Pan Bazar', 'Ganeshguri', 'Zoo Road', 'Dispur', 'Six Mile'
  ]
};

module.exports = {
  AUTHORITATIVE_CLUSTERS
};
