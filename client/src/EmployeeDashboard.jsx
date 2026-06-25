import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  LogOut, Phone, MessageCircle, MapPin, Search, 
  CheckCircle2, XCircle, Clock, Save, User, 
  FolderOpen, Map, Mail, ExternalLink, Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from './apiConfig';

export default function EmployeeDashboard({ user, onLogout }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Workspace State
  const [activeCategory, setActiveCategory] = useState('All');
  const [categories, setCategories] = useState([]);
  
  // Lead Action State
  const [activeLeadId, setActiveLeadId] = useState(null);
  const [crmNotes, setCrmNotes] = useState('');

  // Map state
  const mapRef = useRef(null);

  async function fetchAssignedLeads() {
    try {
      const res = await axios.get(`${API_URL}/vendors`);
      // Filter leads specifically assigned to this user
      const assigned = res.data.filter(v => v.assignedTo === user.id).reverse();
      
      setLeads(assigned);
      
      // Extract unique categories for the workspace tabs
      const uniqueCats = [...new Set(assigned.map(l => l.category))];
      setCategories(['All', ...uniqueCats]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAssignedLeads();
  }, []);

  const updateLeadStatus = async (id, status) => {
    try {
      await axios.put(`${API_URL}/vendors/${id}/crm`, { crmStatus: status, crmNotes });
      setLeads(prev => prev.map(l => l.id === id ? { ...l, crmStatus: status, crmNotes } : l));
      setActiveLeadId(null);
    } catch (error) {
      alert("Failed to update status");
    }
  };

  const handleCall = (phone) => {
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    window.open(`tel:${cleanPhone}`, '_self');
  };

  const handleWhatsApp = (lead) => {
    let cleanPhone = lead.phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;
    const msg = `Hi ${lead.name} team! We are reaching out regarding your business. Are you the right person to speak with?`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const filteredLeads = leads.filter(l => 
    (activeCategory === 'All' || l.category === activeCategory) &&
    (l.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
     l.city?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const stats = {
    total: leads.length,
    interested: leads.filter(l => l.crmStatus === 'Interested').length,
    callback: leads.filter(l => l.crmStatus === 'Callback').length,
    notInterested: leads.filter(l => l.crmStatus === 'Not Interested').length,
    new: leads.filter(l => l.crmStatus === 'New' || !l.crmStatus).length,
  };

  const getStatusColor = (status) => {
    if (status === 'Interested') return 'bg-green-50 text-green-600 border-green-200';
    if (status === 'Callback') return 'bg-amber-50 text-amber-600 border-amber-200';
    if (status === 'Not Interested') return 'bg-red-50 text-red-500 border-red-200';
    return 'bg-blue-50 text-blue-600 border-blue-200'; // New
  };

  // Determine map center based on first visible lead with coords
  const mapCenter = filteredLeads.find(l => l.lat && l.lng);

  return (
    <div className="min-h-screen bg-[#f7f8fa] text-gray-900 font-sans flex flex-col">
      
      {/* ── HEADER ── */}
      <nav className="bg-white border-b border-gray-100 z-50 shadow-sm sticky top-0">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <MapPin size={16} className="text-white" strokeWidth={2.5} />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-gray-900">OmniLead<span className="text-violet-600">.</span></span>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest -mt-0.5">CRM Pipeline</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="hidden sm:flex items-center gap-3 text-right">
              <div>
                <p className="text-sm font-bold text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">{user.location} Territory</p>
              </div>
              <img src={`https://ui-avatars.com/api/?name=${user.name}&background=ede9fe&color=7c3aed`} alt="Avatar" className="w-10 h-10 rounded-full border border-violet-100" />
            </div>
            <div className="w-px h-8 bg-gray-200 hidden sm:block"></div>
            <button onClick={onLogout} className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors">
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      </nav>

      {/* ── MAIN CONTENT (SPLIT SCREEN) ── */}
      <main className="flex-1 flex overflow-hidden max-w-[1600px] mx-auto w-full">
        
        {/* LEFT PANEL: Leads List & Stats */}
        <div className="w-full lg:w-[450px] xl:w-[500px] flex flex-col bg-white border-r border-gray-100 relative z-10 flex-shrink-0 overflow-y-auto">
          
          {/* Stats Bar */}
          <div className="p-5 border-b border-gray-100 bg-gray-50/50">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-white rounded-xl p-2 border border-gray-100 shadow-sm">
                <p className="text-xs font-bold text-gray-400 uppercase">Assigned</p>
                <p className="text-lg font-black text-gray-900">{stats.total}</p>
              </div>
              <div className="bg-white rounded-xl p-2 border border-gray-100 shadow-sm">
                <p className="text-xs font-bold text-gray-400 uppercase">New</p>
                <p className="text-lg font-black text-blue-600">{stats.new}</p>
              </div>
              <div className="bg-white rounded-xl p-2 border border-gray-100 shadow-sm">
                <p className="text-xs font-bold text-gray-400 uppercase">Interested</p>
                <p className="text-lg font-black text-green-600">{stats.interested}</p>
              </div>
              <div className="bg-white rounded-xl p-2 border border-gray-100 shadow-sm">
                <p className="text-xs font-bold text-gray-400 uppercase">Follow-up</p>
                <p className="text-lg font-black text-amber-600">{stats.callback}</p>
              </div>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="p-5 border-b border-gray-100 space-y-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Search leads by name or city..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-50 text-sm font-medium transition-all"
              />
            </div>
            
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {categories.map(cat => (
                <button 
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${activeCategory === cat ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Leads Feed */}
          <div className="flex-1 p-5 space-y-4">
            {loading ? (
              <div className="py-20 text-center text-gray-400 font-semibold">Loading assignments...</div>
            ) : filteredLeads.length === 0 ? (
              <div className="py-20 text-center">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-gray-100">
                  <User className="text-gray-400" size={20} />
                </div>
                <h3 className="font-bold text-gray-900">No leads found</h3>
                <p className="text-xs text-gray-500 mt-1">Try adjusting your filters.</p>
              </div>
            ) : (
              <AnimatePresence>
                {filteredLeads.map(lead => (
                  <motion.div 
                    key={lead.id}
                    layout
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-violet-200 transition-all overflow-hidden flex flex-col group"
                  >
                    <div className="p-4 relative">
                      <div className="flex justify-between items-start mb-3">
                        <div className="pr-4">
                          <h3 className="font-black text-gray-900 text-sm leading-tight group-hover:text-violet-700 transition-colors">{lead.name}</h3>
                          <p className="text-xs text-gray-500 mt-0.5">{lead.category}</p>
                        </div>
                        <span className={`shrink-0 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${getStatusColor(lead.crmStatus || 'New')}`}>
                          {lead.crmStatus || 'New'}
                        </span>
                      </div>
                      
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
                          <MapPin size={12} className="text-gray-400" /> <span className="truncate">{lead.address || lead.city}</span>
                        </div>
                        {lead.phone && (
                          <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
                            <Phone size={12} className="text-gray-400" /> <span className="font-semibold">{lead.phone}</span>
                          </div>
                        )}
                        {lead.email && (
                          <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
                            <Mail size={12} className="text-gray-400" /> <span>{lead.email}</span>
                          </div>
                        )}
                      </div>

                      {lead.crmNotes && (
                        <div className="mt-3 p-2.5 bg-yellow-50/50 rounded-lg border border-yellow-100 text-xs text-yellow-800 italic">
                          "{lead.crmNotes}"
                        </div>
                      )}
                    </div>
                    
                    {/* Actions Area */}
                    <div className="border-t border-gray-100 bg-gray-50">
                      {activeLeadId === lead.id ? (
                        <div className="p-3">
                          <textarea 
                            value={crmNotes}
                            onChange={(e) => setCrmNotes(e.target.value)}
                            placeholder="Add notes about this lead..."
                            className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-50 mb-3"
                            rows={2}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => updateLeadStatus(lead.id, 'Interested')} className="flex items-center justify-center gap-1.5 bg-green-50 hover:bg-green-100 text-green-700 py-2 rounded-xl text-xs font-bold transition-colors border border-green-100">
                              <CheckCircle2 size={14}/> Interested
                            </button>
                            <button onClick={() => updateLeadStatus(lead.id, 'Callback')} className="flex items-center justify-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 py-2 rounded-xl text-xs font-bold transition-colors border border-amber-100">
                              <Clock size={14}/> Callback
                            </button>
                            <button onClick={() => updateLeadStatus(lead.id, 'Not Interested')} className="flex items-center justify-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 py-2 rounded-xl text-xs font-bold transition-colors border border-red-100">
                              <XCircle size={14}/> Rejected
                            </button>
                            <button onClick={() => setActiveLeadId(null)} className="flex items-center justify-center gap-1.5 bg-white hover:bg-gray-100 text-gray-600 py-2 rounded-xl text-xs font-bold transition-colors border border-gray-200">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex divide-x divide-gray-100">
                          {lead.phone && (
                            <>
                              <button 
                                onClick={() => handleCall(lead.phone)}
                                className="flex-1 py-3 flex items-center justify-center gap-1.5 font-bold text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors text-xs"
                              >
                                <Phone size={14} /> Call
                              </button>
                              <button 
                                onClick={() => handleWhatsApp(lead)}
                                className="flex-1 py-3 flex items-center justify-center gap-1.5 font-bold text-[#25D366] hover:bg-green-50 transition-colors text-xs"
                              >
                                <MessageCircle size={14} /> WhatsApp
                              </button>
                            </>
                          )}
                          <button 
                            onClick={() => { setActiveLeadId(lead.id); setCrmNotes(lead.crmNotes || ''); }}
                            className="flex-1 py-3 flex items-center justify-center gap-1.5 font-bold text-violet-600 hover:bg-violet-50 transition-colors text-xs"
                          >
                            <Save size={14} /> Update
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Interactive Map */}
        <div className="hidden lg:block flex-1 bg-gray-100 relative">
          <div className="absolute inset-0 z-0">
            <iframe
              ref={mapRef}
              title="Leads Map"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              src={`https://www.openstreetmap.org/export/embed.html?bbox=68.0%2C8.0%2C97.4%2C37.6&layer=mapnik`}
              allowFullScreen
            />
          </div>
          
          {/* Floating Map Overlay */}
          <div className="absolute top-6 right-6 z-10 w-72 bg-white/95 backdrop-blur-md p-5 rounded-2xl shadow-xl border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center text-violet-600">
                <Globe size={20} />
              </div>
              <div>
                <p className="font-black text-gray-900 text-sm">Territory Map</p>
                <p className="text-xs text-gray-500">Geographic distribution</p>
              </div>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              This map displays all leads assigned to you. Plan your outreach geographically to maximize efficiency.
            </p>
          </div>
        </div>

      </main>
    </div>
  );
}
