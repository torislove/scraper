import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings, User, Shield, Upload, MapPin, Trash2, Users,
  RefreshCw, Save, Eye, EyeOff, AlertTriangle, Check,
  Database, Sliders, Key, Bell, Tv, DollarSign, Megaphone
} from 'lucide-react';
import { useScraper } from '../../context/ScraperContext';
import toast from 'react-hot-toast';
import axios from 'axios';
import { API_URL } from '../../apiConfig';

const TAB_ITEMS = [
  { id: 'general', icon: <Sliders size={16} />, label: 'General' },
  { id: 'team', icon: <Users size={16} />, label: 'Team Members' },
  { id: 'ad-hq', icon: <Megaphone size={16} />, label: 'Ad Headquarters' },
  { id: 'advanced', icon: <Database size={16} />, label: 'Advanced' },
];

export default function SettingsPage() {
  const { 
    searchRadius, 
    setSearchRadius, 
    employees, 
    fetchEmployees, 
    handleFileUpload,
    adsEnabled,
    adNetwork,
    adImpressions,
    adClicks,
    updateAdSettings
  } = useScraper();

  const [activeTab, setActiveTab] = useState('general');

  // Calculate Mock Earnings
  // CPM (Cost Per Mille) = $2.50 ($0.0025 per view)
  // CPC (Cost Per Click) = $0.15 ($0.15 per click)
  const mockEarningsUSD = (adImpressions * 0.0025) + (adClicks * 0.15);
  const mockEarningsINR = mockEarningsUSD * 83.5; // roughly 83.5 INR per USD

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
      toast.success('Team member added!');
      e.target.reset();
      fetchEmployees();
    } catch {
      toast.error('Failed to add team member.');
    }
  };

  const handleDeleteEmployee = async (id) => {
    if (!window.confirm('Delete this team member?')) return;
    try {
      await axios.delete(`${API_URL}/employees/${id}`);
      fetchEmployees();
      toast.success('Team member removed.');
    } catch {
      toast.error('Failed to delete.');
    }
  };

  return (
    <div className="min-h-full p-6 md:p-8 bg-[#fffbeb]">
      
      {/* ── PAGE HEADER ── */}
      <div className="cartoon-card p-6 mb-6 bg-white flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#ef4444] border-2 border-black rounded-2xl flex items-center justify-center shadow-[2px_2px_0px_#000]">
            <Settings size={22} className="text-white" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-black text-black">Settings Control</h1>
            <p className="text-xs text-gray-500 font-semibold mt-0.5">Configure scraping limits, target settings, and monetize with ad configurations.</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          
          {/* Sidebar tabs */}
          <div className="w-full md:w-56 shrink-0">
            <nav className="space-y-2.5 bg-white cartoon-card p-3 sticky top-6">
              {TAB_ITEMS.map(tab => (
                <button 
                  key={tab.id} 
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black transition-all ${
                    activeTab === tab.id 
                      ? 'bg-[#fbbf24] text-black border-2 border-black shadow-[2px_2px_0px_#000] translate-x-[-1px] translate-y-[-1px]' 
                      : 'text-gray-700 hover:bg-amber-50 border-2 border-transparent'
                  }`}
                >
                  {tab.icon}
                  <span className="uppercase tracking-wider">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 w-full space-y-6">

            {/* GENERAL */}
            {activeTab === 'general' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                <Section title="Scraping Configuration" desc="Control how the extraction engine behaves">
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-black text-black uppercase tracking-wider mb-2">
                        Search Radius: <span className="text-[#ef4444] font-black">{searchRadius} km</span>
                      </label>
                      <p className="text-xs text-gray-500 font-semibold mb-3">0 = exact city boundary. Higher values expand the geographic border for maps extraction.</p>
                      
                      <div className="flex items-center gap-4">
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          step="10" 
                          value={searchRadius}
                          onChange={e => setSearchRadius(Number(e.target.value))}
                          className="flex-1 h-3 bg-gray-100 border-2 border-black rounded-lg appearance-none cursor-pointer accent-[#ef4444]" 
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-black text-black mt-2">
                        <span>0km (City limit)</span>
                        <span>50km</span>
                        <span>100km (Max)</span>
                      </div>
                    </div>
                  </div>
                </Section>

                <Section title="Bulk Target Injection" desc="Upload a CSV to queue multiple extraction tasks">
                  <div>
                    <p className="text-xs text-gray-500 font-semibold mb-4">
                      Upload a CSV file with two columns: <code className="bg-gray-100 border border-black px-1.5 py-0.5 rounded text-xs font-mono font-black text-black">Category</code> and <code className="bg-gray-100 border border-black px-1.5 py-0.5 rounded text-xs font-mono font-black text-black">City</code>. Each row spins up virtual minions automatically in the background.
                    </p>
                    <label className="flex flex-col items-center justify-center w-full h-32 bg-white border-4 border-dashed border-black rounded-2xl cursor-pointer hover:bg-amber-50/50 transition-all group">
                      <Upload size={24} className="text-gray-400 group-hover:text-black transition-colors mb-2 animate-bounce" />
                      <span className="text-xs font-black text-black uppercase tracking-wider group-hover:text-red-500">Click to upload CSV</span>
                      <span className="text-[10px] text-gray-400 font-semibold mt-1">Max 500 tasks per batch</span>
                      <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                    </label>
                  </div>
                </Section>
              </motion.div>
            )}

            {/* TEAM */}
            {activeTab === 'team' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                <Section title="Add Team Member" desc="Create a new agent account for your scraping team">
                  <form onSubmit={handleAddEmployee} className="space-y-4">
                    <div>
                      <label className="block text-xs font-black text-black uppercase tracking-wider mb-2">Profile Photo</label>
                      <input 
                        name="avatar" 
                        type="file" 
                        accept="image/*"
                        className="w-full px-4 py-2.5 bg-white border-4 border-black rounded-xl text-xs font-black text-black file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-2 file:border-black file:bg-[#fef08a] file:text-black file:font-black file:text-[10px] cursor-pointer" 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        ['name', 'Full Name', 'text', true],
                        ['location', 'Territory / City', 'text', true],
                        ['phone', 'Phone Number', 'tel', false],
                        ['email', 'Email Address', 'email', false],
                        ['username', 'Login Username', 'text', true],
                        ['password', 'Login Password', 'password', true],
                      ].map(([n, label, type, req]) => (
                        <InputField key={n} name={n} label={label} type={type} required={req} placeholder={label} />
                      ))}
                    </div>
                    <button type="submit" className="cartoon-btn px-5 py-3 text-xs flex items-center gap-2 uppercase">
                      <User size={14} /> Add Team Member
                    </button>
                  </form>
                </Section>

                <Section title="Current Team" desc="Manage existing agent accounts">
                  {(employees || []).length === 0 ? (
                    <div className="py-10 text-center text-gray-500">
                      <Users size={36} className="mx-auto mb-3 text-gray-300" />
                      <p className="text-xs font-semibold">No team members yet. Add your first agent above.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(employees || []).map(emp => (
                        <div key={emp.id} className="flex items-center gap-4 p-4 bg-white border-4 border-black rounded-xl shadow-[3px_3px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all">
                          <img 
                            src={emp.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=ef4444&color=fff`}
                            alt={emp.name} 
                            className="w-11 h-11 rounded-xl object-cover border-2 border-black" 
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-black text-xs uppercase tracking-wider">{emp.name}</p>
                            <p className="text-[10px] text-gray-500 font-semibold">{emp.location} · @{emp.username}</p>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-black text-black shrink-0 bg-[#fef08a] border-2 border-black rounded-full px-2.5 py-0.5">
                            {emp.phone || 'No Phone'}
                          </div>
                          <button 
                            onClick={() => handleDeleteEmployee(emp.id)}
                            className="p-2 border-2 border-black rounded-xl bg-red-100 hover:bg-red-200 text-black transition-colors shrink-0"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>
              </motion.div>
            )}

            {/* AD HEADQUARTERS */}
            {activeTab === 'ad-hq' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                <Section title="Ad Revenue Controls" desc="Configure client monetization layers & ad platforms">
                  <div className="space-y-6">
                    {/* Toggle Ad Status */}
                    <div className="flex items-center justify-between p-4 bg-[#fef08a] border-4 border-black rounded-xl shadow-[3px_3px_0px_#000]">
                      <div>
                        <p className="font-black text-black text-xs uppercase tracking-wider">Enable Sponsored Advertisements</p>
                        <p className="text-[10px] text-gray-600 font-semibold mt-0.5">Render banner ads on sidebars and lists to generate revenue.</p>
                      </div>
                      <button 
                        onClick={() => updateAdSettings(!adsEnabled, adNetwork)}
                        className={`cartoon-btn px-4 py-2 text-xs uppercase ${
                          adsEnabled ? 'cartoon-btn-red text-white' : 'cartoon-btn-yellow text-black'
                        }`}
                      >
                        {adsEnabled ? 'DISABLE ADS' : 'ENABLE ADS'}
                      </button>
                    </div>

                    {/* Network Select */}
                    <div>
                      <label className="block text-xs font-black text-black uppercase tracking-wider mb-2">Ad Distribution Network</label>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { id: 'adsense', label: 'Google AdSense', rate: 'Premium' },
                          { id: 'propeller', label: 'PropellerAds', rate: 'High Volume' },
                          { id: 'unity', label: 'Unity Network', rate: 'Simulated' }
                        ].map(net => (
                          <div 
                            key={net.id}
                            onClick={() => updateAdSettings(adsEnabled, net.id)}
                            className={`cartoon-card p-3.5 bg-white cursor-pointer flex flex-col justify-between h-20 transition-all ${
                              adNetwork === net.id ? 'bg-amber-100 border-red-500 shadow-[3px_3px_0px_#000] border-4' : 'hover:bg-amber-50/50'
                            }`}
                          >
                            <span className="text-[11px] font-black text-black uppercase tracking-wider">{net.label}</span>
                            <span className="bg-black text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded border border-black self-start">
                              {net.rate}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Simulated Stats */}
                    <div>
                      <p className="text-xs font-black text-black uppercase tracking-wider mb-2">Simulated Live Earnings Dashboard</p>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="cartoon-card p-3 bg-red-100 flex flex-col justify-between">
                          <span className="text-[9px] font-black text-black uppercase tracking-wider opacity-60">Total Ad Views</span>
                          <span className="text-xl font-black text-black mt-2">{adImpressions.toLocaleString()}</span>
                        </div>
                        <div className="cartoon-card p-3 bg-yellow-100 flex flex-col justify-between">
                          <span className="text-[9px] font-black text-black uppercase tracking-wider opacity-60">Registered Clicks</span>
                          <span className="text-xl font-black text-black mt-2">{adClicks.toLocaleString()}</span>
                        </div>
                        <div className="cartoon-card p-3 bg-emerald-100 flex flex-col justify-between">
                          <span className="text-[9px] font-black text-black uppercase tracking-wider opacity-60">Total Profit (Est.)</span>
                          <div className="mt-1 flex flex-col">
                            <span className="text-base font-black text-emerald-950">₹{mockEarningsINR.toFixed(2)}</span>
                            <span className="text-[9px] font-semibold text-emerald-800">${mockEarningsUSD.toFixed(2)} USD</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Section>
              </motion.div>
            )}

            {/* ADVANCED */}
            {activeTab === 'advanced' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                <Section title="Danger Zone" desc="Irreversible actions — proceed with caution">
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-red-100 border-4 border-black rounded-xl shadow-[3px_3px_0px_#000] gap-3">
                      <div>
                        <p className="font-black text-black text-xs uppercase tracking-wider">Clear Staging Queue</p>
                        <p className="text-[10px] text-gray-600 font-semibold mt-0.5">Removes all unverified lead logs from the dashboard database.</p>
                      </div>
                      <button className="cartoon-btn cartoon-btn-red px-4 py-2.5 text-xs uppercase self-stretch sm:self-auto">
                        Clear Queue
                      </button>
                    </div>
                  </div>
                </Section>

                <Section title="System Information" desc="Deployment environment metrics">
                  <div className="space-y-3">
                    {[
                      { label: 'Platform Engine', value: 'Minion Scraper Suite' },
                      { label: 'Release Build', value: 'v2.1.0 Cartoon-Revamp' },
                      { label: 'Node Instance', value: 'Self-hosted Localhost' },
                    ].map(row => (
                      <div key={row.label} className="flex items-center justify-between py-2 border-b-2 border-gray-100 last:border-0">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{row.label}</span>
                        <span className="text-xs font-black text-black">{row.value}</span>
                      </div>
                    ))}
                  </div>
                </Section>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, desc, children }) {
  return (
    <div className="bg-white cartoon-card overflow-hidden">
      <div className="px-6 py-5 border-b-4 border-black bg-amber-50/50">
        <h3 className="font-display font-black text-black text-sm uppercase tracking-wide">{title}</h3>
        <p className="text-xs text-gray-500 font-semibold mt-0.5">{desc}</p>
      </div>
      <div className="p-6 bg-white">{children}</div>
    </div>
  );
}

function InputField({ name, label, type, required, placeholder }) {
  return (
    <div className="flex flex-col">
      <label className="text-[10px] font-black text-black uppercase tracking-wider mb-2">{label}</label>
      <input 
        name={name} 
        type={type || 'text'} 
        required={required} 
        placeholder={placeholder}
        className="cartoon-input px-3.5 py-2.5 text-xs bg-white font-bold" 
      />
    </div>
  );
}
