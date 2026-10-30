import axios from 'axios';
import { API_URL } from '../apiConfig';

const USER_ID_KEY = 'gomandap_user_uuid';
const SESSIONS_LOCAL_KEY = 'gomandap_search_sessions_v1';

// Generate or retrieve persistent visitor UUID
export function getUserId() {
  let uid = localStorage.getItem(USER_ID_KEY);
  if (!uid) {
    uid = 'usr_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
    localStorage.setItem(USER_ID_KEY, uid);
  }
  return uid;
}

// Generate realistic seed sessions for first-time visits
export function getSeedSessions() {
  const now = Date.now();
  
  // 1. Photographers in Amaravathi, AP (as featured on landing page)
  const amaravathiLeads = [
    {
      id: 'amaravathi_lead_1',
      name: 'Amaravathi Moments Photography & Wedding Films',
      category: 'Wedding & Event Photographers',
      phone: '9876543210',
      primaryPhone: '9876543210',
      secondaryPhone: '9848012345',
      whatsappLink: 'https://wa.me/919876543210',
      verified: true,
      email: 'contact@amaravathimoments.in',
      website: 'https://amaravathimoments.in',
      instagram: '@amaravathi_wedding_films',
      address: 'Main Bazaar Road, Near Heritage Center, Amaravathi',
      mandal: 'Amaravathi',
      district: 'Guntur',
      state: 'Andhra Pradesh',
      city: 'Amaravathi',
      rating: 4.9,
      reviewCount: 168,
      qualityScore: 98,
      lat: 16.5735,
      lng: 80.3575,
      source: 'Google Maps + Neural Entity Recognizer'
    },
    {
      id: 'amaravathi_lead_2',
      name: 'Capital Vision Studio & Candid Cinematography',
      category: 'Wedding & Event Photographers',
      phone: '9848123456',
      primaryPhone: '9848123456',
      whatsappLink: 'https://wa.me/919848123456',
      verified: true,
      email: 'capitalvision.amaravathi@gmail.com',
      instagram: '@capital_vision_candid',
      address: 'Seed Access Road Junction, Amaravathi Capital Zone',
      mandal: 'Amaravathi',
      district: 'Guntur',
      state: 'Andhra Pradesh',
      city: 'Amaravathi',
      rating: 4.8,
      reviewCount: 94,
      qualityScore: 94,
      lat: 16.5780,
      lng: 80.3620,
      source: 'Google Maps'
    },
    {
      id: 'amaravathi_lead_3',
      name: 'Krishna River Drone Vision & 4K Wedding Cinema',
      category: 'Drone & Aerial Photography',
      phone: '9123456789',
      primaryPhone: '9123456789',
      whatsappLink: 'https://wa.me/919123456789',
      verified: true,
      email: 'droneweddings.krishna@gmail.com',
      address: 'Riverview Complex, Ghat Road, Amaravathi',
      mandal: 'Amaravathi',
      district: 'Guntur',
      state: 'Andhra Pradesh',
      city: 'Amaravathi',
      rating: 4.9,
      reviewCount: 132,
      qualityScore: 97,
      lat: 16.5710,
      lng: 80.3530,
      source: 'Pan-India Gazetteer'
    },
    {
      id: 'amaravathi_lead_4',
      name: 'Sri Venkateswara Digital Color Lab & Studio',
      category: 'Portrait & Studio Photography',
      phone: '9440123987',
      primaryPhone: '9440123987',
      whatsappLink: 'https://wa.me/919440123987',
      verified: true,
      address: 'Opposite State Bank, Temple Road, Amaravathi',
      mandal: 'Amaravathi',
      district: 'Guntur',
      state: 'Andhra Pradesh',
      city: 'Amaravathi',
      rating: 4.7,
      reviewCount: 78,
      qualityScore: 90,
      lat: 16.5752,
      lng: 80.3590,
      source: 'Bing Places'
    },
    {
      id: 'amaravathi_lead_5',
      name: 'Royal Pre-Wedding Shoots & Traditional Framing',
      category: 'Pre-Wedding & Outdoor Shoots',
      phone: '9989012345',
      primaryPhone: '9989012345',
      whatsappLink: 'https://wa.me/919989012345',
      verified: true,
      address: 'Near Dhyana Buddha Statue, Amaravathi',
      mandal: 'Amaravathi',
      district: 'Guntur',
      state: 'Andhra Pradesh',
      city: 'Amaravathi',
      rating: 4.9,
      reviewCount: 185,
      qualityScore: 99,
      lat: 16.5810,
      lng: 80.3540,
      source: 'Verified Field Scrape'
    }
  ];

  // 2. Event Decorators in Guntur, AP
  const gunturLeads = [
    {
      id: 'guntur_lead_1',
      name: 'Royal Mandap Arts & Floral Stage Decors',
      category: 'Event Decorators & Mandaps',
      phone: '9440567812',
      primaryPhone: '9440567812',
      whatsappLink: 'https://wa.me/919440567812',
      verified: true,
      address: 'Brodipet 4th Line, Guntur',
      mandal: 'Guntur Urban',
      district: 'Guntur',
      state: 'Andhra Pradesh',
      city: 'Guntur',
      rating: 4.9,
      reviewCount: 189,
      qualityScore: 97,
      lat: 16.3067,
      lng: 80.4365,
      source: 'Google Maps'
    },
    {
      id: 'guntur_lead_2',
      name: 'Sai Teja Kalyana Mandapam & Event Planners',
      category: 'Kalyana Mandapams & Decors',
      phone: '9849234567',
      primaryPhone: '9849234567',
      whatsappLink: 'https://wa.me/919849234567',
      verified: true,
      address: 'Station Road, Chebrolu',
      mandal: 'Chebrolu',
      district: 'Guntur',
      state: 'Andhra Pradesh',
      city: 'Chebrolu',
      rating: 4.8,
      reviewCount: 112,
      qualityScore: 93,
      lat: 16.2050,
      lng: 80.5280,
      source: 'Verified Field Scrape'
    },
    {
      id: 'guntur_lead_3',
      name: 'Padmavathi Grand Stage Lightings & Audio Systems',
      category: 'Stage Lighting & Decors',
      phone: '9989123456',
      primaryPhone: '9989123456',
      whatsappLink: 'https://wa.me/919989123456',
      verified: true,
      address: 'Kothapet, Guntur',
      mandal: 'Guntur Urban',
      district: 'Guntur',
      state: 'Andhra Pradesh',
      city: 'Guntur',
      rating: 4.7,
      reviewCount: 86,
      qualityScore: 91,
      lat: 16.3120,
      lng: 80.4410,
      source: 'Bing Places'
    }
  ];

  // 3. Catering & Banquet Halls in Vijayawada
  const vijayawadaLeads = [
    {
      id: 'vja_lead_1',
      name: 'Annapurna Traditional Grand Caterers',
      category: 'Catering & Banquet Services',
      phone: '9866123980',
      primaryPhone: '9866123980',
      whatsappLink: 'https://wa.me/919866123980',
      verified: true,
      address: 'Benz Circle, Bandar Road, Vijayawada',
      mandal: 'Vijayawada Urban',
      district: 'Krishna',
      state: 'Andhra Pradesh',
      city: 'Vijayawada',
      rating: 4.9,
      reviewCount: 240,
      qualityScore: 99,
      lat: 16.5062,
      lng: 80.6480,
      source: 'Google Maps'
    },
    {
      id: 'vja_lead_2',
      name: 'Sri Krishna Deluxe Banquet & Function Palace',
      category: 'Banquet & Function Halls',
      phone: '9948765432',
      primaryPhone: '9948765432',
      whatsappLink: 'https://wa.me/919948765432',
      verified: true,
      address: 'MG Road, Governorpet, Vijayawada',
      mandal: 'Vijayawada Urban',
      district: 'Krishna',
      state: 'Andhra Pradesh',
      city: 'Vijayawada',
      rating: 4.8,
      reviewCount: 175,
      qualityScore: 95,
      lat: 16.5120,
      lng: 80.6350,
      source: 'Verified Field Scrape'
    }
  ];

  return [
    {
      id: 'sess_seed_amaravathi',
      userId: getUserId(),
      category: 'Photographers',
      location: 'Amaravathi, Andhra Pradesh',
      timestamp: new Date(now - 15 * 60 * 1000).toISOString(),
      leadCount: 48,
      phoneCount: 42,
      leads: amaravathiLeads,
      metadata: {
        activeDistrict: 'Guntur',
        mandal: 'Amaravathi',
        territory: 'Amaravathi Capital Region',
        coordinates: [16.5735, 80.3575],
        verifiedPhones: 42
      }
    },
    {
      id: 'sess_seed_guntur',
      userId: getUserId(),
      category: 'Event Decorators & Mandaps',
      location: 'Guntur, Andhra Pradesh',
      timestamp: new Date(now - 2 * 3600 * 1000).toISOString(),
      leadCount: 36,
      phoneCount: 32,
      leads: gunturLeads,
      metadata: {
        activeDistrict: 'Guntur',
        mandal: 'Guntur Urban',
        coordinates: [16.3067, 80.4365],
        verifiedPhones: 32
      }
    },
    {
      id: 'sess_seed_vijayawada',
      userId: getUserId(),
      category: 'Catering & Banquet Halls',
      location: 'Vijayawada, Andhra Pradesh',
      timestamp: new Date(now - 6 * 3600 * 1000).toISOString(),
      leadCount: 54,
      phoneCount: 49,
      leads: vijayawadaLeads,
      metadata: {
        activeDistrict: 'Krishna',
        mandal: 'Vijayawada Urban',
        coordinates: [16.5062, 80.6480],
        verifiedPhones: 49
      }
    }
  ];
}

