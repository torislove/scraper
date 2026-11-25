/**
 * coordinates.js
 * GPS anchors, mandal typologies, and coordinate resolution helpers.
 */

const { mandalIndex, villageIndex, districtIndex } = require('./villageIndexer');

// High precision GPS anchors for map centers and distance computation
const ZONE_COORDINATES = {
  // ── TIER-2 AP & TELANGANA CITIES & CLUSTERS ──
  // Tirupati
  'tirupati': { lat: 13.6288, lng: 79.4192 },
  'alipiri': { lat: 13.6504, lng: 79.3980 },
  'renigunta road': { lat: 13.6335, lng: 79.4450 },
  'mr palli': { lat: 13.6190, lng: 79.4100 },
  'korlagunta': { lat: 13.6350, lng: 79.4280 },
  'bairagipatteda': { lat: 13.6170, lng: 79.4230 },
  'rc road tirupati': { lat: 13.6300, lng: 79.4120 },
  'leela mahal centre': { lat: 13.6390, lng: 79.4210 },
  'bhavani nagar tirupati': { lat: 13.6360, lng: 79.4180 },
  'balaji colony': { lat: 13.6380, lng: 79.4150 },
  'air bypass road': { lat: 13.6250, lng: 79.4320 },
  'chandragiri road': { lat: 13.6150, lng: 79.3800 },
  'karakambadi road': { lat: 13.6480, lng: 79.4600 },
  'padmavathi puram': { lat: 13.6200, lng: 79.4400 },
  'settipalli': { lat: 13.6350, lng: 79.4700 },
  'tiruchanoor road': { lat: 13.6120, lng: 79.4500 },
  'rtc bus stand tirupati': { lat: 13.6265, lng: 79.4260 },
  'kapilatheertham': { lat: 13.6530, lng: 79.4180 },
  'old tirupati': { lat: 13.6320, lng: 79.4130 },
  'nehru nagar tirupati': { lat: 13.6290, lng: 79.4210 },
  'gandhi road tirupati': { lat: 13.6310, lng: 79.4180 },
  'ttd administrative area': { lat: 13.6370, lng: 79.4190 },
  'annamayya circle': { lat: 13.6220, lng: 79.4280 },

  // Nellore
  'nellore': { lat: 14.4426, lng: 79.9865 },
  'vrc centre nellore': { lat: 14.4460, lng: 79.9870 },
  'trunk road nellore': { lat: 14.4440, lng: 79.9850 },
  'magunta layout': { lat: 14.4370, lng: 79.9720 },
  'pogathota': { lat: 14.4490, lng: 79.9840 },
  'stonehousepet': { lat: 14.4550, lng: 79.9920 },
  'haranathapuram': { lat: 14.4340, lng: 79.9790 },
  'dargamitta': { lat: 14.4380, lng: 79.9820 },
  'muthukur road': { lat: 14.4250, lng: 80.0050 },
  'ramamurthy nagar nellore': { lat: 14.4310, lng: 79.9750 },
  'vedayapalem': { lat: 14.4180, lng: 79.9680 },
  'podalakur road': { lat: 14.4290, lng: 79.9650 },
  'childrens park area nellore': { lat: 14.4400, lng: 79.9890 },
  'current office centre': { lat: 14.4430, lng: 79.9830 },
  'santhapet nellore': { lat: 14.4510, lng: 79.9880 },
  'fathekhanpet': { lat: 14.4530, lng: 79.9820 },
  'nawabpet nellore': { lat: 14.4570, lng: 79.9860 },
  'bv nagar': { lat: 14.4240, lng: 79.9740 },
  'balaji nagar nellore': { lat: 14.4360, lng: 79.9690 },
  'atmakur bus stand nellore': { lat: 14.4480, lng: 79.9810 },
  'auto nagar nellore': { lat: 14.4150, lng: 79.9950 },

  // Warangal & Hanamkonda
  'warangal': { lat: 17.9689, lng: 79.5941 },
  'hanumakonda': { lat: 18.0135, lng: 79.5603 },
  'hanamkonda': { lat: 18.0135, lng: 79.5603 },
  'naimnagar': { lat: 18.0210, lng: 79.5530 },
  'subedari': { lat: 18.0080, lng: 79.5620 },
  'kazipet': { lat: 17.9810, lng: 79.5210 },
  'chowrasta warangal': { lat: 17.9750, lng: 79.6010 },
  'balasamudram': { lat: 18.0050, lng: 79.5680 },
  'waddepally': { lat: 18.0260, lng: 79.5480 },
  'hunter road': { lat: 17.9950, lng: 79.5820 },
  'kishanpura': { lat: 18.0160, lng: 79.5610 },
  'mandi bazar warangal': { lat: 17.9720, lng: 79.6040 },
  'hanamkonda chowrasta': { lat: 18.0140, lng: 79.5640 },
  'kakatiya university road': { lat: 18.0320, lng: 79.5420 },
  'mulugu road': { lat: 18.0190, lng: 79.5850 },
  'lashkar bazar': { lat: 18.0110, lng: 79.5690 },
  'enumamula market yard': { lat: 17.9920, lng: 79.6250 },
  'pochamma maidan': { lat: 17.9820, lng: 79.6080 },
  'girmajipet': { lat: 17.9710, lng: 79.5980 },
  'station road warangal': { lat: 17.9650, lng: 79.5960 },
  'fatima nagar kazipet': { lat: 17.9780, lng: 79.5320 },
  'bhimaram': { lat: 18.0410, lng: 79.5350 },
  'ku cross road': { lat: 18.0280, lng: 79.5470 },
  'ramnagar hanamkonda': { lat: 18.0090, lng: 79.5550 },
  'ursu gutta': { lat: 17.9540, lng: 79.5870 },

  // Rajahmundry
  'rajahmundry': { lat: 17.0005, lng: 81.8040 },
  'rajamahendravaram': { lat: 17.0005, lng: 81.8040 },
  'main road rajahmundry': { lat: 17.0010, lng: 81.7820 },
  'danavaipeta': { lat: 17.0080, lng: 81.7890 },
  'kotipalli bus stand': { lat: 16.9950, lng: 81.7780 },
  'morampudi': { lat: 17.0120, lng: 81.8150 },
  'innespeta': { lat: 16.9980, lng: 81.7760 },
  'prakash nagar rajahmundry': { lat: 17.0140, lng: 81.7920 },
  'kambala cheruvu': { lat: 17.0050, lng: 81.7860 },
  'shyamala nagar rajahmundry': { lat: 17.0180, lng: 81.7980 },
  'diwancheruvu': { lat: 17.0520, lng: 81.8480 },
  'lalacheruvu': { lat: 17.0280, lng: 81.8260 },
  'aryapuram': { lat: 17.0030, lng: 81.7790 },
  'tilak road rajahmundry': { lat: 17.0040, lng: 81.7840 },
  'jn road rajahmundry': { lat: 17.0090, lng: 81.7810 },
  'venkateswara rao peta': { lat: 17.0060, lng: 81.7910 },
  'katheru': { lat: 17.0340, lng: 81.7820 },
  'dowleswaram': { lat: 16.9420, lng: 81.7720 },
  'syndicate bank colony': { lat: 17.0150, lng: 81.8020 },
  'devi chowk': { lat: 17.0020, lng: 81.7810 },
  'alcot gardens': { lat: 17.0070, lng: 81.7750 },
  'pushkar ghat area': { lat: 16.9930, lng: 81.7710 },

  // Kakinada
  'kakinada': { lat: 16.9891, lng: 82.2475 },
  'main road kakinada': { lat: 16.9580, lng: 82.2380 },
  'bhanugudi junction': { lat: 16.9630, lng: 82.2350 },
  'cinema road kakinada': { lat: 16.9550, lng: 82.2390 },
  'jagannaickpur': { lat: 16.9420, lng: 82.2340 },
  'surya rao peta': { lat: 16.9610, lng: 82.2320 },
  'ramanayyapeta': { lat: 16.9740, lng: 82.2310 },
  'pratap nagar kakinada': { lat: 16.9680, lng: 82.2410 },
  'sarpavaram': { lat: 17.0010, lng: 82.2460 },
  'sambamurthy nagar': { lat: 16.9780, lng: 82.2430 },
  'port road kakinada': { lat: 16.9850, lng: 82.2680 },
  'madhavapatnam': { lat: 17.0120, lng: 82.2280 },
  'nfcl road': { lat: 16.9920, lng: 82.2540 },
  'turangi': { lat: 16.9280, lng: 82.2390 },
  'gandhinagar kakinada': { lat: 16.9650, lng: 82.2380 },
  'srinagar kakinada': { lat: 16.9710, lng: 82.2360 },
  'temple street kakinada': { lat: 16.9520, lng: 82.2370 },
  'vakalapudi': { lat: 17.0250, lng: 82.2610 },
  'indrapalem': { lat: 16.9450, lng: 82.2180 },
  'boat club road kakinada': { lat: 16.9720, lng: 82.2450 },
  'collector office road kakinada': { lat: 16.9670, lng: 82.2390 },

  // Kurnool, Kadapa, Anantapur, Eluru
  'kurnool': { lat: 15.8281, lng: 78.0373 },
  'park road kurnool': { lat: 15.8290, lng: 78.0380 },
  'raj vihar centre': { lat: 15.8310, lng: 78.0350 },
  'c-camp kurnool': { lat: 15.8210, lng: 78.0280 },
  'kadapa': { lat: 14.4673, lng: 78.8242 },
  'madras road kadapa': { lat: 14.4710, lng: 78.8310 },
  'rtc bus stand kadapa': { lat: 14.4690, lng: 78.8260 },
  'anantapur': { lat: 14.6819, lng: 77.6006 },
  'subhash road anantapur': { lat: 14.6830, lng: 77.6010 },
  'clock tower anantapur': { lat: 14.6820, lng: 77.5990 },
  'eluru': { lat: 16.7107, lng: 81.0952 },
  'rr pet eluru': { lat: 16.7130, lng: 81.0980 },
  'powerpet': { lat: 16.7080, lng: 81.0910 },

  // Bengaluru & Visakhapatnam Additions
  'sarjapur road': { lat: 12.9166, lng: 77.6766 },
  'manyata tech park': { lat: 13.0478, lng: 77.6200 },
  'mg road bangalore': { lat: 12.9756, lng: 77.6066 },
  'brigade road': { lat: 12.9730, lng: 77.6070 },
  'commercial street bangalore': { lat: 12.9822, lng: 77.6083 },
  'basavanagudi': { lat: 12.9422, lng: 77.5756 },
  'kengeri': { lat: 12.9081, lng: 77.4842 },
  'kr puram': { lat: 13.0075, lng: 77.6959 },
  'peenya industrial area': { lat: 13.0285, lng: 77.5197 },
  'yeshwanthpur': { lat: 13.0280, lng: 77.5408 },
  'asilmetta': { lat: 17.7240, lng: 83.3080 },
  'dabagardens': { lat: 17.7180, lng: 83.3010 },
  'rtc complex vizag': { lat: 17.7260, lng: 83.3100 },
  'poorna market': { lat: 17.7050, lng: 83.2950 },
  'kurmannapalem': { lat: 17.6890, lng: 83.1580 },
  'nad junction': { lat: 17.7520, lng: 83.2280 },

  // Mumbai Key Zones
  'mumbai': { lat: 18.9220, lng: 72.8347 },
  'colaba & cuffe parade': { lat: 18.9067, lng: 72.8147 },
  'fort & marine drive': { lat: 18.9322, lng: 72.8315 },
  'lower parel & worli': { lat: 18.9986, lng: 72.8300 },
  'dadar & prabhadevi': { lat: 19.0178, lng: 72.8478 },
  'byculla & mazgaon': { lat: 18.9750, lng: 72.8360 },
  'bandra west & bkc': { lat: 19.0596, lng: 72.8295 },
  'khar & santacruz west': { lat: 19.0700, lng: 72.8350 },
  'juhu & vile parle': { lat: 19.1075, lng: 72.8263 },
  'andheri west & lokhandwala': { lat: 19.1363, lng: 72.8277 },
  'andheri east & midc': { lat: 19.1136, lng: 72.8697 },
  'jogeshwari & oshiwara': { lat: 19.1410, lng: 72.8420 },
  'goregaon west & east': { lat: 19.1663, lng: 72.8526 },
  'malad west & mindspace': { lat: 19.1860, lng: 72.8485 },
  'kandivali west & east': { lat: 19.2060, lng: 72.8540 },
  'borivali west & ic colony': { lat: 19.2288, lng: 72.8541 },
  'dahisar': { lat: 19.2500, lng: 72.8590 },
  'kurla & bkc annex': { lat: 19.0726, lng: 72.8845 },
  'ghatkopar & vidyavihar': { lat: 19.0860, lng: 72.9080 },
  'chembur & govandi': { lat: 19.0522, lng: 72.8994 },
  'sion & chunabhatti': { lat: 19.0400, lng: 72.8640 },
  'vikhroli & kanjurmarg': { lat: 19.1100, lng: 72.9280 },
  'powai & hiranandani': { lat: 19.1176, lng: 72.9060 },
  'bhandup & mulund': { lat: 19.1726, lng: 72.9565 },
  'thane west & naupada': { lat: 19.2183, lng: 72.9781 },

  // Metros
  'delhi': { lat: 28.6139, lng: 77.2090 },
  'bangalore': { lat: 12.9716, lng: 77.5946 },
  'bengaluru': { lat: 12.9716, lng: 77.5946 },
  'hyderabad': { lat: 17.3850, lng: 78.4867 },
  'chennai': { lat: 13.0827, lng: 80.2707 },
  'kolkata': { lat: 22.5726, lng: 88.3639 },
  'pune': { lat: 18.5204, lng: 73.8567 },
  'punecity': { lat: 18.5204, lng: 73.8567 },
  'pune city': { lat: 18.5204, lng: 73.8567 },
  'poona': { lat: 18.5204, lng: 73.8567 },
  'shivaji nagar & deccan gymkhana': { lat: 18.5314, lng: 73.8446 },
  'kothrud & karve road': { lat: 18.5074, lng: 73.8077 },
  'koregaon park & bund garden': { lat: 18.5362, lng: 73.8940 },
  'kalyani nagar & nagar road': { lat: 18.5463, lng: 73.9034 },
  'viman nagar & airport road': { lat: 18.5679, lng: 73.9143 },
  'baner & balewadi high street': { lat: 18.5590, lng: 73.7868 },
  'aundh & university road': { lat: 18.5580, lng: 73.8075 },
  'hinjawadi it park phase 1 & 2': { lat: 18.5913, lng: 73.7389 },
  'wakad & dange chowk': { lat: 18.5987, lng: 73.7686 },
  'pimple saudagar & rahatani': { lat: 18.5987, lng: 73.7997 },
  'pimpri & chinchwad station': { lat: 18.6279, lng: 73.8009 },
  'bhosari & midc industrial area': { lat: 18.6298, lng: 73.8478 },
  'nigdi & akurdi pradhikaran': { lat: 18.6517, lng: 73.7711 },
  'hadapsar & magarpatta city': { lat: 18.5089, lng: 73.9259 },
  'fatima nagar & wanowrie': { lat: 18.4988, lng: 73.8967 },
  'camp & mg road (pune cantonment)': { lat: 18.5167, lng: 73.8786 },
  'swargate & tilak road': { lat: 18.5018, lng: 73.8636 },
  'bibwewadi & market yard': { lat: 18.4789, lng: 73.8678 },
  'katraj & kondhwa': { lat: 18.4575, lng: 73.8677 },
  'sinhagad road & dhayari': { lat: 18.4712, lng: 73.8189 },
  'warje & karve nagar': { lat: 18.4833, lng: 73.8000 },
  'yerawada & vishrantwadi': { lat: 18.5529, lng: 73.8794 },
  'dhanori & lohegaon': { lat: 18.5833, lng: 73.8988 },
  'wagholi & kharadi it hub': { lat: 18.5515, lng: 73.9488 },
  'ahmedabad': { lat: 23.0225, lng: 72.5714 },
  'jaipur': { lat: 26.9124, lng: 75.7873 },
  'surat': { lat: 21.1702, lng: 72.8311 },
  'lucknow': { lat: 26.8467, lng: 80.9462 },
  'kanpur': { lat: 26.4499, lng: 80.3319 },
  'nagpur': { lat: 21.1458, lng: 79.0882 },
  'indore': { lat: 22.7196, lng: 75.8577 },
  'bhopal': { lat: 23.2599, lng: 77.4126 },
  'coimbatore': { lat: 11.0168, lng: 76.9558 },
  'madurai': { lat: 9.9252, lng: 78.1198 },
  'kochi': { lat: 9.9312, lng: 76.2673 },
  'chandigarh': { lat: 30.7333, lng: 76.7794 },
  'nashik': { lat: 19.9975, lng: 73.7898 },
  'rajkot': { lat: 22.3039, lng: 70.8022 },
  'varanasi': { lat: 25.3176, lng: 82.9739 },
  'agra': { lat: 27.1767, lng: 78.0081 },
  'patna': { lat: 25.5941, lng: 85.1376 },
  'vadodara': { lat: 22.3072, lng: 73.1812 },
  'ludhiana': { lat: 30.9010, lng: 75.8573 },
  'amritsar': { lat: 31.6340, lng: 74.8723 },
  'dehradun': { lat: 30.3165, lng: 78.0322 },
  'guwahati': { lat: 26.1445, lng: 91.7362 },

  // Andhra Pradesh & Telangana
  'hyderabad': { lat: 17.3850, lng: 78.4867 },
  'banjara hills': { lat: 17.4156, lng: 78.4357 },
  'banjara hills hyderabad': { lat: 17.4156, lng: 78.4357 },
  'jubilee hills': { lat: 17.4319, lng: 78.4073 },
  'gachibowli': { lat: 17.4401, lng: 78.3489 },
  'madhapur': { lat: 17.4483, lng: 78.3915 },
  'hitec city': { lat: 17.4435, lng: 78.3772 },
  'kondapur': { lat: 17.4699, lng: 78.3578 },
  'kukatpally': { lat: 17.4938, lng: 78.4018 },
  'begumpet': { lat: 17.4448, lng: 78.4682 },
  'secunderabad': { lat: 17.4399, lng: 78.4983 },
  'somajiguda': { lat: 17.4260, lng: 78.4578 },
  'himayatnagar': { lat: 17.4042, lng: 78.4891 },
  'ameerpet': { lat: 17.4375, lng: 78.4482 },
  'dilsukhnagar': { lat: 17.3688, lng: 78.5247 },
  'uppal': { lat: 17.4057, lng: 78.5591 },
  'mehdipatnam': { lat: 17.3916, lng: 78.4384 },
  'manikonda': { lat: 17.3975, lng: 78.3776 },
  'guntur': { lat: 16.3067, lng: 80.4365 },
  'brodipet': { lat: 16.3115, lng: 80.4372 },
  'arundelpet': { lat: 16.3032, lng: 80.4418 },
  'lakshmipuram': { lat: 16.3090, lng: 80.4285 },
  'kothapet': { lat: 16.2980, lng: 80.4500 },
  'pattabhipuram': { lat: 16.3160, lng: 80.4250 },
  'brindavan gardens': { lat: 16.3130, lng: 80.4190 },
  'old guntur': { lat: 16.2920, lng: 80.4580 },
  'svn colony': { lat: 16.3220, lng: 80.4140 },
  'guvvalagutta': { lat: 16.3010, lng: 80.4450 },
  'amaravathi road': { lat: 16.3210, lng: 80.4120 },
  'gorantla': { lat: 16.3380, lng: 80.4050 },
  'lalapet': { lat: 16.3015, lng: 80.4465 },
  'syamala nagar': { lat: 16.3140, lng: 80.4280 },
  'vidyanagar': { lat: 16.3180, lng: 80.4210 },
  'gujjanagundla': { lat: 16.3120, lng: 80.4160 },
  'autonagar guntur': { lat: 16.2950, lng: 80.4720 },
  'chandramouli nagar': { lat: 16.3200, lng: 80.4180 },
  'nallapadu': { lat: 16.2820, lng: 80.3980 },
  'nallacheruvu': { lat: 16.2890, lng: 80.4410 },
  'stambhalagaruvu': { lat: 16.3190, lng: 80.4270 },
  'pedakakani road': { lat: 16.3320, lng: 80.4680 },
  'etukuru road': { lat: 16.2810, lng: 80.4690 },
  'chowdavaram': { lat: 16.2410, lng: 80.3420 },

  // Guntur District Official 18 Mandals (Guntur Division & Tenali Division)
  'guntur east': { lat: 16.3067, lng: 80.4480 },
  'guntur west': { lat: 16.3115, lng: 80.4280 },
  'medikonduru': { lat: 16.3312, lng: 80.2974 },
  'pedakakani': { lat: 16.3458, lng: 80.4952 },
  'pedanandipadu': { lat: 16.0373, lng: 80.3015 },
  'phirangipuram': { lat: 16.3023, lng: 80.2608 },
  'prathipadu': { lat: 16.1772, lng: 80.3725 },
  'tadikonda': { lat: 16.4258, lng: 80.4486 },
  'thullur': { lat: 16.5369, lng: 80.4722 },
  'tullur': { lat: 16.5369, lng: 80.4722 },
  'vatticherukuru': { lat: 16.1950, lng: 80.4410 },
  'chebrolu': { lat: 16.2008, lng: 80.5312 },
  'duggirala': { lat: 16.3262, lng: 80.6272 },
  'kakumanu': { lat: 16.0380, lng: 80.4040 },
  'kollipara': { lat: 16.2862, lng: 80.7228 },
  'mangalagiri': { lat: 16.4326, lng: 80.5645 },
  'ponnur': { lat: 16.0682, lng: 80.5542 },
  'tadepalle': { lat: 16.4789, lng: 80.6014 },
  'tenali': { lat: 16.2435, lng: 80.6400 },
  'bose road tenali': { lat: 16.2428, lng: 80.6432 },
  'morrispet': { lat: 16.2389, lng: 80.6355 },
  'chenchupet': { lat: 16.2465, lng: 80.6480 },
  'ganganammapet tenali': { lat: 16.2410, lng: 80.6415 },
  'kothapet tenali': { lat: 16.2450, lng: 80.6370 },
  'ithanagar tenali': { lat: 16.2480, lng: 80.6440 },
  'chinaravuru': { lat: 16.2310, lng: 80.6550 },
  'vijayawada': { lat: 16.5062, lng: 80.6480 },
  'suryaraopeta': { lat: 16.5132, lng: 80.6276 },
  'suryaraopet': { lat: 16.5132, lng: 80.6276 },
  'labbipet': { lat: 16.5050, lng: 80.6380 },
  'benz circle': { lat: 16.4988, lng: 80.6558 },
  'governorpet': { lat: 16.5140, lng: 80.6210 },
  'ntr complex': { lat: 16.5152, lng: 80.6224 },
  'ntr complex governorpet': { lat: 16.5152, lng: 80.6224 },
  'besant road': { lat: 16.5145, lng: 80.6238 },
  'eluru road': { lat: 16.5168, lng: 80.6312 },
  'bandar road': { lat: 16.5024, lng: 80.6472 },
  'mg road vijayawada': { lat: 16.5038, lng: 80.6435 },
  'patamata': { lat: 16.4920, lng: 80.6680 },
  'moghalrajpuram': { lat: 16.5040, lng: 80.6480 },
  'auto nagar': { lat: 16.4950, lng: 80.6850 },
  'gunadala': { lat: 16.5250, lng: 80.6650 },
  'bhavanipuram': { lat: 16.5280, lng: 80.5950 },
  'machavaram': { lat: 16.5186, lng: 80.6442 },
  'satyanarayanapuram': { lat: 16.5248, lng: 80.6352 },
  'gandhinagar vijayawada': { lat: 16.5210, lng: 80.6245 },
  'one town vijayawada': { lat: 16.5145, lng: 80.6085 },
  'tarapet': { lat: 16.5162, lng: 80.6138 },
  'krishna lanka': { lat: 16.4962, lng: 80.6270 },
  'vidyadharapuram': { lat: 16.5262, lng: 80.6080 },
  'ajith singh nagar': { lat: 16.5442, lng: 80.6408 },
  'kanuru': { lat: 16.4962, lng: 80.6928 },
  'poranki': { lat: 16.4738, lng: 80.7068 },
  'penamaluru': { lat: 16.4692, lng: 80.7185 },
  'tadigadapa': { lat: 16.4810, lng: 80.6960 },
  'ramavarappadu': { lat: 16.5265, lng: 80.6785 },
  'enikepadu': { lat: 16.5275, lng: 80.7005 },
  'prasadampadu': { lat: 16.5282, lng: 80.6902 },
  'gollapudi': { lat: 16.5458, lng: 80.5795 },
  'currency nagar': { lat: 16.5150, lng: 80.6660 },
  'guru nanak colony': { lat: 16.5055, lng: 80.6625 },
  'gurunanak colony': { lat: 16.5055, lng: 80.6625 },
  'siddhartha nagar': { lat: 16.5048, lng: 80.6470 },
  'maruthi nagar': { lat: 16.5235, lng: 80.6422 },
  'visakhapatnam': { lat: 17.6868, lng: 83.2185 },
  'narasaraopet': { lat: 16.2359, lng: 80.0499 },
  'bapatla': { lat: 15.9042, lng: 80.4673 },
  'chirala': { lat: 15.8246, lng: 80.3522 },
  'machilipatnam': { lat: 16.1875, lng: 81.1389 },
  'eluru': { lat: 16.7107, lng: 81.0952 },
  'rajahmundry': { lat: 17.0005, lng: 81.8040 },
  'kakinada': { lat: 16.9891, lng: 82.2475 },
  'tirupati': { lat: 13.6288, lng: 79.4192 },
  'nellore': { lat: 14.4426, lng: 79.9865 },
  'kurnool': { lat: 15.8281, lng: 78.0373 },
  'anantapur': { lat: 14.6819, lng: 77.6006 },
  'kadapa': { lat: 14.4673, lng: 78.8242 },
  'warangal': { lat: 17.9689, lng: 79.5941 },
  'karimnagar': { lat: 18.4386, lng: 79.1288 },
  'khammam': { lat: 17.2473, lng: 80.1514 },
  'nizamabad': { lat: 18.6725, lng: 78.0941 },
  'nalgonda': { lat: 17.0504, lng: 79.2669 },

  // Commercial Village Nodes & Sub-Centres
  'vadlamudi': { lat: 16.2378, lng: 80.5524 },
  'nambur': { lat: 16.3680, lng: 80.5230 },
  'perecherla': { lat: 16.3275, lng: 80.3270 },
  'pericherla': { lat: 16.3275, lng: 80.3270 },
  'undavalli': { lat: 16.4950, lng: 80.5820 },
  'velagapudi': { lat: 16.5180, lng: 80.5050 },
  'atmakur': { lat: 16.4210, lng: 80.5500 },
  'navuluru': { lat: 16.4420, lng: 80.5750 },
  'burripalem': { lat: 16.2750, lng: 80.6120 },
  'chiluvuru': { lat: 16.3520, lng: 80.6450 },
  'lam': { lat: 16.3980, lng: 80.4410 },
  'angalakuduru': { lat: 16.2550, lng: 80.6150 },
  'kolakaluru': { lat: 16.2820, lng: 80.6280 },
  'chinakakani': { lat: 16.4150, lng: 80.5600 },
  'kaza': { lat: 16.3900, lng: 80.5350 },
  'narakodur': { lat: 16.2410, lng: 80.5050 },
  'vejendla': { lat: 16.2720, lng: 80.4910 },
  'sekuru': { lat: 16.2300, lng: 80.5100 },
  'vaddeswaram': { lat: 16.4400, lng: 80.6180 },
  'kunchanapalle': { lat: 16.4650, lng: 80.6120 },
  'penumaka': { lat: 16.5050, lng: 80.5700 },
  'mandadam': { lat: 16.5120, lng: 80.5350 },
  'rayapudi': { lat: 16.5280, lng: 80.4850 },
  'ainavolu': { lat: 16.5020, lng: 80.4950 },

  // Global Metro Anchors
  'new york': { lat: 40.7128, lng: -74.0060 },
  'newyork': { lat: 40.7128, lng: -74.0060 },
  'newyorkcity': { lat: 40.7128, lng: -74.0060 },
  'nyc': { lat: 40.7128, lng: -74.0060 },
  'manhattan': { lat: 40.7831, lng: -73.9712 },
  'brooklyn': { lat: 40.6782, lng: -73.9442 },
  'queens': { lat: 40.7282, lng: -73.7949 },
  'the bronx': { lat: 40.8448, lng: -73.8648 },
  'staten island': { lat: 40.5795, lng: -74.1502 },
  'london': { lat: 51.5074, lng: -0.1278 },
  'toronto': { lat: 43.6532, lng: -79.3832 },
  'sydney': { lat: -33.8688, lng: 151.2093 },
  'dubai': { lat: 25.2048, lng: 55.2708 },
  'los angeles': { lat: 34.0522, lng: -118.2437 },
  'losangeles': { lat: 34.0522, lng: -118.2437 },
  'chicago': { lat: 41.8781, lng: -87.6298 },
  'san francisco': { lat: 37.7749, lng: -122.4194 },
  'sanfrancisco': { lat: 37.7749, lng: -122.4194 },
  'paris': { lat: 48.8566, lng: 2.3522 },
  'berlin': { lat: 52.5200, lng: 13.4050 },
  'munich': { lat: 48.1351, lng: 11.5820 },
  'frankfurt': { lat: 50.1109, lng: 8.6821 },
  'amsterdam': { lat: 52.3676, lng: 4.9041 },
  'singapore': { lat: 1.3521, lng: 103.8198 },
  'tokyo': { lat: 35.6762, lng: 139.6503 },
  'dublin': { lat: 53.3498, lng: -6.2603 },
  'houston': { lat: 29.7604, lng: -95.3698 },
  'dallas': { lat: 32.7767, lng: -96.7970 },
  'austin': { lat: 30.2672, lng: -97.7431 },
  'miami': { lat: 25.7617, lng: -80.1918 },
  'atlanta': { lat: 33.7490, lng: -84.3880 },
  'seattle': { lat: 47.6062, lng: -122.3321 },
  'boston': { lat: 42.3601, lng: -71.0589 },
  'phoenix': { lat: 33.4484, lng: -112.0740 },
  'denver': { lat: 39.7392, lng: -104.9903 },
  'manchester': { lat: 53.4808, lng: -2.2426 },
  'birmingham': { lat: 52.4862, lng: -1.8904 },
  'edinburgh': { lat: 55.9533, lng: -3.1883 },
  'glasgow': { lat: 55.8642, lng: -4.2518 },
  'melbourne': { lat: -37.8136, lng: 144.9631 },
  'brisbane': { lat: -27.4705, lng: 153.0260 },
  'perth': { lat: -31.9505, lng: 115.8605 },
  'vancouver': { lat: 49.2827, lng: -123.1207 },
  'montreal': { lat: 45.5017, lng: -73.5673 },
  'calgary': { lat: 51.0447, lng: -114.0719 },
  'ottawa': { lat: 45.4215, lng: -75.6972 },
  'abu dhabi': { lat: 24.4539, lng: 54.3773 },
  'abudhabi': { lat: 24.4539, lng: 54.3773 },
  'sharjah': { lat: 25.3463, lng: 55.4209 },
  'doha': { lat: 25.2854, lng: 51.5310 },
  'riyadh': { lat: 24.7136, lng: 46.6753 },
  'kuala lumpur': { lat: 3.1390, lng: 101.6869 },
  'auckland': { lat: -36.8485, lng: 174.7633 }
};

