import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings, User, Shield, Upload, MapPin, Trash2, Users,
  RefreshCw, Save, Eye, EyeOff, AlertTriangle, Check,
  Database, Sliders, Key, Bell
} from 'lucide-react';
import { useScraper } from '../../context/ScraperContext';
import toast from 'react-hot-toast';
import axios from 'axios';
import { API_URL } from '../../apiConfig';

const TAB_ITEMS = [
  { id: 'general', icon: <Sliders size={16} />, label: 'General' },
  { id: 'credentials', icon: <Key size={16} />, label: 'Admin Credentials' },
  { id: 'team', icon: <Users size={16} />, label: 'Team Members' },
  { id: 'advanced', icon: <Database size={16} />, label: 'Advanced' },
];

export default function SettingsPage() {
  const { searchRadius, setSearchRadius, employees, fetchEmployees, handleFileUpload, onLogout } = useScraper();
  const [activeTab, setActiveTab] = useState('general');
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleUpdateCredentials = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.put(`${API_URL}/auth/admin`, {
        username: e.target.username.value,
        password: e.target.password.value,
      });
      toast.success('Credentials updated. Please log in again.');
      onLogout();
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
    <div className="min-h-full bg-[#f7f8fa]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-8 py-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3">
            <div className="w-9 h-9 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center border border-violet-100">
              <Settings size={18} />
            </div>
            Settings
          </h1>
          <p className="text-sm text-gray-500 mt-1 ml-12">Admin configuration and team management</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-8">
        <div className="flex gap-6">
          {/* Sidebar tabs */}
          <div className="w-52 flex-shrink-0">
            <nav className="space-y-1 bg-white rounded-2xl border border-gray-100 p-2 shadow-sm sticky top-6">
              {TAB_ITEMS.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === tab.id ? 'bg-violet-50 text-violet-700 border border-violet-100' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
                  {tab.icon} {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 space-y-6">

            {/* GENERAL */}
            {activeTab === 'general' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                <Section title="Scraping Configuration" desc="Control how the extraction engine behaves">
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">
                        Search Radius: <span className="text-violet-600">{searchRadius} km</span>
                      </label>
                      <p className="text-xs text-gray-400 mb-3">0 = exact city only. Higher values expand the geographic boundary for map searches.</p>
                      <input type="range" min="0" max="100" step="10" value={searchRadius}
                        onChange={e => setSearchRadius(Number(e.target.value))}
                        className="w-full accent-violet-600" />
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>0km (Exact)</span><span>50km</span><span>100km</span>
                      </div>
                    </div>
                  </div>
                </Section>

                <Section title="Bulk Target Injection" desc="Upload a CSV to queue multiple extraction jobs at once">
                  <div>
                    <p className="text-sm text-gray-500 mb-4">Upload a CSV file with two columns: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">Category</code> and <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">City</code>. Each row becomes a background extraction job.</p>
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-violet-400 hover:bg-violet-50/30 transition-all group">
                      <Upload size={24} className="text-gray-300 group-hover:text-violet-400 transition-colors mb-2" />
                      <span className="text-sm font-semibold text-gray-400 group-hover:text-violet-600">Click to upload CSV</span>
                      <span className="text-xs text-gray-300 mt-0.5">Max 500 rows</span>
                      <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                    </label>
                  </div>
                </Section>
              </motion.div>
            )}

            {/* CREDENTIALS */}
            {activeTab === 'credentials' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                <Section title="Admin Credentials" desc="Update the admin login username and password">
                  <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-xl mb-5">
                    <AlertTriangle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-amber-700">After updating your credentials, you will be automatically logged out and must sign in again with the new details.</p>
                  </div>
                  <form onSubmit={handleUpdateCredentials} className="space-y-4">
                    <InputField name="username" label="New Username" type="text" required placeholder="Enter new username" />
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">New Password</label>
                      <div className="relative">
                        <input name="password" type={showPw ? 'text' : 'password'} required placeholder="Enter new password"
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-50 pr-12" />
                        <button type="button" onClick={() => setShowPw(!showPw)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
                          {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <button type="submit" disabled={saving}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold rounded-xl hover:opacity-90 transition-all shadow-md shadow-violet-200 disabled:opacity-60">
                      {saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
                      {saving ? 'Saving...' : 'Update Credentials'}
                    </button>
                  </form>
                </Section>
              </motion.div>
            )}

            {/* TEAM */}
            {activeTab === 'team' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                <Section title="Add Team Member" desc="Create a new agent account for your sales team">
                  <form onSubmit={handleAddEmployee}>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="col-span-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Profile Photo</label>
                        <input name="avatar" type="file" accept="image/*"
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-700 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-violet-50 file:text-violet-700 file:font-semibold file:text-xs cursor-pointer" />
                      </div>
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
                    <button type="submit" className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold rounded-xl hover:opacity-90 transition-all shadow-md shadow-violet-200">
                      <User size={15} /> Add Team Member
                    </button>
                  </form>
                </Section>

                <Section title="Current Team" desc="Manage existing agent accounts">
                  {(employees || []).length === 0 ? (
                    <div className="py-10 text-center text-gray-400">
                      <Users size={36} className="mx-auto mb-3 opacity-20" />
                      <p className="text-sm">No team members yet. Add your first agent above.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(employees || []).map(emp => (
                        <div key={emp.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-violet-100 transition-colors">
                          <img src={emp.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=7c3aed&color=fff`}
                            alt={emp.name} className="w-11 h-11 rounded-xl object-cover border border-gray-200 shadow-sm" />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900 text-sm">{emp.name}</p>
                            <p className="text-xs text-gray-400">{emp.location} · @{emp.username}</p>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            {emp.phone && <span className="flex items-center gap-1">{emp.phone}</span>}
                          </div>
                          <button onClick={() => handleDeleteEmployee(emp.id)}
                            className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>
              </motion.div>
            )}

            {/* ADVANCED */}
            {activeTab === 'advanced' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                <Section title="Danger Zone" desc="Irreversible actions — proceed with caution">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-red-50 border border-red-100 rounded-xl">
                      <div>
                        <p className="font-bold text-red-700 text-sm">Clear Staging Queue</p>
                        <p className="text-xs text-red-500 mt-0.5">Removes all unverified leads from staging. Cannot be undone.</p>
                      </div>
                      <button className="px-4 py-2 text-sm font-bold text-red-600 bg-white border border-red-200 rounded-xl hover:bg-red-600 hover:text-white transition-all">
                        Clear Queue
                      </button>
                    </div>
                  </div>
                </Section>

                <Section title="About" desc="Platform information">
                  <div className="space-y-3">
                    {[
                      { label: 'Platform', value: 'OmniLead Intelligence Platform' },
                      { label: 'Version', value: '2.0.0 Production' },
                      { label: 'Environment', value: 'Self-hosted' },
                    ].map(row => (
                      <div key={row.label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{row.label}</span>
                        <span className="text-sm font-semibold text-gray-700">{row.value}</span>
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
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-50">
        <h3 className="font-bold text-gray-900">{title}</h3>
        <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function InputField({ name, label, type, required, placeholder }) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{label}</label>
      <input name={name} type={type || 'text'} required={required} placeholder={placeholder}
        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-50 transition-all" />
    </div>
  );
}