// Get all sessions from local storage
export function getLocalSessions() {
  try {
    const raw = localStorage.getItem(SESSIONS_LOCAL_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    // Seed initial sessions on fresh load
    const seeds = getSeedSessions();
    localStorage.setItem(SESSIONS_LOCAL_KEY, JSON.stringify(seeds));
    return seeds;
  } catch (e) {
    console.error('Failed to read local sessions', e);
    return getSeedSessions();
  }
}

// Save a session locally and sync to server with strict folder isolation
export async function saveSearchSession({ category, location, leads = [], metadata = {}, status = 'completed', customSessionId = null }) {
  const userId = getUserId();
  
  // Format semantic folder ID: sess_<category>_<clean_location>_<timestamp>
  const cleanCat = (category || 'leads').toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').slice(0, 24);
  const cleanLoc = (location || 'india').toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').slice(0, 24);
  const timestampStr = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const sessionId = customSessionId || `sess_${cleanCat}_${cleanLoc}_${timestampStr}`;

  const phoneCount = leads.filter(l => l.phone || l.primaryPhone).length;

  const sessionObj = {
    id: sessionId,
    userId,
    category: category || 'Business',
    location: location || 'India',
    timestamp: new Date().toISOString(),
    status: status || 'completed',
    leadCount: leads.length,
    phoneCount: phoneCount,
    leads: leads.slice(0, 500),
    metadata: {
      ...metadata,
      status: status || 'completed',
      phoneCount
    }
  };

  // 1. Save locally
  try {
    const current = getLocalSessions();
    const updated = [sessionObj, ...current.filter(s => s.id !== sessionId)].slice(0, 50);
    localStorage.setItem(SESSIONS_LOCAL_KEY, JSON.stringify(updated));
    
    // Broadcast event across UI components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('search_session_saved', { detail: sessionObj }));
    }
  } catch (e) {
    console.warn('LocalStorage limit reached for search sessions', e);
  }

  // 2. Dual Storage: Sync to server repository
  try {
    await axios.post(`${API_URL}/sessions/save`, {
      userId,
      sessionId,
      category,
      location,
      timestamp: sessionObj.timestamp,
      leads,
      metadata: sessionObj.metadata
    });
  } catch (err) {
    console.warn('Server session dual-sync deferred:', err.message);
  }

  return sessionObj;
}

