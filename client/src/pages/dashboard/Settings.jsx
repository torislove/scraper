import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings, User, Shield, Upload, MapPin, Trash2, Users,
  RefreshCw, Save, Eye, EyeOff, AlertTriangle, Check,
  Database, Sliders, Key, Bell, Cpu, Sparkles
} from 'lucide-react';
import { useScraper } from '../../context/ScraperContext';
import toast from 'react-hot-toast';
import axios from 'axios';
import { API_URL } from '../../apiConfig';

const TAB_ITEMS = [
  { id: 'general', icon: <Sliders size={16} />, label: 'General' },
  { id: 'credentials', icon: <Key size={16} />, label: 'Admin Access' },
  { id: 'apikeys', icon: <Cpu size={16} />, label: 'API Keys & AI' },
  { id: 'team', icon: <Users size={16} />, label: 'Team Agents' },
  { id: 'advanced', icon: <Database size={16} />, label: 'Platform & Data' },
];

export default function SettingsPage() {
  const { employees, fetchEmployees, handleFileUpload, onLogout, clearQueue } = useScraper();
  const [activeTab, setActiveTab] = useState('general');
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [apiKeys, setApiKeys] = useState({ nvidiaApiKey: '', olaMapsApiKey: '' });
  const [savingKeys, setSavingKeys] = useState(false);

  React.useEffect(() => {
    axios.get(`${API_URL}/scrape/settings`)
      .then(res => {
        if (res.data) setApiKeys(res.data);
      })
      .catch(() => {});
  }, []);

  const handleUpdateApiKeys = async (e) => {
    e.preventDefault();
    setSavingKeys(true);
    try {
      await axios.post(`${API_URL}/scrape/settings`, {
        nvidiaApiKey: e.target.nvidiaApiKey.value,
        olaMapsApiKey: e.target.olaMapsApiKey.value
      });
      toast.success('API keys updated successfully!');
    } catch {
      toast.error('Failed to update API keys');
    }
    setSavingKeys(false);
  };

  const handleUpdateCredentials = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.put(`${API_URL}/auth/admin`, {
        username: e.target.username.value,
        password: e.target.password.value,
      });
      toast.success('Credentials updated successfully.');
    } catch {
      toast.error('Update failed. Check your connection.');
    }
    setSaving(false);
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    if (e.target.avatar.files[0]) formData.append('image', e.target.avatar.files[0]);
    try {
      let avatarUrl = '';
      if (e.target.avatar.files[0]) {
        const upRes = await axios.post(`${API_URL}/upload`, formData);
        avatarUrl = upRes.data.url;
      }
      await axios.post(`${API_URL}/employees`, {
        name: e.target.name.value,
        username: e.target.username.value,
        password: e.target.password.value,
        location: e.target.location.value,
        phone: e.target.phone.value,
        email: e.target.email.value,
        avatar: avatarUrl,
      });
      toast.success('Team member agent created!');
      e.target.reset();
      fetchEmployees();
    } catch {
      toast.error('Failed to add team member.');
    }
  };

  const handleDeleteEmployee = async (id) => {
    if (!window.confirm('Delete this team agent?')) return;
    try {
      await axios.delete(`${API_URL}/employees/${id}`);
      fetchEmployees();
      toast.success('Team member removed.');
    } catch {
      toast.error('Failed to delete.');
    }
  };

  return (
    <div className="min-h-full bg-[#07070d] text-slate-100 flex flex-col font-sans">
      
      {/* ── TOP HEADER ── */}
      <div className="border-b border-white/[0.08] bg-[#0c0c16]/90 backdrop-blur-xl px-6 py-5 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20 border border-white/10">
              <Settings className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">System Configuration</h1>
              <p className="text-xs text-slate-400 mt-0.5">Admin access credentials, agent team roster, and storage maintenance</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 w-full flex-1">
        <div className="flex flex-col md:flex-row gap-6">
          
          {/* Sidebar tabs */}
          <div className="w-full md:w-56 flex-shrink-0">
            <nav className="space-y-1 bg-[#0c0c16]/80 rounded-2xl border border-white/[0.08] p-2 sticky top-24">
              {TAB_ITEMS.map(tab => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      active
                        ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/30'
                        : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 space-y-6">

            {/* GENERAL TAB */}
            {activeTab === 'general' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                <CyberSection title="Bulk Target Injection" desc="Upload CSV matrix to queue multiple territory extraction jobs simultaneously">
                  <div className="space-y-3">
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Upload a CSV file containing <code className="bg-white/10 text-violet-300 px-1.5 py-0.5 rounded font-mono text-[11px]">Category</code> and <code className="bg-white/10 text-violet-300 px-1.5 py-0.5 rounded font-mono text-[11px]">District/Mandal</code> columns. Each row is autonomously queued for high-throughput headless extraction.
                    </p>
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/[0.1] rounded-2xl cursor-pointer hover:border-violet-500/40 hover:bg-violet-500/5 transition-all group">
                      <Upload size={24} className="text-slate-500 group-hover:text-violet-400 transition-colors mb-1.5" />
                      <span className="text-xs font-bold text-slate-300 group-hover:text-violet-300">Click to upload CSV matrix</span>
                      <span className="text-[10px] text-slate-500 mt-0.5">Supports UTF-8 CSV up to 1,000 target rows</span>
                      <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                    </label>
                  </div>
                </CyberSection>
              </motion.div>
            )}

            {/* CREDENTIALS TAB */}
            {activeTab === 'credentials' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                <CyberSection title="Master Admin Credentials" desc="Update master authentication access credentials">
                  <div className="flex items-start gap-3 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl mb-4">
                    <AlertTriangle size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-300 leading-relaxed">
                      Security Notice: Updating master admin credentials will terminate active sessions and require immediate re-login with the new key.
                    </p>
                  </div>

                  <form onSubmit={handleUpdateCredentials} className="space-y-3.5">
                    <CyberInputField name="username" label="Master Username" type="text" required placeholder="admin" />
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Master Password
                      </label>
                      <div className="relative">
                        <input
                          name="password"
                          type={showPw ? 'text' : 'password'}
                          required
                          placeholder="••••••••••••"
                          className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw(!showPw)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={saving}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold rounded-xl text-xs hover:from-violet-500 transition-all shadow-md shadow-violet-600/30 disabled:opacity-50"
                    >
                      {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                      <span>{saving ? 'Updating...' : 'Save Credentials'}</span>
                    </button>
                  </form>
                </CyberSection>
              </motion.div>
            )}

            {/* API KEYS & AI TAB */}
            {activeTab === 'apikeys' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                <CyberSection title="Autonomous Radar & Map Tiles Configuration" desc="Cartographic rendering engines and geocoding services">
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-xs font-bold text-emerald-300">Active Free Tile Service: CartoDB Dark & OSM Nominatim</span>
                      </div>
                      <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        100% Free • No API Key Needed
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      All map radar tracking, GPS pinpointing, and geographic boundaries run on high-performance vector tiles. 
                      You do <strong>not</strong> need a Google Maps API Key or billing account. All 26 Andhra Pradesh districts and nationwide territories work out-of-the-box.
                    </p>
                  </div>
                </CyberSection>

                <CyberSection title="AI Engine & Neural Extractor Credentials" desc="Manage API keys for autonomous contact extraction and deep enrichment">
                  <form onSubmit={handleUpdateApiKeys} className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Nvidia DeepSeek LLM Key
                        </label>
                        <a
                          href="https://build.nvidia.com"
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-violet-400 hover:text-violet-300 font-bold"
                        >
                          Get Free Key at build.nvidia.com →
                        </a>
                      </div>
                      <input
                        name="nvidiaApiKey"
                        type="password"
                        defaultValue={apiKeys.nvidiaApiKey || ''}
                        placeholder="nvapi-..."
                        className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-all font-mono"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">
                        Powering high-speed heuristic phone extraction and automated business classification.
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Ola Maps API Key (Optional Fallback)
                        </label>
                        <span className="text-[10px] text-slate-500 font-mono">Optional</span>
                      </div>
                      <input
                        name="olaMapsApiKey"
                        type="password"
                        defaultValue={apiKeys.olaMapsApiKey || ''}
                        placeholder="Optional fallback geocoding key"
                        className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-all font-mono"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">
                        OpenStreetMap Nominatim is used automatically when this field is left empty.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={savingKeys}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold rounded-xl text-xs hover:from-violet-500 transition-all shadow-md shadow-violet-600/30 disabled:opacity-50"
                    >
                      {savingKeys ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                      <span>{savingKeys ? 'Saving...' : 'Save API Keys'}</span>
                    </button>
                  </form>
                </CyberSection>
              </motion.div>
            )}

            {/* TEAM TAB */}
            {activeTab === 'team' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                <CyberSection title="Enroll Field Agent" desc="Create dedicated employee portal accounts for assigned leads outreach">
                  <form onSubmit={handleAddEmployee}>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="col-span-2">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                          Profile Avatar Image
                        </label>
                        <input
                          name="avatar"
                          type="file"
                          accept="image/*"
                          className="w-full px-3 py-1.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-xs text-slate-300 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-violet-600/30 file:text-violet-300 file:font-semibold file:text-xs cursor-pointer"
                        />
                      </div>
                      {[
                        ['name', 'Full Name', 'text', true],
                        ['location', 'Assigned District / Mandal', 'text', true],
                        ['phone', 'WhatsApp Contact', 'tel', false],
                        ['email', 'Email Address', 'email', false],
                        ['username', 'Agent Login Handle', 'text', true],
                        ['password', 'Agent Password', 'password', true],
                      ].map(([n, label, type, req]) => (
                        <CyberInputField key={n} name={n} label={label} type={type} required={req} placeholder={label} />
                      ))}
                    </div>

                    <button
                      type="submit"
                      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold rounded-xl text-xs hover:from-violet-500 transition-all shadow-md shadow-violet-600/30"
                    >
                      <User size={14} />
                      <span>Create Agent Account</span>
                    </button>
                  </form>
                </CyberSection>

                <CyberSection title="Active Agent Roster" desc="Currently authorized field sales representatives">
                  {(employees || []).length === 0 ? (
                    <div className="py-8 text-center text-slate-500 text-xs">
                      No active agents enrolled. Add your first team member above.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {(employees || []).map(emp => (
                        <div
                          key={emp.id}
                          className="flex items-center gap-3.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-violet-500/30 transition-all"
                        >
                          <img
                            src={emp.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=1e1b4b&color=a78bfa`}
                            alt={emp.name}
                            className="w-10 h-10 rounded-xl object-cover border border-white/10"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-white text-xs">{emp.name}</p>
                            <p className="text-[10px] text-slate-400">{emp.location} • @{emp.username}</p>
                          </div>
                          {emp.phone && (
                            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                              {emp.phone}
                            </span>
                          )}
                          <button
                            onClick={() => handleDeleteEmployee(emp.id)}
                            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </CyberSection>
              </motion.div>
            )}

            {/* ADVANCED TAB */}
            {activeTab === 'advanced' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                <CyberSection title="Maintenance & Storage Hygiene" desc="Database purge operations and staging resets">
                  <div className="flex items-center justify-between p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <div>
                      <p className="font-bold text-red-300 text-xs">Purge Staging Queue</p>
                      <p className="text-[10px] text-red-400/80 mt-0.5">
                        Removes all unverified temporary lead records from memory.
                      </p>
                    </div>
                    <button
                      onClick={clearQueue}
                      className="px-3.5 py-1.5 text-xs font-bold text-red-300 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-xl transition-all"
                    >
                      Clear Queue
                    </button>
                  </div>
                </CyberSection>

                <CyberSection title="System Architecture & Build" desc="Platform runtime specifications">
                  <div className="space-y-2 text-xs">
                    {[
                      { label: 'Platform Engine', value: 'OmniScrape Cyber Console v2.5' },
                      { label: 'Scraper Matrix', value: '22 Autonomous Headless Engines' },
                      { label: 'Geomesh Database', value: '26 AP Districts · Full Mandal Gazette' },
                      { label: 'Frontend Stack', value: 'React 18 · Vite · Leaflet · TailwindCSS' },
                    ].map(row => (
                      <div key={row.label} className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{row.label}</span>
                        <span className="font-mono text-slate-200">{row.value}</span>
                      </div>
                    ))}
                  </div>
                </CyberSection>
              </motion.div>
            )}

          </div>

        </div>
      </div>

    </div>
  );
}

function CyberSection({ title, desc, children }) {
  return (
    <div className="bg-[#0c0c16]/80 rounded-2xl border border-white/[0.08] overflow-hidden shadow-xl">
      <div className="px-5 py-4 border-b border-white/[0.08] bg-white/[0.01]">
        <h3 className="font-bold text-white text-xs">{title}</h3>
        <p className="text-[11px] text-slate-400 mt-0.5">{desc}</p>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function CyberInputField({ name, label, type, required, placeholder }) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{label}</label>
      <input
        name={name}
        type={type || 'text'}
        required={required}
        placeholder={placeholder}
        className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-all"
      />
    </div>
  );
}
