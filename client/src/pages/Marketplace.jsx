import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Phone, Mail, Star, ShieldCheck, Lock, Search, X, CheckCircle, Navigation, CreditCard, QrCode, Sparkles, Check, IndianRupee, DollarSign, Loader2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { API_URL } from '../apiConfig';

// Fix for default Leaflet icon in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Helper component to auto-center map
function ChangeView({ center, zoom }) {
  const map = useMap();
  map.setView(center, zoom);
  return null;
}

export default function Marketplace() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const category = searchParams.get('category') || '';
  const location = searchParams.get('location') || '';
  
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalFound, setTotalFound] = useState(0);
  
  const [publicUser, setPublicUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('gomandap_public_user')); } catch { return null; }
  });
  
  const [authModal, setAuthModal] = useState(false);
  const [authForm, setAuthForm] = useState({ email: '', name: '' });
  
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState('growth');
  const [payMethod, setPayMethod] = useState('upi'); // 'upi' or 'card'
  const [checkoutStep, setCheckoutStep] = useState('store'); // 'store' | 'paying' | 'success'
  const [upiId, setUpiId] = useState('');
  const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvc: '', name: '' });
  const [processMsg, setProcessMsg] = useState('');

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    if (!publicUser) {
      setPaywallOpen(false);
      setAuthModal(true);
      return;
    }
    
    setCheckoutStep('paying');
    try {
      setProcessMsg('Connecting to secure payment gateway...');
      await new Promise(r => setTimeout(r, 1000));
      
      setProcessMsg(payMethod === 'upi' ? 'Authorizing transaction via UPI NPCI Switch...' : 'Authorizing credit card transaction via Stripe API...');
      await new Promise(r => setTimeout(r, 1500));
      
      setProcessMsg('Depositing credits securely to your account...');
      await new Promise(r => setTimeout(r, 1000));
      
      const pkgCredits = { starter: 100, growth: 500, enterprise: 2000 }[selectedPkg];
      const amount = payMethod === 'upi' 
        ? { starter: '₹499', growth: '₹1,999', enterprise: '₹4,999' }[selectedPkg]
        : { starter: '$9', growth: '$29', enterprise: '$79' }[selectedPkg];

      const res = await axios.post(`${API_URL}/public/buy-credits`, {
        userId: publicUser.id,
        creditsToAdd: pkgCredits,
        amount: amount
      });

      if (res.data.success) {
        const updatedUser = {
          ...publicUser,
          credits: res.data.user.credits
        };
        setPublicUser(updatedUser);
        localStorage.setItem('gomandap_public_user', JSON.stringify(updatedUser));
        setCheckoutStep('success');
      } else {
        throw new Error('Transaction rejected');
      }
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Payment simulation failed. Please try again.');
      setCheckoutStep('store');
    }
  };

  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]); // Default India

  // Live AI Demo State
  const [liveTerminal, setLiveTerminal] = useState(false);
  const [liveLogs, setLiveLogs] = useState([]);
  const [demoEventSource, setDemoEventSource] = useState(null);

  useEffect(() => {
    fetchVendors();
  }, [category, location]);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/vendors/public`, {
        params: { category, location, limit: 30 }
      });
      setVendors(res.data.results);
      setTotalFound(res.data.totalFound);
      
      // Calculate map center based on first vendor with coordinates
      const firstWithCoords = res.data.results.find(v => v.latitude && v.longitude);
      if (firstWithCoords) {
        setMapCenter([parseFloat(firstWithCoords.latitude), parseFloat(firstWithCoords.longitude)]);
      } else if (location) {
        // Fallback: Use nominatim to find the city center
        try {
          const locRes = await axios.get('https://nominatim.openstreetmap.org/search', {
            params: { q: location, format: 'json', limit: 1 }
          });
          if (locRes.data && locRes.data.length > 0) {
            setMapCenter([parseFloat(locRes.data[0].lat), parseFloat(locRes.data[0].lon)]);
          }
        } catch(e) {}
      }
    } catch (error) {
      console.error('Failed to fetch marketplace data', error);
    }
    setLoading(false);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/public/auth`, authForm);
      if (res.data.success) {
        setPublicUser(res.data.user);
        localStorage.setItem('gomandap_public_user', JSON.stringify(res.data.user));
        setAuthModal(false);
      }
    } catch (e) { alert("Failed to login/signup"); }
  };

  const startLiveDemo = async () => {
    try {
      setLiveTerminal(true);
      setLiveLogs(['[System] Initializing OmniLead AI Engine...', '[Geographic AI] Resolving semantic locations...']);
      
      const res = await axios.post(`${API_URL}/public/demo-scrape`, { category, location });
      if (res.data.success) {
        // Connect to SSE for live logs
        const es = new EventSource(`${API_URL}/logs/stream?userId=${publicUser?.id || 'demo'}`);
        setDemoEventSource(es);
        
        es.onmessage = (event) => {
          if (event.lastEventId === 'init' || event.type === 'init') return;
          try {
            const parsed = JSON.parse(event.data);
            if (Array.isArray(parsed)) {
               // Initial logs dump
            }
          } catch(e) {
            // It's a raw string log
            setLiveLogs(prev => [...prev.slice(-40), event.data]);
          }
        };

        es.addEventListener('vendor', (event) => {
           try {
             const data = JSON.parse(event.data);
             if (data.action === 'inserted' || data.action === 'updated') {
                // Instantly show on marketplace with blurred contact
                const newVendor = { ...data.vendor, isRevealed: false };
                setVendors(prev => [newVendor, ...prev.filter(v => v.id !== newVendor.id)]);
                setTotalFound(prev => prev + 1);
                if (newVendor.latitude && newVendor.longitude) {
                   setMapCenter([parseFloat(newVendor.latitude), parseFloat(newVendor.longitude)]);
                }
             }
           } catch(e) {}
        });
      }
    } catch (e) {
      alert("Demo initialization failed: " + (e.response?.data?.error || e.message));
      setLiveTerminal(false);
    }
  };

  useEffect(() => {
    return () => {
      if (demoEventSource) demoEventSource.close();
    };
  }, [demoEventSource]);

  useEffect(() => {
    const el = document.getElementById('demo-terminal');
    if (el) el.scrollTop = el.scrollHeight;
  }, [liveLogs]);

  const handleReveal = async (vendor) => {
    if (!publicUser) {
      return setAuthModal(true);
    }
    
    // Check credits locally first to save API call
    if (publicUser.credits <= 0 && !publicUser.unlockedLeads.includes(vendor.id)) {
      return setPaywallOpen(true);
    }

    try {
      const res = await axios.post(`${API_URL}/public/reveal`, {
        userId: publicUser.id,
        vendorId: vendor.id
      });
      
      if (res.data.success) {
        // Update local vendor data with real details
        setVendors(prev => prev.map(v => 
          v.id === vendor.id 
            ? { ...v, phone: res.data.contact.phone, email: res.data.contact.email, isRevealed: true } 
            : v
        ));
        
        // Update local user credits
        if (!publicUser.unlockedLeads.includes(vendor.id)) {
          const updatedUser = {
            ...publicUser,
            credits: publicUser.credits - 1,
            unlockedLeads: [...publicUser.unlockedLeads, vendor.id]
          };
          setPublicUser(updatedUser);
          localStorage.setItem('gomandap_public_user', JSON.stringify(updatedUser));
        }
      }
    } catch (e) {
      if (e.response?.status === 403) setPaywallOpen(true);
      else alert("Failed to reveal details");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg flex items-center justify-center">
            <Search size={16} className="text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight text-gray-900">Gomandap</span>
        </div>
        
        {/* Simple Search Header */}
        <div className="hidden md:flex items-center border border-gray-300 rounded-full px-4 py-2 bg-gray-50 shadow-inner w-1/2 max-w-2xl cursor-pointer hover:bg-white transition" onClick={() => navigate('/')}>
           <Search size={16} className="text-gray-400 mr-2" />
           <span className="text-gray-500 text-sm font-medium">{category || 'All Categories'}</span>
           <span className="mx-2 text-gray-300">|</span>
           <span className="text-gray-500 text-sm font-medium">{location || 'Everywhere'}</span>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/pricing')} className="text-sm font-bold text-gray-600 hover:text-violet-600 transition">Pricing</button>
          {publicUser ? (
            <div className="flex items-center gap-3">
              <div className="text-right hidden md:block">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Credits</p>
                <p className="text-sm font-black text-violet-600">{publicUser.credits} Left</p>
              </div>
              <button onClick={() => { setPublicUser(null); localStorage.removeItem('gomandap_public_user'); }} className="text-xs text-gray-400 hover:text-gray-600 underline">Logout</button>
            </div>
          ) : (
            <button onClick={() => setAuthModal(true)} className="text-sm font-bold text-white bg-gray-900 px-5 py-2 rounded-full hover:bg-gray-800 transition shadow-md">
              Sign In
            </button>
          )}
        </div>
      </header>
      {/* Main Content */}
      <div className="w-full max-w-[1400px] mx-auto py-8 px-6 flex flex-col md:flex-row gap-8 relative">
        
        {/* Left Pane: List */}
        <div className="w-full md:w-[55%] lg:w-[50%] flex flex-col bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          
          {/* SaaS CTA Banner */}
          <div className="bg-gradient-to-r from-violet-900 to-indigo-900 px-6 py-4 flex items-center justify-between shadow-inner">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20">
                 <Zap size={20} className="text-yellow-400" fill="currentColor" />
               </div>
               <div>
                 <h3 className="text-white font-bold text-sm">Want to run your own extractions?</h3>
                 <p className="text-violet-200 text-xs">Subscribe to the OmniLead AI Engine for $99/mo.</p>
               </div>
             </div>
             <button onClick={() => navigate('/pricing')} className="bg-white text-indigo-900 text-xs font-black px-4 py-2 rounded-lg hover:bg-gray-50 transition shadow-lg shadow-white/10">
               Get Access
             </button>
          </div>

          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">
                {category ? category : 'All Vendors'} {location ? `in ${location}` : ''}
              </h1>
              <p className="text-sm text-gray-500 mt-1 font-medium">
                Showing top {vendors.length} results of {totalFound > 30 ? '500+' : totalFound} found
              </p>
            </div>
            {vendors.length > 0 && (
              <button onClick={() => setPaywallOpen(true)} className="flex items-center gap-2 bg-green-50 text-green-700 border border-green-200 px-4 py-2 rounded-xl text-sm font-bold hover:bg-green-100 transition">
                <span>Export CSV</span>
                <Lock size={14} className="text-green-600" />
              </button>
            )}
          </div>

          {/* Live Terminal Overlay */}
          {liveTerminal && (
            <div className="bg-gray-900 p-4 border-b border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                  <span className="text-white text-xs font-bold font-mono uppercase tracking-widest">Live Extraction Terminal</span>
                </div>
                <button onClick={() => setLiveTerminal(false)} className="text-gray-500 hover:text-white">
                  <X size={16} />
                </button>
              </div>
              <div className="bg-black/50 rounded-xl p-3 h-48 overflow-y-auto font-mono text-[10px] sm:text-xs text-green-400 border border-white/5 shadow-inner" id="demo-terminal">
                {liveLogs.map((log, i) => (
                  <div key={i} className="mb-1 opacity-90 hover:opacity-100 break-words">{log}</div>
                ))}
              </div>
            </div>
          )}

          <div className="p-6 flex-1 bg-gray-50/50">
            {loading ? (
              <div className="flex flex-col gap-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-32 bg-gray-200 animate-pulse rounded-2xl"></div>
                ))}
              </div>
            ) : vendors.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search size={24} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">No results found in Database</h3>
                <p className="text-gray-500 mt-1 text-sm mb-6">Our database doesn't have these leads yet.</p>
                <button 
                  onClick={startLiveDemo}
                  className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black px-6 py-3 rounded-xl shadow-lg shadow-violet-600/20 hover:scale-105 transition flex items-center gap-2 mx-auto"
                >
                  <Zap size={18} fill="currentColor" /> Run Live AI Extraction
                </button>
                <p className="text-xs text-gray-400 mt-4">Watch the OmniLead Engine scrape the web in real-time.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {vendors.map((vendor, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={vendor.id} 
                    className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                          {vendor.name}
                          {vendor.tier === 'Premium' && <span className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">Sponsored</span>}
                        </h3>
                        <p className="text-sm text-gray-500 font-medium flex items-center gap-1.5 mt-1">
                          <MapPin size={14} className="text-violet-500" /> {vendor.address || vendor.city}
                        </p>
                      </div>
                      {vendor.rating && (
                        <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                          <span className="font-bold text-gray-900 text-sm">{vendor.rating}</span>
                          <Star size={14} className="text-yellow-400 fill-yellow-400" />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-4 mt-4 mb-5 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                        <Phone size={14} className="text-gray-400" />
                        <span className="blur-[2px] select-none text-gray-400">{vendor.phone}</span>
                        <Lock size={12} className="text-violet-500 ml-1" />
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                        <Mail size={14} className="text-gray-400" />
                        <span className="blur-[2px] select-none text-gray-400">{vendor.email || 'hid***@gmail.com'}</span>
                        <Lock size={12} className="text-violet-500 ml-1" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md">
                        <ShieldCheck size={14} /> Verified Vendor
                      </div>
                      <button 
                        onClick={() => handleReveal(vendor)}
                        disabled={vendor.isRevealed}
                        className={`px-5 py-2.5 rounded-xl font-bold text-sm transition shadow-md ${
                          vendor.isRevealed 
                            ? 'bg-green-100 text-green-700 cursor-default shadow-none' 
                            : 'bg-gray-900 text-white hover:bg-gray-800 shadow-gray-900/20 active:scale-95'
                        }`}
                      >
                        {vendor.isRevealed ? 'Unlocked' : 'Reveal Contact'}
                      </button>
                    </div>
                  </motion.div>
                ))}

                {/* Paywall Banner at Bottom */}
                {totalFound > 30 && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="mt-8 mb-12 p-8 bg-gradient-to-br from-violet-900 to-indigo-900 rounded-3xl text-center text-white shadow-xl shadow-violet-900/20 relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
                    <Lock size={40} className="mx-auto text-violet-300 mb-4" />
                    <h2 className="text-2xl font-black mb-2 tracking-tight">Unlock 500+ More Leads</h2>
                    <p className="text-violet-200 text-sm mb-6 max-w-sm mx-auto">
                      You are viewing the top 30 free results. Upgrade to Premium to instantly unlock unmasked contact details for {totalFound} verified vendors in this area.
                    </p>
                    <button 
                      onClick={() => setPaywallOpen(true)}
                      className="bg-white text-indigo-900 font-black px-8 py-3.5 rounded-xl hover:scale-105 transition-transform shadow-lg"
                    >
                      View Pricing Plans
                    </button>
                  </motion.div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Map */}
        <div className="hidden md:block md:w-[45%] lg:w-[50%] h-[calc(100vh-120px)] sticky top-[100px] bg-gray-100 rounded-3xl overflow-hidden border border-gray-200 shadow-xl shadow-gray-200/50 z-0">
           <MapContainer center={mapCenter} zoom={12} style={{ height: '100%', width: '100%' }}>
             <ChangeView center={mapCenter} zoom={12} />
             <TileLayer
               attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
               url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
             />
             {vendors.map(vendor => {
               if (vendor.latitude && vendor.longitude) {
                 return (
                   <Marker key={vendor.id} position={[parseFloat(vendor.latitude), parseFloat(vendor.longitude)]}>
                     <Popup>
                       <div className="font-sans">
                         <h3 className="font-bold text-gray-900 text-sm">{vendor.name}</h3>
                         <p className="text-xs text-gray-500 mt-1">{vendor.category}</p>
                         <button onClick={() => handleReveal(vendor)} className="mt-2 w-full bg-violet-600 text-white text-xs font-bold py-1.5 rounded">
                           {vendor.isRevealed ? 'Unlocked' : 'Reveal Details'}
                         </button>
                       </div>
                     </Popup>
                   </Marker>
                 );
               }
               return null;
             })}
           </MapContainer>
           
           <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-gray-200 text-xs font-bold text-gray-600 flex items-center gap-2 z-[400]">
             <Navigation size={14} className="text-violet-600" /> Map updates automatically
           </div>
        </div>
      </div>

      {/* Auth Modal */}
      <AnimatePresence>
        {authModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative"
            >
              <button onClick={() => setAuthModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-full p-2 transition">
                <X size={16} />
              </button>
              
              <div className="px-8 pt-8 pb-6 bg-gradient-to-b from-gray-50 to-white border-b border-gray-100">
                <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center mb-4 border border-indigo-200">
                  <Lock size={20} className="text-indigo-600" />
                </div>
                <h2 className="text-2xl font-extrabold text-gray-900 leading-tight mb-1">Create Free Account</h2>
                <p className="text-sm text-gray-500 font-medium">Get <span className="font-bold text-violet-600">20 Free Credits</span> to instantly reveal verified vendor phone numbers and emails.</p>
              </div>

              <div className="p-8">
                <form onSubmit={handleAuth} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Your Name</label>
                    <input type="text" required value={authForm.name} onChange={e => setAuthForm({...authForm, name: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 outline-none transition" placeholder="John Doe" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Email Address</label>
                    <input type="email" required value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 outline-none transition" placeholder="john@example.com" />
                  </div>
                  <button type="submit" className="w-full mt-2 bg-gradient-to-r from-gray-900 to-gray-800 text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition shadow-lg shadow-gray-900/20 active:scale-[0.98]">
                    Claim 20 Free Credits
                  </button>
                  <p className="text-center text-xs text-gray-400 mt-2">By continuing, you agree to our Terms & Conditions.</p>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Paywall / Checkout Modal */}
      <AnimatePresence>
        {paywallOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg shadow-2xl relative"
            >
              {checkoutStep === 'store' && (
                <div className="bg-white rounded-3xl overflow-hidden relative">
                  <button onClick={() => { setPaywallOpen(false); setCheckoutStep('store'); }} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 bg-gray-100 rounded-full p-2 z-10"><X size={16} /></button>
                  
                  <div className="bg-gradient-to-br from-violet-900 to-indigo-900 p-8 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
                    <Sparkles size={36} className="mx-auto text-violet-300 mb-2 relative z-10 animate-pulse" />
                    <h2 className="text-2xl font-black text-white relative z-10 font-display">Premium Credit Store</h2>
                    <p className="text-violet-200 text-xs mt-1 relative z-10">Purchase credits to unlock direct contact details and export leads.</p>
                  </div>

                  <div className="p-6">
                    {/* Package Cards */}
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Select Credit Package</label>
                    <div className="grid grid-cols-3 gap-3 mb-5">
                      {[
                        { id: 'starter', label: 'Starter', qty: 100, inr: '₹499', usd: '$9' },
                        { id: 'growth', label: 'Growth', qty: 500, inr: '₹1,999', usd: '$29', popular: true },
                        { id: 'enterprise', label: 'Enterprise', qty: 2000, inr: '₹4,999', usd: '$79' }
                      ].map(pkg => (
                        <button
                          key={pkg.id}
                          type="button"
                          onClick={() => setSelectedPkg(pkg.id)}
                          className={`relative p-3 rounded-2xl border text-left flex flex-col transition-all cursor-pointer ${
                            selectedPkg === pkg.id 
                              ? 'border-violet-600 bg-violet-50/50 shadow-md ring-2 ring-violet-500/20' 
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                        >
                          {pkg.popular && (
                            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-violet-600 text-[9px] font-black text-white rounded-full uppercase tracking-wider scale-90 whitespace-nowrap">
                              Best Value
                            </span>
                          )}
                          <span className="text-xs font-extrabold text-gray-800">{pkg.label}</span>
                          <span className="text-lg font-black text-violet-600 mt-1">{pkg.qty}</span>
                          <span className="text-[10px] text-gray-400 font-medium">credits</span>
                          <span className="text-xs font-black text-gray-900 mt-2">
                            {payMethod === 'upi' ? pkg.inr : pkg.usd}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Payment Method Selector Tabs */}
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Select Payment Method</label>
                    <div className="flex gap-2 p-1.5 bg-gray-100 rounded-xl mb-5">
                      <button 
                        type="button"
                        onClick={() => { setPayMethod('upi'); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          payMethod === 'upi' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                        }`}
                      >
                        <QrCode size={14} className="text-violet-600" />
                        <span>India (UPI / QR)</span>
                      </button>
                      <button 
                        type="button"
                        onClick={() => { setPayMethod('card'); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          payMethod === 'card' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                        }`}
                      >
                        <CreditCard size={14} className="text-violet-600" />
                        <span>World (Stripe / Card)</span>
                      </button>
                    </div>

                    {/* Form fields */}
                    <form onSubmit={handleCheckoutSubmit} className="space-y-4">
                      {payMethod === 'upi' ? (
                        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex flex-col items-center">
                          <div className="w-32 h-32 bg-white border border-gray-200 rounded-xl flex flex-col items-center justify-center p-2 mb-3 relative shadow-inner">
                            {/* Dynamic QR Simulation */}
                            <svg className="w-full h-full text-gray-800" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <rect width="100" height="100" fill="white" />
                              <rect x="10" y="10" width="20" height="20" fill="currentColor" />
                              <rect x="15" y="15" width="10" height="10" fill="white" />
                              <rect x="70" y="10" width="20" height="20" fill="currentColor" />
                              <rect x="75" y="15" width="10" height="10" fill="white" />
                              <rect x="10" y="70" width="20" height="20" fill="currentColor" />
                              <rect x="15" y="75" width="10" height="10" fill="white" />
                              {/* Random dot grid simulating QR code */}
                              <rect x="40" y="40" width="10" height="10" fill="currentColor" />
                              <rect x="55" y="55" width="10" height="15" fill="currentColor" />
                              <rect x="40" y="70" width="15" height="5" fill="currentColor" />
                              <rect x="70" y="40" width="10" height="10" fill="currentColor" />
                              <rect x="80" y="70" width="10" height="20" fill="currentColor" />
                              <rect x="50" y="10" width="5" height="15" fill="currentColor" />
                              <rect x="10" y="40" width="15" height="5" fill="currentColor" />
                              <rect x="40" y="25" width="20" height="5" fill="currentColor" />
                            </svg>
                            <div className="absolute inset-0 bg-black/5 flex items-center justify-center text-[10px] font-black text-gray-500 rounded-xl select-none">SCAN QR</div>
                          </div>
                          <p className="text-[10px] text-center text-gray-500 font-medium mb-3">Scan the code using GPay, PhonePe, Paytm, or BHIM apps</p>
                          
                          <div className="w-full">
                            <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wide mb-1">Or Enter UPI ID</label>
                            <input
                              type="text"
                              required
                              value={upiId}
                              onChange={e => setUpiId(e.target.value)}
                              placeholder="e.g. mobile-number@ybl"
                              className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:border-violet-500 outline-none transition"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wide mb-1">Cardholder Name</label>
                            <input
                              type="text"
                              required
                              value={cardDetails.name}
                              onChange={e => setCardDetails({ ...cardDetails, name: e.target.value })}
                              placeholder="Manoj Kumar"
                              className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:border-violet-500 outline-none transition"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wide mb-1">Card Number</label>
                            <input
                              type="text"
                              required
                              value={cardDetails.number}
                              onChange={e => setCardDetails({ ...cardDetails, number: e.target.value })}
                              placeholder="4242 4242 4242 4242"
                              className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:border-violet-500 outline-none transition"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wide mb-1">Expiry Date</label>
                              <input
                                type="text"
                                required
                                value={cardDetails.expiry}
                                onChange={e => setCardDetails({ ...cardDetails, expiry: e.target.value })}
                                placeholder="MM / YY"
                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:border-violet-500 outline-none transition"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wide mb-1">CVC / CVV</label>
                              <input
                                type="password"
                                required
                                value={cardDetails.cvc}
                                onChange={e => setCardDetails({ ...cardDetails, cvc: e.target.value })}
                                placeholder="•••"
                                maxLength="4"
                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:border-violet-500 outline-none transition"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black py-4 rounded-xl hover:opacity-95 transition shadow-lg shadow-violet-200 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 text-sm"
                      >
                        <ShieldCheck size={16} />
                        <span>Pay {{ starter: '₹499', growth: '₹1,999', enterprise: '₹4,999' }[selectedPkg]} via {payMethod === 'upi' ? 'UPI' : 'Card'}</span>
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {checkoutStep === 'paying' && (
                <div className="bg-white rounded-3xl overflow-hidden shadow-2xl p-10 text-center flex flex-col items-center">
                  <Loader2 size={48} className="text-violet-600 animate-spin mb-6" />
                  <h3 className="text-lg font-black text-gray-900">Processing Secure Payment</h3>
                  <p className="text-sm text-gray-500 mt-2 max-w-xs">{processMsg}</p>
                </div>
              )}

              {checkoutStep === 'success' && (
                <div className="bg-white rounded-3xl overflow-hidden shadow-2xl p-10 text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
                    <Check size={32} className="text-green-600 animate-bounce" />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900">Payment Successful</h3>
                  <p className="text-sm text-gray-500 mt-2">
                    Successfully credited <strong className="text-violet-600 text-base">{{ starter: 100, growth: 500, enterprise: 2000 }[selectedPkg]} credits</strong> to your account.
                  </p>
                  
                  <button 
                    onClick={() => { setPaywallOpen(false); setCheckoutStep('store'); }}
                    className="w-full mt-8 bg-gray-900 text-white font-black py-3 rounded-xl hover:bg-gray-800 transition active:scale-[0.98] cursor-pointer"
                  >
                    Start Unlocking Leads
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