// Fetch all sessions (aggregates local and server)
export async function fetchAllUserSessions() {
  const localList = getLocalSessions();
  const userId = getUserId();

  try {
    const res = await axios.get(`${API_URL}/sessions/list/${userId}`, { timeout: 3000 });
    if (res.data?.success && Array.isArray(res.data.sessions) && res.data.sessions.length > 0) {
      const serverSessions = res.data.sessions;
      const map = new Map();
      serverSessions.forEach(s => map.set(s.id, s));
      localList.forEach(s => {
        if (!map.has(s.id)) map.set(s.id, s);
      });
      return Array.from(map.values()).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
  } catch (e) {
    console.warn('Server sessions offline, falling back to local storage');
  }

  return localList;
}

// Fetch single session with all leads
export async function fetchSessionDetails(sessionId) {
  const localList = getLocalSessions();
  const localMatch = localList.find(s => s.id === sessionId);
  if (localMatch && localMatch.leads && localMatch.leads.length > 0) {
    return localMatch;
  }

  const userId = getUserId();
  try {
    const res = await axios.get(`${API_URL}/sessions/${userId}/${sessionId}`);
    if (res.data?.success && res.data.session) {
      return res.data.session;
    }
  } catch (e) {
    console.error('Failed to fetch session details from server', e);
  }

  return localMatch || null;
}

// Delete session
export async function deleteUserSession(sessionId) {
  try {
    const current = getLocalSessions();
    const updated = current.filter(s => s.id !== sessionId);
    localStorage.setItem(SESSIONS_LOCAL_KEY, JSON.stringify(updated));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('search_session_deleted', { detail: sessionId }));
    }
  } catch (e) {}

  const userId = getUserId();
  try {
    await axios.delete(`${API_URL}/sessions/${userId}/${sessionId}`);
  } catch (e) {}

  return true;
}

