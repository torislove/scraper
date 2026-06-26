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
import { FixedSizeList as VirtualList } from 'react-window';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

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
    grouped: groupedData
  } = useScraper();

  const [view, setView] = useState('table'); // 'table' only
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
            <AnimatedExcelExport vendors={filteredVendors || []} />
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
          
          <select value={selectedFolder || 'All'} onChange={e => setSelectedFolder(e.target.value === 'All' ? null : e.target.value)}
            className="px-4 py-2.5 bg-white border border-gray-100 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:border-violet-300 shadow-sm">
            <option value="All">All Search Campaigns</option>
            {Array.from(new Set((vendors || []).map(v => v.sessionId).filter(Boolean))).map(id => (
              <option key={id} value={id}>Campaign: {id}</option>
            ))}
          </select>

          <select value={selectedCity} onChange={e => setSelectedCity(e.target.value)}
            className="px-4 py-2.5 bg-white border border-gray-100 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:border-violet-300 shadow-sm">
            {(cities || ['All']).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={fetchVendors}
            className="p-2.5 bg-white border border-gray-100 rounded-xl text-gray-500 hover:text-violet-600 hover:border-violet-200 transition-all shadow-sm">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button onClick={() => setView('table')} className={`px-3 py-1.5 flex items-center gap-2 rounded-lg text-xs font-bold transition-all ${view === 'table' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              <List size={14} /> Table
            </button>
            <button onClick={() => setView('cards')} className={`px-3 py-1.5 flex items-center gap-2 rounded-lg text-xs font-bold transition-all ${view === 'cards' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              <Database size={14} /> Deck
            </button>
          </div>
          <div className="text-xs font-semibold text-gray-400 ml-auto">
            {filteredVendors?.length?.toLocaleString() || 0} results
          </div>
        </div>

        {/* ACTIVE FOLDER BADGE */}
        {selectedFolder && (
          <div className="bg-violet-50 border border-violet-100 p-3 rounded-xl flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <FolderOpen size={18} className="text-violet-500" />
              <div>
                <p className="text-xs font-black text-violet-800 uppercase tracking-wide">Active Campaign Folder</p>
                <p className="text-sm font-semibold text-violet-600 mt-0.5">{selectedFolder}</p>
              </div>
            </div>
            <button onClick={() => setSelectedFolder(null)} className="p-1.5 bg-violet-100 text-violet-600 rounded-lg hover:bg-violet-200 transition-all">
              <X size={14} />
            </button>
          </div>
        )}

         {/* Excel table view rendered below */}

        {/* EXCEL TABLE VIEW */}
        {view === 'table' && (
          <div className="h-[600px] w-full bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            {(filteredVendors || []).length === 0 ? (
              <div className="py-20 flex flex-col items-center h-full justify-center text-gray-400">
                <Database size={40} className="mb-4 opacity-50" />
                <p className="font-bold text-gray-500">No leads to display</p>
              </div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar flex-1">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="px-4 py-3 text-xs font-black uppercase text-gray-500 tracking-wider">Business Info</th>
                      <th className="px-4 py-3 text-xs font-black uppercase text-gray-500 tracking-wider">Quality Score</th>
                      <th className="px-4 py-3 text-xs font-black uppercase text-gray-500 tracking-wider">Category & Location</th>
                      <th className="px-4 py-3 text-xs font-black uppercase text-gray-500 tracking-wider">Contacts</th>
                      <th className="px-4 py-3 text-xs font-black uppercase text-gray-500 tracking-wider">Digital Presence</th>
                      <th className="px-4 py-3 text-xs font-black uppercase text-gray-500 tracking-wider">Full Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {[...(filteredVendors || [])].sort((a, b) => {
                      const aHasContact = (a.phone && !a.phone.includes('Requires')) || a.email ? 1 : 0;
                      const bHasContact = (b.phone && !b.phone.includes('Requires')) || b.email ? 1 : 0;
                      return bHasContact - aHasContact; // Descending, so 1 comes before 0
                    }).map((vendor, i) => (
                      <motion.tr 
                          key={vendor.id || i} 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: Math.min(i * 0.05, 0.5) }}
                          onClick={() => setSelectedVendor(vendor)}
                          className="hover:bg-violet-50 cursor-pointer transition-colors group">
                        
                        {/* Business Info */}
                        <td className="px-4 py-3 flex items-center gap-3 min-w-[250px]">
                          <div className="relative">
                            <img src={vendor.avatar || vendor.images?.[0] || `https://ui-avatars.com/api/?name=${encodeURIComponent(vendor.name || 'V')}&background=ede9fe&color=7c3aed`} 
                                 alt={vendor.name} 
                                 className="w-10 h-10 rounded-lg object-cover border border-gray-200 shadow-sm group-hover:scale-105 transition-transform" />
                            {vendor.verified && (
                              <div className="absolute -bottom-1 -right-1 bg-white rounded-full">
                                <CheckCircle2 size={12} className="text-green-500" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 text-sm group-hover:text-violet-700 transition-colors truncate">{vendor.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {vendor.rating && <p className="text-[10px] font-bold text-amber-500 flex items-center gap-0.5 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100"><Star size={10} fill="currentColor" /> {vendor.rating}</p>}
                              <span className="text-[9px] text-gray-400 font-medium">ID: {vendor.id?.substring(0, 8)}</span>
                            </div>
                          </div>
                        </td>

                        {/* Quality Score */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-full ${vendor.qualityScore >= 80 ? 'bg-green-500' : vendor.qualityScore >= 50 ? 'bg-blue-500' : 'bg-gray-300'}`} style={{ width: `${vendor.qualityScore || 0}%` }}></div>
                            </div>
                            <span className="text-xs font-black text-gray-700">{vendor.qualityScore || 0}%</span>
                          </div>
                        </td>

                        {/* Category & Location */}
                        <td className="px-4 py-3 min-w-[150px]">
                          <p className="text-sm font-bold text-gray-700">{vendor.category}</p>
                          <p className="text-xs font-semibold text-gray-400 flex items-center gap-1 mt-0.5"><MapPin size={10} /> {vendor.city || 'Unknown'}</p>
                        </td>

                        {/* Contacts */}
                        <td className="px-4 py-3 min-w-[200px]">
                          <div className="space-y-1">
                            {vendor.phone && !vendor.phone.includes('Requires') ? (
                               <p className="text-xs font-bold text-green-700 bg-green-50 px-2 py-1 rounded border border-green-100 inline-flex items-center gap-1.5">
                                 <Phone size={10} /> {vendor.phone}
                               </p>
                            ) : (
                               <p className="text-[10px] text-gray-400">No Phone</p>
                            )}
                            {vendor.email && (
                               <p className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-100 inline-flex items-center gap-1.5 mt-1">
                                 <Mail size={10} /> {vendor.email}
                               </p>
                            )}
                          </div>
                        </td>

                        {/* Digital Presence */}
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            {vendor.website ? (
                              <a href={vendor.website} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="p-1.5 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 transition-colors" title="Website">
                                <Globe size={14} />
                              </a>
                            ) : <span className="p-1.5 text-gray-300"><Globe size={14} /></span>}
                            
                            {vendor.instagram ? (
                              <a href={vendor.instagram} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="p-1.5 bg-pink-50 text-pink-600 rounded hover:bg-pink-100 transition-colors" title="Instagram">
                                <Camera size={14} />
                              </a>
                            ) : <span className="p-1.5 text-gray-300"><Camera size={14} /></span>}

                            {vendor.mapsLink ? (
                              <a href={vendor.mapsLink} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="p-1.5 bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100 transition-colors" title="Google Maps">
                                <Map size={14} />
                              </a>
                            ) : <span className="p-1.5 text-gray-300"><Map size={14} /></span>}
                          </div>
                        </td>

                        {/* Full Address */}
                        <td className="px-4 py-3 min-w-[300px]">
                          <p className="text-xs text-gray-600 truncate max-w-[280px]" title={vendor.address}>{vendor.address || 'Address not scraped'}</p>
                        </td>

                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* HORIZONTAL CARD SCROLLER (DECK VIEW) */}
        {view === 'cards' && (
          <div className="w-full relative py-4">
            {(filteredVendors || []).length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-gray-400 bg-white rounded-2xl border border-gray-200 shadow-sm">
                <Database size={40} className="mb-4 opacity-50" />
                <p className="font-bold text-gray-500">No leads to display</p>
              </div>
            ) : (
              <div className="flex gap-6 overflow-x-auto pb-8 custom-scrollbar snap-x snap-mandatory px-2">
                {[...(filteredVendors || [])].sort((a, b) => {
                  const aHasContact = (a.phone && !a.phone.includes('Requires')) || a.email ? 1 : 0;
                  const bHasContact = (b.phone && !b.phone.includes('Requires')) || b.email ? 1 : 0;
                  return bHasContact - aHasContact;
                }).map((vendor, i) => (
                  <motion.div 
                    key={vendor.id || i}
                    initial={{ opacity: 0, scale: 0.9, x: 50 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.05, type: 'spring' }}
                    onClick={() => setSelectedVendor(vendor)}
                    className="flex-shrink-0 w-[340px] bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(124,58,237,0.1)] transition-all cursor-pointer snap-center group overflow-hidden flex flex-col relative"
                  >
                    {/* Header Image Cover */}
                    <div className="h-32 w-full bg-gray-100 relative overflow-hidden">
                      {vendor.images && vendor.images.length > 0 ? (
                         <img src={vendor.images[0]} alt="Cover" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      ) : (
                         <div className="w-full h-full" style={{ background: 'linear-gradient(135deg, #ede9fe, #f3f4f6)' }}></div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                      <div className="absolute bottom-3 left-4 flex gap-2">
                         {vendor.rating && <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm"><Star size={10} fill="currentColor" /> {vendor.rating}</span>}
                         <span className="bg-black/50 backdrop-blur text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm border border-white/20">{vendor.category}</span>
                      </div>
                    </div>

                    {/* Avatar Overlap */}
                    <div className="px-5 pt-0 pb-5 flex-1 flex flex-col relative">
                      <div className="w-16 h-16 rounded-2xl bg-white p-1 absolute -top-8 right-5 shadow-lg">
                         <img src={vendor.avatar || vendor.images?.[0] || `https://ui-avatars.com/api/?name=${encodeURIComponent(vendor.name || 'V')}&background=ede9fe&color=7c3aed`} 
                              alt={vendor.name} className="w-full h-full rounded-xl object-cover bg-gray-100" />
                      </div>
                      
                      <div className="mt-4 pr-16">
                        <h3 className="font-black text-gray-900 text-lg leading-tight group-hover:text-violet-600 transition-colors line-clamp-1">{vendor.name}</h3>
                        <p className="text-xs font-semibold text-gray-400 mt-0.5 flex items-center gap-1"><MapPin size={11} /> {vendor.city || 'Unknown Location'}</p>
                      </div>

                      {/* AI Quality Bar */}
                      <div className="mt-5 space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          <span>AI Quality Score</span>
                          <span className={vendor.qualityScore >= 80 ? 'text-green-500' : 'text-blue-500'}>{vendor.qualityScore || 0}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full ${vendor.qualityScore >= 80 ? 'bg-green-500' : vendor.qualityScore >= 50 ? 'bg-blue-500' : 'bg-gray-300'}`} style={{ width: `${vendor.qualityScore || 0}%` }}></div>
                        </div>
                      </div>

                      {/* Contacts Quick View */}
                      <div className="mt-6 flex flex-col gap-2">
                        {vendor.phone && !vendor.phone.includes('Requires') ? (
                          <div className="flex items-center gap-2 text-xs font-bold text-gray-700 bg-gray-50 p-2 rounded-xl border border-gray-100 group-hover:border-violet-100 transition-colors">
                            <div className="bg-green-100 text-green-600 p-1.5 rounded-lg"><Phone size={12} /></div>
                            {vendor.phone}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-xs font-bold text-gray-400 bg-gray-50 p-2 rounded-xl border border-gray-100 opacity-60">
                            <div className="bg-gray-200 text-gray-500 p-1.5 rounded-lg"><Phone size={12} /></div>
                            Missing Phone
                          </div>
                        )}
                        {vendor.email && (
                          <div className="flex items-center gap-2 text-xs font-bold text-gray-700 bg-gray-50 p-2 rounded-xl border border-gray-100 group-hover:border-violet-100 transition-colors">
                            <div className="bg-blue-100 text-blue-600 p-1.5 rounded-lg"><Mail size={12} /></div>
                            <span className="truncate">{vendor.email}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-auto pt-5 flex justify-between items-center">
                         <div className="flex gap-2">
                            {vendor.instagram && <div className="w-6 h-6 rounded-full bg-pink-50 text-pink-500 flex items-center justify-center"><Camera size={10} /></div>}
                            {vendor.website && <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center"><Globe size={10} /></div>}
                         </div>
                         <button className="text-xs font-black text-violet-600 hover:text-violet-800 flex items-center gap-1 transition-colors">View Deep <ArrowRight size={12} /></button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>




      {/* ── VENDOR DETAIL PANEL ── */}
      <AnimatePresence>
        {selectedVendor && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }} onClick={() => setSelectedVendor(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="glass-card max-w-lg w-full shadow-2xl overflow-hidden rounded-3xl" style={{ background: 'rgba(6,8,18,0.98)', border: '1px solid rgba(255,255,255,0.08)' }}>
              
              <div className="p-6 flex items-start justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-4">
                  {(selectedVendor.avatar || (selectedVendor.images && selectedVendor.images.length > 0)) ? (
                    <img src={selectedVendor.avatar || selectedVendor.images[0]} alt={selectedVendor.name} className="w-16 h-16 rounded-2xl object-cover shadow-lg border border-white/10" />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(109,40,217,0.2))', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.3)' }}>
                      {selectedVendor.name?.[0] || '?'}
                    </div>
                  )}
                  <div>
                    <h3 className="font-black text-white text-lg leading-tight">{selectedVendor.name}</h3>
                    <p className="text-sm font-semibold mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>{selectedVendor.category} · {selectedVendor.city || 'India'}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedVendor(null)} className="p-2 rounded-xl transition-all hover:bg-white/5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {/* AI Insight Box */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 rounded-2xl p-4 flex gap-4 items-start relative overflow-hidden">
                  <div className="absolute inset-0 bg-white opacity-5 mix-blend-overlay" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>
                  <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 shrink-0 shadow-[0_0_15px_rgba(139,92,246,0.5)]">
                    <TrendingUp size={14} />
                  </div>
                  <div className="relative z-10">
                    <p className="text-[10px] font-black text-violet-300 uppercase tracking-widest mb-1 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span> AI Analysis Active
                    </p>
                    <p className="text-xs text-gray-300 font-medium leading-relaxed">
                      {selectedVendor.qualityScore >= 80 
                        ? 'High-value target detected. ' 
                        : 'Standard lead profile. '}
                      {selectedVendor.phone && !selectedVendor.phone.includes('Requires') 
                        ? 'Direct line verified. ' 
                        : 'No direct phone, fallback to digital outreach. '}
                      {selectedVendor.rating >= 4.5 
                        ? 'Excellent public reputation.' 
                        : 'Average rating, potential for reputation management.'}
                    </p>
                  </div>
                </motion.div>

                {/* Images Carousel */}
                {selectedVendor.images && selectedVendor.images.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Extracted Photos ({selectedVendor.images.length})</p>
                    <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar snap-x">
                      {selectedVendor.images.map((img, idx) => (
                        <div key={idx} className="relative w-32 h-24 flex-shrink-0 snap-start overflow-hidden rounded-xl border border-white/10 group cursor-pointer shadow-lg hover:shadow-violet-500/20 transition-all">
                          <img src={img} alt={`Business ${idx}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <Search className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" size={16} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <ContactRow icon={<TrendingUp size={15} />} label="Lead Score" value={`${selectedVendor.qualityScore || 50}%`} color="green" />
                    <ContactRow icon={<Database size={15} />} label="Quality Tier" value={selectedVendor.tier || 'Standard'} color="violet" />
                  </div>

                  {selectedVendor.phone && <ContactRow icon={<Phone size={15} />} label="Direct Phone" value={selectedVendor.phone} color="green" />}
                  {selectedVendor.email && <ContactRow icon={<Mail size={15} />} label="Email Address" value={selectedVendor.email} color="blue" />}
                  {selectedVendor.website && <ContactRow icon={<Globe size={15} />} label="Website" value={selectedVendor.website} color="indigo" />}
                  
                  {(selectedVendor.instagramFollowers || selectedVendor.facebookFollowers || selectedVendor.instagram || selectedVendor.facebook) && (
                    <div className="grid grid-cols-2 gap-3">
                      {selectedVendor.instagram && <ContactRow icon={<Camera size={15} />} label="IG Presence" value={selectedVendor.instagramFollowers || 'Connected'} color="pink" />}
                      {selectedVendor.facebook && <ContactRow icon={<Users size={15} />} label="FB Presence" value={selectedVendor.facebookFollowers || 'Connected'} color="blue" />}
                    </div>
                  )}

                  {selectedVendor.googleMapsLink && (
                    <a href={selectedVendor.googleMapsLink} target="_blank" rel="noreferrer" className="block hover:scale-[1.01] transition-transform">
                      <ContactRow icon={<Map size={15} />} label="Google Maps Link" value="Click to view on Map" color="amber" />
                    </a>
                  )}

                  {selectedVendor.address && <ContactRow icon={<MapPin size={15} />} label="Exact Address" value={selectedVendor.address} color="gray" />}

                  <div className="grid grid-cols-2 gap-3">
                    <ContactRow icon={<Database size={15} />} label="Source" value={selectedVendor.source || 'Google Maps Engine'} color="gray" />
                    <ContactRow icon={<RefreshCw size={15} />} label="Scraped Date" value={selectedVendor.scrapedAt ? new Date(selectedVendor.scrapedAt).toLocaleDateString() : 'N/A'} color="gray" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {selectedVendor.pincode && <ContactRow icon={<MapPin size={15} />} label="Postal Pincode" value={selectedVendor.pincode} color="gray" />}
                    {(selectedVendor.latitude && selectedVendor.longitude) && (
                      <ContactRow icon={<MapPin size={15} />} label="Coordinates" value={`${Number(selectedVendor.latitude).toFixed(4)}, ${Number(selectedVendor.longitude).toFixed(4)}`} color="gray" />
                    )}
                  </div>
                </motion.div>
              </div>

              <div className="px-6 pb-6 flex gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem' }}>
                <button onClick={() => { handleVerify(selectedVendor.id, !selectedVendor.verified); setSelectedVendor(null); }}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20">
                  <CheckCircle2 size={15} /> {selectedVendor.verified ? 'Unverify Lead' : 'Verify Lead'}
                </button>
                <button onClick={() => { handleDelete(selectedVendor.id); setSelectedVendor(null); }}
                  className="px-4 py-3 rounded-xl text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20">
                  <Trash2 size={15} /> Delete
                </button>
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
    indigo: { bg: 'rgba(99,102,241,0.1)', text: '#818cf8', border: 'rgba(99,102,241,0.2)' },
    amber: { bg: 'rgba(245,158,11,0.1)', text: '#fbbf24', border: 'rgba(245,158,11,0.2)' },
    violet: { bg: 'rgba(139,92,246,0.1)', text: '#a78bfa', border: 'rgba(139,92,246,0.2)' },
    gray: { bg: 'rgba(255,255,255,0.05)', text: 'rgba(255,255,255,0.7)', border: 'rgba(255,255,255,0.1)' },
  };
  const theme = colorMap[color] || colorMap.gray;
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border transition-all hover:bg-white/[0.08]" style={{ background: theme.bg, color: theme.text, borderColor: theme.border }}>
      {icon}
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-black uppercase tracking-wider opacity-60">{label}</p>
        <p className="text-sm font-semibold truncate text-white">{value}</p>
      </div>
    </div>
  );
}

function VendorCard({ vendor, employees, onVerify, onDelete, onAssign, onClick }) {
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
          {vendor.phone && (
            <span className="badge badge-emerald flex items-center gap-1">
              <Phone size={10} /> {vendor.phone.length > 13 ? vendor.phone.slice(0, 13) + '...' : vendor.phone}
            </span>
          )}
          {vendor.email && (
            <span className="badge badge-blue flex items-center gap-1">
              <Mail size={10} />
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
          <button onClick={() => onVerify(vendor.id, !vendor.verified)}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: vendor.verified ? '#10b981' : 'rgba(255,255,255,0.3)', background: vendor.verified ? 'rgba(16,185,129,0.1)' : 'transparent' }}
            onMouseOver={e => { e.currentTarget.style.color = '#10b981'; e.currentTarget.style.background = 'rgba(16,185,129,0.1)'; }}
            onMouseOut={e => { e.currentTarget.style.color = vendor.verified ? '#10b981' : 'rgba(255,255,255,0.3)'; e.currentTarget.style.background = vendor.verified ? 'rgba(16,185,129,0.1)' : 'transparent'; }}
            title="Verify">
            <CheckCircle2 size={15} />
          </button>
          <button onClick={() => onDelete(vendor.id)}
            className="p-1.5 rounded-lg transition-colors" style={{ color: 'rgba(255,255,255,0.3)' }}
            onMouseOver={e => { e.currentTarget.style.color = '#f43f5e'; e.currentTarget.style.background = 'rgba(244,63,94,0.1)'; }}
            onMouseOut={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; e.currentTarget.style.background = 'transparent'; }}
            title="Delete">
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

function AnimatedExcelExport({ vendors }) {
  const [exportState, setExportState] = useState('idle'); // idle, processing, success

  const handleExport = async () => {
    if (vendors.length === 0) return;
    setExportState('processing');

    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Leads CRM', { views: [{ state: 'frozen', ySplit: 1 }] });

      sheet.columns = [
        { header: 'Business Name', key: 'name', width: 35 },
        { header: 'Category', key: 'category', width: 20 },
        { header: 'City', key: 'city', width: 20 },
        { header: 'Phone', key: 'phone', width: 25 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Address', key: 'address', width: 45 },
        { header: 'Rating', key: 'rating', width: 10 },
        { header: 'Website', key: 'website', width: 35 },
        { header: 'Instagram', key: 'instagram', width: 35 },
        { header: 'Facebook', key: 'facebook', width: 35 },
        { header: 'Maps Link', key: 'maps', width: 40 },
        { header: 'Quality Score', key: 'score', width: 15 },
        { header: 'Lead Status', key: 'status', width: 15 }
      ];

      // Style Header
      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6D28D9' } }; // Violet-700
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 30;

      // Add Data
      vendors.forEach((v, index) => {
        const row = sheet.addRow({
          name: v.name,
          category: v.category,
          city: v.city,
          phone: v.phone && !v.phone.includes('Requires') ? v.phone : '',
          email: v.email || '',
          address: v.address || '',
          rating: v.rating || '',
          website: v.website || '',
          instagram: v.instagram || '',
          facebook: v.facebook || '',
          maps: v.mapsLink || '',
          score: v.qualityScore || '',
          status: v.crmStatus || 'New'
        });

        // Alternating row colors for CRM look
        if (index % 2 !== 0) {
          row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } }; // Gray-50
        }

        row.alignment = { vertical: 'middle', wrapText: true };
      });

      // Borders for all cells
      sheet.eachRow((row) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
          };
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Premium_Leads_CRM_${new Date().toISOString().slice(0,10)}.xlsx`);

      setExportState('success');
      setTimeout(() => setExportState('idle'), 3000);
    } catch (e) {
      console.error(e);
      setExportState('idle');
    }
  };

  return (
    <button onClick={handleExport} disabled={exportState === 'processing'}
      className="relative flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white overflow-hidden transition-all shadow-md"
      style={{ background: exportState === 'success' ? '#10b981' : 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
      <AnimatePresence mode="wait">
        {exportState === 'idle' && (
          <motion.div key="idle" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="flex items-center gap-2">
            <Download size={15} /> Export Excel
          </motion.div>
        )}
        {exportState === 'processing' && (
          <motion.div key="processing" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="flex items-center gap-2">
            <RefreshCw size={15} className="animate-spin" /> Formatting...
          </motion.div>
        )}
        {exportState === 'success' && (
          <motion.div key="success" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="flex items-center gap-2">
            <CheckCircle2 size={15} /> Excel Downloaded!
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}
