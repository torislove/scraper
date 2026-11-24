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

// Generate realistic seed sessions for first-time visits across Tier-1 hubs
export function getSeedSessions() {
  const now = Date.now();

  // 1. Enterprise Cloud & AI Software Studios in HITEC City, Hyderabad
  const hyderabadLeads = [
    {
      id: 'hyd_lead_1',
      name: 'CyberTowers Cloud & AI Systems',
      category: 'Enterprise Software & Cloud Infrastructure',
      phone: '9885603754',
      primaryPhone: '9885603754',
      secondaryPhone: '9849012044',
      whatsappLink: 'https://wa.me/919885603754',
      verified: true,
      email: 'founders@cybertowers.in',
      website: 'https://cybertowers.in',
      instagram: '@cybertowers_ai',
      address: 'HITEC City Main Rd, Madhapur, Hyderabad',
      mandal: 'Serilingampally',
      district: 'Hyderabad',
      state: 'Telangana',
      city: 'Hyderabad',
      rating: 4.9,
      reviewCount: 318,
      qualityScore: 98,
      lat: 17.4435,
      lng: 78.3772,
      source: 'Google Maps + Corporate Registry'
    },
    {
      id: 'hyd_lead_2',
      name: 'Deccan Digital FinTech Solutions',
      category: 'FinTech & Enterprise Platforms',
      phone: '9440188921',
      primaryPhone: '9440188921',
      whatsappLink: 'https://wa.me/919440188921',
      verified: true,
      email: 'hello@deccandigital.io',
      instagram: '@deccan_fintech',
      address: 'Financial District, Gachibowli, Hyderabad',
      mandal: 'Gachibowli',
      district: 'Hyderabad',
      state: 'Telangana',
      city: 'Hyderabad',
      rating: 4.8,
      reviewCount: 214,
      qualityScore: 95,
      lat: 17.4239,
      lng: 78.3489,
      source: 'Google Maps'
    }
  ];

  // 2. AI & B2B SaaS Startups in Koramangala & Indiranagar, Bengaluru
  const bengaluruLeads = [
    {
      id: 'blr_lead_1',
      name: 'Silicon Corridors AI Research Labs',
      category: 'B2B AI & Machine Learning SaaS',
      phone: '9845019283',
      primaryPhone: '9845019283',
      whatsappLink: 'https://wa.me/919845019283',
      verified: true,
      address: '100ft Rd, Indiranagar, Bengaluru',
      mandal: 'Bengaluru East',
      district: 'Bengaluru Urban',
      state: 'Karnataka',
      city: 'Bengaluru',
      rating: 4.9,
      reviewCount: 289,
      qualityScore: 98,
      lat: 12.9784,
      lng: 77.6408,
      source: 'Google Maps + LinkedIn Radar'
    },
    {
      id: 'blr_lead_2',
      name: 'Koramangala Venture Infrastructure Pvt Ltd',
      category: 'Cloud DevOps & API Tooling',
      phone: '9900145678',
      primaryPhone: '9900145678',
      whatsappLink: 'https://wa.me/919900145678',
      verified: true,
      address: '80ft Rd, Koramangala 4th Block, Bengaluru',
      mandal: 'Bengaluru South',
      district: 'Bengaluru Urban',
      state: 'Karnataka',
      city: 'Bengaluru',
      rating: 4.8,
      reviewCount: 174,
      qualityScore: 94,
      lat: 12.9352,
      lng: 77.6245,
      source: 'Corporate Registry'
    }
  ];

  // 3. Commercial FinTech & Advisory Firms in BKC, Mumbai
  const mumbaiLeads = [
    {
      id: 'bom_lead_1',
      name: 'Bandra Kurla Commercial Capital Advisory',
      category: 'Institutional FinTech & Advisory',
      phone: '9820123980',
      primaryPhone: '9820123980',
      whatsappLink: 'https://wa.me/919820123980',
      verified: true,
      address: 'G Block, Bandra Kurla Complex, Mumbai',
      mandal: 'Mumbai Suburban',
      district: 'Mumbai',
      state: 'Maharashtra',
      city: 'Mumbai',
      rating: 4.9,
      reviewCount: 240,
      qualityScore: 99,
      lat: 19.0653,
      lng: 72.8680,
      source: 'Google Maps'
    },
    {
      id: 'bom_lead_2',
      name: 'Nariman Point Enterprise Risk Analytics',
      category: 'Corporate Risk & Compliance SaaS',
      phone: '9821765432',
      primaryPhone: '9821765432',
      whatsappLink: 'https://wa.me/919821765432',
      verified: true,
      address: 'Maker Chambers IV, Nariman Point, Mumbai',
      mandal: 'Mumbai City',
      district: 'Mumbai',
      state: 'Maharashtra',
      city: 'Mumbai',
      rating: 4.8,
      reviewCount: 175,
      qualityScore: 95,
      lat: 18.9256,
      lng: 72.8242,
      source: 'Verified Corporate Index'
    }
  ];

  return [
    {
      id: 'sess_seed_hyderabad',
      userId: getUserId(),
      category: 'Enterprise Software & AI',
      location: 'HITEC City, Hyderabad',
      timestamp: new Date(now - 15 * 60 * 1000).toISOString(),
      leadCount: 48,
      phoneCount: 44,
      leads: hyderabadLeads,
      metadata: {
        activeDistrict: 'Hyderabad',
        mandal: 'Serilingampally',
        territory: 'HITEC City Tech Corridor',
        coordinates: [17.4435, 78.3772],
        verifiedPhones: 44
      }
    },
    {
      id: 'sess_seed_bengaluru',
      userId: getUserId(),
      category: 'B2B AI & SaaS Startups',
      location: 'Indiranagar & Koramangala, Bengaluru',
      timestamp: new Date(now - 2 * 3600 * 1000).toISOString(),
      leadCount: 64,
      phoneCount: 59,
      leads: bengaluruLeads,
      metadata: {
        activeDistrict: 'Bengaluru Urban',
        mandal: 'Indiranagar',
        coordinates: [12.9784, 77.6408],
        verifiedPhones: 59
      }
    },
    {
      id: 'sess_seed_mumbai',
      userId: getUserId(),
      category: 'Institutional FinTech & Advisory',
      location: 'BKC, Mumbai',
      timestamp: new Date(now - 6 * 3600 * 1000).toISOString(),
      leadCount: 54,
      phoneCount: 51,
      leads: mumbaiLeads,
      metadata: {
        activeDistrict: 'Mumbai',
        mandal: 'Bandra Kurla Complex',
        coordinates: [19.0653, 72.8680],
        verifiedPhones: 51
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
    escapeCsv(l.whatsappLink || (l.phone ? `https://wa.me/${String(l.phone).replace(/\D/g, '').length === 10 ? `91${String(l.phone).replace(/\D/g, '')}` : String(l.phone).replace(/\D/g, '')}` : '')),
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