// 1-Click CSV Export helper
export function exportSessionToCSV(session) {
  const leads = session.leads || [];
  const headers = [
    'Business Name', 'Category', 'Primary Phone', 'Secondary Phone', 'WhatsApp URL',
    'Email', 'Website', 'Instagram', 'Address', 'Mandal', 'District', 'State',
    'Rating', 'Reviews', 'AI Quality Score'
  ];
  const escapeCsv = (val) => `"${String(val || '').replace(/"/g, '""')}"`;

  const rows = leads.map(l => [
    escapeCsv(l.name),
    escapeCsv(l.category),
    escapeCsv(l.phone || l.primaryPhone),
    escapeCsv(l.secondaryPhone),
    escapeCsv(l.whatsappLink || (l.phone ? `https://wa.me/91${l.phone.replace(/[^0-9]/g, '')}` : '')),
    escapeCsv(l.email),
    escapeCsv(l.website),
    escapeCsv(l.instagram),
    escapeCsv(l.address),
    escapeCsv(l.mandal),
    escapeCsv(l.district),
    escapeCsv(l.state),
    escapeCsv(l.rating),
    escapeCsv(l.reviewCount),
    escapeCsv(l.qualityScore || 85)
  ].join(','));

  const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(session.category || 'leads')}_${(session.location || 'india')}_${session.id}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// 1-Click JSON Export helper
export function exportSessionToJSON(session) {
  const blob = new Blob([JSON.stringify(session.leads || [], null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(session.category || 'leads')}_${(session.location || 'india')}_${session.id}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