const MANDAL_TYPOLOGY = {
  // Urban: Dense clusters requiring 3.2 - 3.8 km to prevent 20-lead pagination truncations
  'guntureast': { type: 'urban', radiusKm: 3.5 },
  'gunturwest': { type: 'urban', radiusKm: 3.5 },
  'guntur': { type: 'urban', radiusKm: 3.5 },
  'tenali': { type: 'urban', radiusKm: 3.8 },
  'vijayawadaurban': { type: 'urban', radiusKm: 3.5 },
  'vijayawada': { type: 'urban', radiusKm: 3.5 },
  'visakhapatnam': { type: 'urban', radiusKm: 3.8 },
  
  // Corridor: High-growth development corridors requiring 4.5 - 6.0 km
  'mangalagiri': { type: 'corridor', radiusKm: 5.5 },
  'tadepalle': { type: 'corridor', radiusKm: 5.0 },
  'pedakakani': { type: 'corridor', radiusKm: 5.5 },
  'chebrolu': { type: 'corridor', radiusKm: 5.5 },
  
  // Rural / Agricultural / Capital Region: Expansive territories requiring 6.5 - 8.0 km
  'thullur': { type: 'rural', radiusKm: 7.5 },
  'tullur': { type: 'rural', radiusKm: 7.5 },
  'medikonduru': { type: 'rural', radiusKm: 7.5 },
  'phirangipuram': { type: 'rural', radiusKm: 8.0 },
  'pedanandipadu': { type: 'rural', radiusKm: 7.5 },
  'prathipadu': { type: 'rural', radiusKm: 7.5 },
  'tadikonda': { type: 'rural', radiusKm: 7.0 },
  'vatticherukuru': { type: 'rural', radiusKm: 7.0 },
  'kakumanu': { type: 'rural', radiusKm: 7.5 },
  'kollipara': { type: 'rural', radiusKm: 7.0 },
  'duggirala': { type: 'rural', radiusKm: 6.5 },
  'ponnur': { type: 'rural', radiusKm: 7.0 }
};

