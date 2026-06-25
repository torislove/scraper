const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

let proxyList = [];
let deadProxies = new Set();

async function fetchProxies() {
  try {
    console.log('[Proxy Rotator] Fetching fresh open-source proxies...');
    
    const sources = [
      'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt',
      'https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/http.txt',
      'https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/http.txt'
    ];
    
    let allProxies = new Set();
    
    for (const source of sources) {
      try {
        const res = await axios.get(source, { timeout: 10000 });
        const lines = res.data.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        lines.forEach(ipPort => allProxies.add(`http://${ipPort}`));
      } catch (e) {
        console.warn(`[Proxy Rotator] Failed to fetch from ${source}`);
      }
    }
    
    // Filter out known dead
    proxyList = Array.from(allProxies).filter(p => !deadProxies.has(p));
    
    console.log(`[Proxy Rotator] Loaded ${proxyList.length} fresh proxies.`);
    
    // Periodically clear dead proxy cache to retry them eventually
    if (deadProxies.size > 5000) deadProxies.clear();
    
  } catch (error) {
    console.error('[Proxy Rotator] Failed to fetch proxies:', error.message);
  }
}

// Fetch proxies on startup and every 30 mins
fetchProxies();
setInterval(fetchProxies, 30 * 60 * 1000);

function removeProxy(proxyUrl) {
  if (proxyUrl) {
    deadProxies.add(proxyUrl);
    proxyList = proxyList.filter(p => p !== proxyUrl);
  }
}

async function axiosWithProxy(url, options = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    // 80% chance to use proxy if available
    const useProxy = proxyList.length > 0 && Math.random() > 0.2; 
    let httpsAgent = null;
    let selectedProxy = null;

    if (useProxy) {
      selectedProxy = proxyList[Math.floor(Math.random() * proxyList.length)];
      httpsAgent = new HttpsProxyAgent(selectedProxy);
    }

    try {
      const response = await axios.get(url, {
        ...options,
        httpsAgent: httpsAgent,
        proxy: false,
        timeout: 10000
      });
      return response;
    } catch (error) {
      console.warn(`[Proxy Rotator] Proxy ${selectedProxy || 'Direct'} failed (${i+1}/${retries}). Retrying...`);
      if (selectedProxy) {
        removeProxy(selectedProxy);
      }
    }
  }
  
  // Final fallback
  console.log(`[Proxy Rotator] All proxies failed for ${url}. Falling back to direct connection.`);
  return axios.get(url, { ...options, httpsAgent: null, proxy: false });
}

function getRandomIP() {
  return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

module.exports = {
  fetchProxies,
  axiosWithProxy,
  getRandomIP,
  getProxyList: () => proxyList,
  removeProxy
};
