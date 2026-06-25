import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, Download, RefreshCw, Phone, Mail, Camera,
  MapPin, Star, CheckCircle2, XCircle, Trash2, X, ChevronDown,
  Users, Database, TrendingUp, Map, List, FolderOpen,
  ExternalLink, Globe, Send, ArrowRight, Eye
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useScraper } from '../../context/ScraperContext';

// Fix Leaflet's default icon path issues
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const STATUS_COLORS = {
  New: 'bg-gray-100 text-gray-600 border-gray-200',
  Contacted: 'bg-blue-50 text-blue-600 border-blue-100',
  Interested: 'bg-green-50 text-green-600 border-green-100',
  Closed: 'bg-violet-50 text-violet-600 border-violet-100',
  NotInterested: 'bg-red-50 text-red-500 border-red-100',
};

export default function LeadsPage() {
  const {
    grouped, filteredVendors, displayedVendors,
    stagingVendorsWithPhones, stagingVendorsNoPhones, liveVendors,
    vendors, activeTab, setActiveTab,
    searchFilter, setSearchFilter,
    selectedCity, setSelectedCity, cities,
    fetchVendors, handleVerify, handleDelete, handleAssign,
    exportToCSV, exportCategoryCSV, clearQueue,
    employees, activeJobs, loading, handleUpdateJob,
    selectedFolder, setSelectedFolder,
    selectedJobCategory, setSelectedJobCategory,
    grouped: groupedData,
    handleUnlock
  } = useScraper();

  const [view, setView] = useState('folders'); // 'folders' | 'list' | 'map'
  const [selectedVendor, setSelectedVendor] = useState(null);
  const mapRef = useRef(null);

  const tabs = [
    { id: 'staging-phones', label: 'Ready Leads', count: stagingVendorsWithPhones?.length || 0, color: 'green' },
    { id: 'staging-nophones', label: 'No Contact', count: stagingVendorsNoPhones?.length || 0, color: 'amber' },
    { id: 'pushed', label: 'Live Database', count: liveVendors?.length || 0, color: 'violet' },
  ];

  const mapVendors = (filteredVendors || [])
    .filter(v => (v.lat && v.lng) || (v.latitude && v.longitude))
    .map(v => ({...v, safeLat: v.lat || v.latitude, safeLng: v.lng || v.longitude}))
    .slice(0, 50);

  // Component to automatically fit bounds to the markers
  const MapBounds = ({ vendors }) => {
    const map = useMap();
    useEffect(() => {
      if (vendors.length > 0) {
        const bounds = L.latLngBounds(vendors.map(v => [v.safeLat, v.safeLng]));
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      }
    }, [vendors, map]);
    return null;
  };

  const getCityFromFilter = () => selectedCity !== 'All' ? selectedCity : 'India';

  return (
    <div className="min-h-full bg-[#f7f8fa]">

      {/* ── PAGE HEADER ── */}
      <div className="bg-white border-b border-gray-100 px-8 py-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Leads Pipeline</h1>
            <p className="text-sm text-gray-500 mt-0.5">Review, verify, and manage all extracted business contacts</p>
          </div>
          <div className="flex items-center gap-3">
            {/* View toggles */}
            <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1">
              {[
                { id: 'folders', icon: <FolderOpen size={14} />, label: 'Folders' },
                { id: 'list', icon: <List size={14} />, label: 'List' },
                { id: 'map', icon: <Map size={14} />, label: 'Map' },
              ].map(v => (
                <button key={v.id} onClick={() => setView(v.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${view === v.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  {v.icon} {v.label}
                </button>
              ))}
            </div>
            <button onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-gray-700 bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-all">
              <Download size={15} /> Export CSV
            </button>
            <button onClick={clearQueue}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-red-600 bg-red-50 border border-red-100 hover:bg-red-100 transition-all">
              <Trash2 size={15} /> Clear Queue
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-6 space-y-6">

        {/* ── TAB BAR ── */}
        <div className="flex items-center gap-1 bg-white rounded-2xl border border-gray-100 p-1.5 shadow-sm">
          {tabs.map(tab => {
            const active = activeTab === tab.id;
            const colors = {
              green: active ? 'bg-green-50 text-green-700 border border-green-100' : 'hover:bg-gray-50 text-gray-500',
              amber: active ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'hover:bg-gray-50 text-gray-500',
              violet: active ? 'bg-violet-50 text-violet-700 border border-violet-100' : 'hover:bg-gray-50 text-gray-500',
            };
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${colors[tab.color]}`}>
                {tab.label}
                <span className={`text-xs px-2 py-0.5 rounded-full font-black ${active ? 'bg-white shadow-sm' : 'bg-gray-100'}`}>
                  {tab.count.toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── FILTERS BAR ── */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input type="text" value={searchFilter} onChange={e => setSearchFilter(e.target.value)}
              placeholder="Filter by name, phone, category..."
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-100 rounded-xl text-sm font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-50 transition-all shadow-sm" />
          </div>
          <select value={selectedCity} onChange={e => setSelectedCity(e.target.value)}
            className="px-4 py-2.5 bg-white border border-gray-100 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:border-violet-300 shadow-sm">
            {(cities || ['All']).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={fetchVendors}
            className="p-2.5 bg-white border border-gray-100 rounded-xl text-gray-500 hover:text-violet-600 hover:border-violet-200 transition-all shadow-sm">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <div className="text-xs font-semibold text-gray-400 ml-auto">
            {filteredVendors?.length?.toLocaleString() || 0} results
          </div>
        </div>

        {/* ── VIEWS ── */}

        {/* FOLDER VIEW */}
        {view === 'folders' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Object.entries(groupedData || {}).length === 0 ? (
              <div className="col-span-4 py-24 flex flex-col items-center text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
                <Database size={48} className="mb-4 opacity-20" />
                <p className="font-bold">No leads found</p>
                <p className="text-sm mt-1">Start a search from the Scraper page to extract leads</p>
                <a href="/app/overview" className="mt-4 btn-3d btn-primary btn-sm flex items-center gap-2">
                  Go to Scraper <ArrowRight size={14} />
                </a>
              </div>
            ) : (
              Object.entries(groupedData).sort((a, b) => b[1].length - a[1].length).map(([cat, items]) => {
                const verified = items.filter(v => v.verified).length;
                const withPhone = items.filter(v => v.phone && v.phone.length > 5).length;
                const isRunning = activeJobs?.some(j => j.category === cat && j.status === 'running');
                return (
                  <motion.div key={cat} layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                    onClick={() => setSelectedFolder(cat)}
                    className="glass-card group p-5 cursor-pointer transition-all hover:bg-white/5 relative overflow-hidden"
                    style={{ borderColor: 'rgba(124,58,237,0.15)', boxShadow: '0 0 0 1px rgba(124,58,237,0.1), 0 8px 24px rgba(0,0,0,0.4)' }}>
                    {isRunning && (
                      <div className="absolute top-3 right-3 flex items-center gap-1.5 badge badge-emerald px-2 py-0.5" style={{ fontSize: 9 }}>
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
                      </div>
                    )}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg flex-shrink-0"
                        style={{ background: 'rgba(124,58,237,0.2)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.3)' }}>
                        {cat[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-white text-sm truncate leading-tight" title={cat}>{cat}</p>
                        <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{isRunning ? 'Actively extracting...' : 'Click to view leads'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-xl p-2.5 text-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <p className="text-lg font-black text-white">{items.length}</p>
                        <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Total</p>
                      </div>
                      <div className="rounded-xl p-2.5 text-center" style={{ background: 'rgba(16,185,129,0.05)' }}>
                        <p className="text-lg font-black" style={{ color: '#10b981' }}>{withPhone}</p>
                        <p className="text-[10px]" style={{ color: 'rgba(16,185,129,0.5)' }}>Phones</p>
                      </div>
                      <div className="rounded-xl p-2.5 text-center" style={{ background: 'rgba(124,58,237,0.05)' }}>
                        <p className="text-lg font-black" style={{ color: '#a78bfa' }}>{verified}</p>
                        <p className="text-[10px]" style={{ color: 'rgba(124,58,237,0.5)' }}>Verified</p>
                      </div>
                    </div>
                    <button onClick={e => { e.stopPropagation(); exportCategoryCSV(cat, items); }}
                      className="mt-3 w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100"
                      style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
                      onMouseOver={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.2)'; e.currentTarget.style.color = '#fff'; }}
                      onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}>
                      <Download size={12} /> Export CSV
                    </button>
                  </motion.div>
                );
              })
            )}
          </div>
        )}

        {/* LIST VIEW */}
        {view === 'list' && (
          <div className="glass-card p-4 space-y-3">
            {(filteredVendors || []).length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
                <Database size={40} className="mb-4 opacity-20" />
                <p className="font-bold">No leads to display</p>
              </div>
            ) : (
              (filteredVendors || []).map((vendor, idx) => (
                <VendorCard key={vendor.id || idx} vendor={vendor} employees={employees || []}
                  onVerify={handleVerify} onDelete={handleDelete} onAssign={handleAssign}
                  onUnlock={handleUnlock}
                  onClick={() => setSelectedVendor(vendor)} />
              ))
            )}
          </div>
        )}

        {/* MAP VIEW */}
        {view === 'map' && (
          <div className="glass-card overflow-hidden" style={{ background: '#0f0f15', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)' }}>
                  <Map size={14} style={{ color: '#a78bfa' }} />
                </div>
                <div>
                  <p className="font-bold text-white text-sm">Geographic Distribution</p>
                  <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{mapVendors.length} leads with location data shown</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedCity !== 'All' && (
                  <span className="badge bg-violet-500/10 text-violet-400 border border-violet-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
                    📍 {selectedCity}
                  </span>
                )}
                <button onClick={() => setSelectedCity('All')} className="text-xs transition-colors" style={{ color: 'rgba(255,255,255,0.4)' }} onMouseOver={e => e.currentTarget.style.color = '#fff'} onMouseOut={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}>
                  View All Cities
                </button>
              </div>
            </div>

            {/* react-leaflet MapContainer */}
            <div className="relative w-full h-[480px] group">
              {/* Custom Map Controls */}
              <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setAutoCenter(true)} className="p-2 rounded-xl border transition-all" style={{ background: 'rgba(6,8,18,0.8)', borderColor: 'rgba(255,255,255,0.1)', color: '#a78bfa' }} title="Recenter Map">
                  <MapPin size={18} />
                </button>
              </div>

              {mapVendors.length > 0 ? (
                <MapContainer 
                  center={[mapVendors[0].safeLat, mapVendors[0].safeLng]} 
                  zoom={11} 
                  style={{ width: '100%', height: '100%', background: '#0a0a0f' }} 
                  zoomControl={false}
                  preferCanvas={true}
                  onMoveStart={() => setAutoCenter(false)}
                >
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='' />
                  <MapBounds vendors={mapVendors} autoCenter={autoCenter} />
                  <MarkerClusterGroup chunkedLoading maxClusterRadius={40}>
                    {mapVendors.map((vendor, i) => (
                      <Marker key={i} position={[vendor.safeLat, vendor.safeLng]}>
                        <Popup className="dark-popup">
                          <div className="p-1" style={{ fontSize: 11, background: '#1a1a2e', color: '#fff' }}>
                            <p className="font-bold text-white mb-1">{vendor.name}</p>
                            <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 2 }}>{vendor.category}</p>
                            {vendor.phone && <p style={{ color: '#10b981', fontWeight: 'bold' }}>{vendor.phone}</p>}
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MarkerClusterGroup>
                </MapContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)', color: 'rgba(255,255,255,0.3)' }}>
                  <p>No map data available for current leads</p>
                </div>
              )}
              
              {/* Overlay cards for leads */}
              <div className="absolute top-4 right-4 max-h-80 overflow-y-auto space-y-2 w-64 z-[400]" style={{ scrollbarWidth: 'thin' }}>
                {(filteredVendors || []).slice(0, 10).map((vendor, i) => (
                  <div key={i} onClick={() => setSelectedVendor(vendor)}
                    className="glass-card p-3 cursor-pointer transition-all hover:bg-white/5" style={{ background: 'rgba(6,8,18,0.85)' }}>
                    <p className="font-bold text-white text-xs truncate">{vendor.name}</p>
                    <p className="text-[10px] flex items-center gap-1 mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      <MapPin size={9} /> {vendor.city} · {vendor.category}
                    </p>
                    {vendor.phone && !vendor.isLocked && (
                      <p className="text-[10px] font-semibold mt-0.5 flex items-center gap-1" style={{ color: '#10b981' }}>
                        <Phone size={9} /> {vendor.phone}
                      </p>
                    )}
                    {vendor.isLocked && (
                      <p className="text-[10px] font-semibold mt-0.5 flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        <Phone size={9} /> Hidden (Locked)
                      </p>
                    )}
                  </div>
                ))}
                {(filteredVendors || []).length > 10 && (
                  <div className="rounded-xl p-3 text-center text-xs font-bold border z-[400]" style={{ background: 'rgba(124,58,237,0.1)', color: '#a78bfa', borderColor: 'rgba(124,58,237,0.3)' }}>
                    +{(filteredVendors.length - 10).toLocaleString()} more leads
                  </div>
                )}
                {(filteredVendors || []).length === 0 && (
                  <div className="rounded-xl p-4 text-center text-xs border z-[400]" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)', borderColor: 'rgba(255,255,255,0.1)' }}>
                    No leads for current filter
                  </div>
                )}
              </div>
            </div>

            {/* City distribution */}
            <div className="p-6" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-[9px] font-black uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>Leads by City</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(
                  (filteredVendors || []).reduce((acc, v) => { if (v.city) { acc[v.city] = (acc[v.city] || 0) + 1; } return acc; }, {})
                ).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([city, count]) => (
                  <button key={city} onClick={() => setSelectedCity(city)}
                    className="p-3 rounded-xl text-left border transition-all"
                    style={{
                      background: selectedCity === city ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.02)',
                      borderColor: selectedCity === city ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.05)'
                    }}>
                    <p className="text-sm font-bold truncate" style={{ color: selectedCity === city ? '#fff' : 'rgba(255,255,255,0.7)' }}>{city}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{count} leads</p>
                    <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                      <div className="h-full rounded-full" style={{ background: '#7c3aed', width: `${Math.min(100, count / (filteredVendors?.length || 1) * 300)}%` }} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── FOLDER DETAIL MODAL ── */}
      <AnimatePresence>
        {selectedFolder && (
          <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }} onClick={() => setSelectedFolder(null)}>
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-2xl h-full flex flex-col" style={{ background: 'rgba(6,8,18,0.98)', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
              {/* Header */}
              <div className="px-6 py-5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <h2 className="font-black text-white text-lg">{selectedFolder}</h2>
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>{groupedData?.[selectedFolder]?.length || 0} leads extracted</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => exportCategoryCSV(selectedFolder, groupedData?.[selectedFolder])}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-white/5 border border-white/10 hover:bg-white/10">
                    <Download size={13} /> Export
                  </button>
                  <button onClick={() => setSelectedFolder(null)} className="p-2 rounded-xl transition-all hover:bg-white/5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    <X size={18} />
                  </button>
                </div>
              </div>
              {/* List */}
              <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                {(() => {
                  const folderVendors = groupedData?.[selectedFolder] || [];
                  const withContact = folderVendors.filter(v => v.phone && v.phone.length > 5 && !v.phone.includes('Requires'));
                  const noContact = folderVendors.filter(v => !v.phone || v.phone.length <= 5 || v.phone.includes('Requires'));

                  if (folderVendors.length === 0) {
                    return (
                      <div className="py-16 text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        <FolderOpen size={40} className="mx-auto mb-4 opacity-20" />
                        <p>No leads in this folder</p>
                      </div>
                    );
                  }

                  const folderVendorsList = [...withContact, ...noContact];
                  return (
                    <div className="h-full w-full relative">
                      <h3 className="font-bold flex items-center gap-2 mb-3 text-sm text-white">
                        <span className="w-2 h-2 rounded-full" style={{ background: '#a78bfa', boxShadow: '0 0 10px rgba(124,58,237,0.5)' }}></span> 
                        Total Leads ({folderVendorsList.length})
                      </h3>
                      <div className="space-y-3">
                        {folderVendorsList.map((vendor, idx) => (
                          <VendorCard key={vendor.id || idx} vendor={vendor} employees={employees || []}
                            onVerify={handleVerify} onDelete={handleDelete} onAssign={handleAssign}
                            onUnlock={handleUnlock}
                            onClick={() => setSelectedVendor(vendor)} />
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── VENDOR DETAIL PANEL ── */}
      <AnimatePresence>
        {selectedVendor && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }} onClick={() => setSelectedVendor(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="glass-card max-w-lg w-full shadow-2xl overflow-hidden" style={{ background: 'rgba(6,8,18,0.95)' }}>
              <div className="p-6 flex items-start justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-4">
                  {(selectedVendor.avatar || (selectedVendor.images && selectedVendor.images.length > 0)) ? (
                    <img src={selectedVendor.avatar || selectedVendor.images[0]} alt={selectedVendor.name} className="w-16 h-16 rounded-2xl object-cover flex-shrink-0" style={{ border: '1px solid rgba(255,255,255,0.1)' }} onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedVendor.name || 'Vendor')}&background=ede9fe&color=7c3aed`; }} />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(109,40,217,0.2))', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.3)' }}>
                      {selectedVendor.name?.[0] || '?'}
                    </div>
                  )}
                  <div>
                    <h3 className="font-black text-white text-lg">{selectedVendor.name}</h3>
                    <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{selectedVendor.category} · {selectedVendor.city}</p>
                    {selectedVendor.rating && (
                      <div className="flex items-center gap-1 mt-1">
                        <Star size={12} className="text-amber-400 fill-amber-400" />
                        <span className="text-xs font-bold text-amber-500">{selectedVendor.rating}</span>
                      </div>
                    )}
                  </div>
                </div>
                <button onClick={() => setSelectedVendor(null)} className="p-2 rounded-xl transition-all hover:bg-white/5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                
                {/* Images Carousel / Grid */}
                {selectedVendor.images && selectedVendor.images.length > 0 && (
                  <div className="mb-4">
                    <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>Vendor Photos</p>
                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                      {selectedVendor.images.map((img, i) => (
                        <img key={i} src={img} alt={`Vendor ${i}`} className="h-24 w-24 object-cover rounded-xl flex-shrink-0" style={{ border: '1px solid rgba(255,255,255,0.1)' }} onError={(e) => { e.target.style.display = 'none'; }} />
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {selectedVendor.phone && !selectedVendor.isLocked && (
                    <ContactRow icon={<Phone size={15} />} label="Phone" value={selectedVendor.phone} color="green" />
                  )}
                  {selectedVendor.isLocked && (
                    <ContactRow icon={<Phone size={15} />} label="Phone" value="Hidden (Locked)" color="gray" />
                  )}
                {selectedVendor.email && (
                  <ContactRow icon={<Mail size={15} />} label="Email" value={selectedVendor.email} color="blue" />
                )}
                {selectedVendor.Camera && (
                  <ContactRow icon={<Camera size={15} />} label="Camera" value={selectedVendor.Camera} color="pink" />
                )}
                {selectedVendor.address && (
                  <ContactRow icon={<MapPin size={15} />} label="Address" value={selectedVendor.address} color="gray" />
                )}
                {selectedVendor.mapsLink && (
                  <a href={selectedVendor.mapsLink} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-colors" style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }}>
                    <Globe size={15} /> Open in Maps <ExternalLink size={12} className="ml-auto" />
                  </a>
                )}
                </div>
              </div>
              <div className="px-6 pb-6 flex gap-3">
                {selectedVendor.isLocked ? (
                  <button onClick={() => { handleUnlock(selectedVendor.id); setSelectedVendor(null); }}
                    className="w-full flex py-3 rounded-xl text-sm font-black transition-all border items-center justify-center gap-2 shadow-xl"
                    style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.8), rgba(168,85,247,0.8))', color: '#fff', border: '1px solid rgba(168,85,247,0.5)', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                    <Globe size={15} /> Unlock Contact (-1 Credit)
                  </button>
                ) : (
                  <button onClick={() => { handleDelete(selectedVendor.id); setSelectedVendor(null); }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 ml-auto">
                    <Trash2 size={15} /> Remove from Leads
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ContactRow({ icon, label, value, color }) {
  const colorMap = {
    green: { bg: 'rgba(16,185,129,0.1)', text: '#34d399', border: 'rgba(16,185,129,0.2)' },
    blue: { bg: 'rgba(59,130,246,0.1)', text: '#60a5fa', border: 'rgba(59,130,246,0.2)' },
    pink: { bg: 'rgba(236,72,153,0.1)', text: '#f472b6', border: 'rgba(236,72,153,0.2)' },
    gray: { bg: 'rgba(255,255,255,0.05)', text: 'rgba(255,255,255,0.7)', border: 'rgba(255,255,255,0.1)' },
  };
  const theme = colorMap[color] || colorMap.gray;
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}` }}>
      {icon}
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-black uppercase tracking-wider opacity-60">{label}</p>
        <p className="text-sm font-semibold truncate text-white">{value}</p>
      </div>
    </div>
  );
}

function VendorCard({ vendor, employees, onVerify, onDelete, onAssign, onUnlock, onClick }) {
  return (
    <div onClick={onClick}
      className="glass-card group p-4 cursor-pointer transition-all hover:bg-white/5" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
      <div className="flex gap-4">
        {(vendor.avatar || (vendor.images && vendor.images.length > 0)) ? (
          <img src={vendor.avatar || vendor.images[0]} alt={vendor.name} className="w-14 h-14 rounded-2xl object-cover flex-shrink-0" style={{ border: '1px solid rgba(255,255,255,0.1)' }} onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(vendor.name || 'Vendor')}&background=ede9fe&color=7c3aed`; }} />
        ) : (
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl flex-shrink-0" style={{ background: 'rgba(124,58,237,0.2)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.3)' }}>
            {vendor.name?.[0] || '?'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-white truncate text-sm">{vendor.name}</p>
            {vendor.verified && <CheckCircle2 size={13} className="flex-shrink-0" style={{ color: '#10b981' }} />}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{vendor.category}</span>
            {vendor.city && <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>}
            {vendor.city && <span className="text-xs flex items-center gap-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}><MapPin size={9} />{vendor.city}</span>}
            {vendor.rating && <span className="text-xs flex items-center gap-0.5 text-amber-400"><Star size={9} />{vendor.rating}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {vendor.phone && !vendor.isLocked && (
            <span className="badge badge-emerald flex items-center gap-1">
              <Phone size={10} /> {vendor.phone.length > 13 ? vendor.phone.slice(0, 13) + '...' : vendor.phone}
            </span>
          )}
          {vendor.isLocked && (
             <span className="badge flex items-center gap-1" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
               <Phone size={10} /> Hidden
             </span>
          )}
          {vendor.email && (
            <span className="badge badge-blue flex items-center gap-1">
              <Mail size={10} />
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
          {vendor.isLocked ? (
             <button onClick={() => onUnlock(vendor.id)}
               className="btn-3d btn-primary btn-sm py-1.5 px-3 flex items-center gap-1" style={{ fontSize: '10px' }}>
               Unlock
             </button>
          ) : (
            <button onClick={() => onDelete(vendor.id)}
              className="p-1.5 rounded-lg transition-colors" style={{ color: 'rgba(255,255,255,0.3)' }}
              onMouseOver={e => { e.currentTarget.style.color = '#f43f5e'; e.currentTarget.style.background = 'rgba(244,63,94,0.1)'; }}
              onMouseOut={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; e.currentTarget.style.background = 'transparent'; }}
              title="Remove from Leads">
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