function getMandalTypology(mandalName) {
  if (!mandalName) return { type: 'corridor', radiusKm: 5.5 };
  const clean = String(mandalName).toLowerCase().replace(/[^a-z0-9]/g, '');
  if (MANDAL_TYPOLOGY[clean]) return MANDAL_TYPOLOGY[clean];
  for (const [key, val] of Object.entries(MANDAL_TYPOLOGY)) {
    if (clean.includes(key) || key.includes(clean)) {
      return val;
    }
  }
  return { type: 'corridor', radiusKm: 5.5 };
}

// State reference points used to spread state-wide sweeps on the map. These are
// geographic anchors, not claims that every district sits at the capital.
const STATE_CENTERS = {
  'andhra pradesh': { lat: 16.5062, lng: 80.648, radius: 2.1 },
  'telangana': { lat: 17.385, lng: 78.4867, radius: 1.9 },
  'maharashtra': { lat: 19.7515, lng: 75.7139, radius: 2.4 },
  'karnataka': { lat: 15.3173, lng: 75.7139, radius: 2.2 },
  'tamil nadu': { lat: 11.1271, lng: 78.6569, radius: 2.0 },
  'kerala': { lat: 10.8505, lng: 76.2711, radius: 1.2 },
  'gujarat': { lat: 22.2587, lng: 71.1924, radius: 2.0 },
  'rajasthan': { lat: 27.0238, lng: 74.2179, radius: 2.6 },
  'madhya pradesh': { lat: 23.5937, lng: 78.9629, radius: 2.6 },
  'uttar pradesh': { lat: 26.8467, lng: 80.9462, radius: 2.6 },
  'bihar': { lat: 25.0961, lng: 85.3131, radius: 1.4 },
  'west bengal': { lat: 22.9868, lng: 87.855, radius: 1.5 },
  'odisha': { lat: 20.9517, lng: 85.0985, radius: 1.8 },
  'punjab': { lat: 31.1471, lng: 75.3412, radius: 1.2 },
  'haryana': { lat: 29.0588, lng: 76.0856, radius: 1.1 },
  'assam': { lat: 26.2006, lng: 92.9376, radius: 1.8 },
  'jharkhand': { lat: 23.6102, lng: 85.2799, radius: 1.3 },
  'chhattisgarh': { lat: 21.2787, lng: 81.8661, radius: 1.7 },
  'uttarakhand': { lat: 30.0668, lng: 79.0193, radius: 1.3 },
  'himachal pradesh': { lat: 31.1048, lng: 77.1734, radius: 1.2 },
  'goa': { lat: 15.2993, lng: 74.124, radius: 0.4 },
  'delhi': { lat: 28.6139, lng: 77.209, radius: 0.25 }
};

// ── COORDINATE RESOLUTION HELPERS ──
// A zone may not have a hard-coded anchor. We first consult the persisted
// forward-geocode cache (populated by earlier runs), then fall back to a
// deterministic spread around the parent district centre. The spread keeps
// every zone distinct on the map and inside the search grid, and is flagged
// `isApproximate` so the UI never pretends it is a precise centroid.
function cachedZoneCoords(name, district) {
  if (!name) return null;
  try {
    const { getCache } = require('../olaMaps');
    const cache = getCache() || {};
    const keys = [];
    if (district) keys.push(`${name}, ${district}, india`);
    keys.push(`${name}, india`, `${name}`);
    for (const key of keys) {
      const hit = cache[key.toLowerCase().trim()];
      if (hit && Number.isFinite(Number(hit.lat)) && Number.isFinite(Number(hit.lng))) {
        return { lat: Number(hit.lat), lng: Number(hit.lng), isApproximate: false };
      }
    }
  } catch (error) {}
  return null;
}

function spreadCoords(center, index, total, radius = 0.075) {
  if (!center || !Number.isFinite(Number(center.lat)) || !Number.isFinite(Number(center.lng))) return null;
  const golden = 2.399963229728653;
  const angle = golden * (index + 1);
  const ring = 0.35 + 0.65 * Math.sqrt(((index + 1) / Math.max(1, total)));
  return {
    lat: Number((Number(center.lat) + Math.sin(angle) * radius * ring).toFixed(5)),
    lng: Number((Number(center.lng) + Math.cos(angle) * radius * ring).toFixed(5)),
    isApproximate: true
  };
}

/**
 * Resolve a zone anchor.
 *
 * `options.center` is the sweep's own anchor (the geocoded mandal / district /
 * city the operator asked for). It must win over the district fallback: a
 * Tenali Mandal sweep was previously anchoring every village on Guntur city,
 * which made Google return Guntur businesses for a Tenali query. `options.spread`
 * widens the deterministic ring for larger scopes (a state needs degrees, a
 * mandal needs a few hundred metres of separation).
 */
function zoneCoordinates(name, district, index = 0, total = 1, options = {}) {
  const key = String(name || '').toLowerCase().trim();
  const districtKey = String(district || '').toLowerCase().trim();
  const direct = ZONE_COORDINATES[key];
  if (direct) return { lat: direct.lat, lng: direct.lng, isApproximate: false };

  const cached = cachedZoneCoords(name, district);
  if (cached) return cached;

  const explicitCenter = options.center
    && Number.isFinite(Number(options.center.lat))
    && Number.isFinite(Number(options.center.lng))
    ? options.center
    : null;
  const center = explicitCenter
    || ZONE_COORDINATES[districtKey]
    || cachedZoneCoords(district, '')
    || null;
  const spread = Number.isFinite(Number(options.spread)) && Number(options.spread) > 0
    ? Number(options.spread)
    : 0.075;
  return spreadCoords(center, index, total, spread);
}

// ── WHOLE-CITY COVERAGE GRID ──
// A city is not a handful of famous localities. Google only reveals ~120
// results per query, so the only honest way to cover a whole city is to split
// its true footprint into viewport-sized cells and let each cell return its own
// slice. Cells are Maps-only (Local Finder cannot be area-biased) and are
// skipped when a named locality already sits on top of them.

const GRID_CELL_KM = 2.6;
const GRID_KM_PER_DEG_LAT = 111.0;
// Famous businesses often sit just outside the municipal core (highway
// restaurants, resorts, function halls, industrial suppliers). A city run must
// therefore search a ring *around* the city, not only inside it. 5 km is enough
// to catch the highway/outskirt belt without turning every run into a district
// sweep.
const CITY_GRID_RING_KM = 5;
const GRID_MAX_CELLS_PER_AXIS = 9;


module.exports = {
  ZONE_COORDINATES,
  MANDAL_TYPOLOGY,
  getMandalTypology,
  STATE_CENTERS,
  cachedZoneCoords,
  spreadCoords,
  zoneCoordinates,
  GRID_CELL_KM,
  GRID_KM_PER_DEG_LAT,
  CITY_GRID_RING_KM,
  GRID_MAX_CELLS_PER_AXIS
};
