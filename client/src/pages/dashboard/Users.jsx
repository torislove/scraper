import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Search, Edit3, Save, CheckCircle, Shield, CreditCard, Sparkles, RefreshCw } from 'lucide-react';
import { API_URL } from '../../apiConfig';
import toast from 'react-hot-toast';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editCredits, setEditCredits] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/public/admin/list`);
      setUsers(res.data);
    } catch (e) {
      console.error("Failed to fetch users", e);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSaveCredits = async (userId) => {
    try {
      await axios.post(`${API_URL}/public/admin/credits`, {
        userId,
        credits: parseInt(editCredits)
      });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, credits: parseInt(editCredits) } : u));
      setEditingId(null);
      toast.success('Credits updated successfully');
    } catch (e) {
      toast.error("Failed to update credits");
    }
  };

  const handleToggleDeepExtractor = async (userId, currentValue) => {
    try {
      await axios.post(`${API_URL}/public/admin/permissions`, {
        userId,
        deepExtractorEnabled: !currentValue
      });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, deepExtractorEnabled: !currentValue } : u));
      toast.success(`Deep Extractor ${!currentValue ? 'enabled' : 'disabled'}`);
    } catch (e) {
      toast.error("Failed to update permissions");
    }
  };

  const filteredUsers = users.filter(u => 
    (u.name && u.name.toLowerCase().includes(searchQuery.toLowerCase())) || 
    (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-full bg-[#07070d] text-slate-100 flex flex-col font-sans">
      
      {/* ── TOP HEADER ── */}
      <div className="border-b border-white/[0.08] bg-[#0c0c16]/90 backdrop-blur-xl px-6 py-5 sticky top-0 z-30">
        <div className="max-w-[1700px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20 border border-white/10">
              <Users className="text-white" size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-white tracking-tight">Marketplace User Accounts</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  Access & Credits
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage public client accounts, credit allocations, and API permissions
              </p>
            </div>
          </div>

          <button
            onClick={fetchUsers}
            className="p-2 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 rounded-xl border border-white/[0.08] transition-all flex items-center gap-2 text-xs font-bold"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh List</span>
          </button>
        </div>
      </div>

      <div className="max-w-[1700px] mx-auto px-6 py-6 w-full flex-1">
        
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c0c16]/80 overflow-hidden shadow-2xl">
          
          {/* Table Search Toolbar */}
          <div className="p-4 border-b border-white/[0.08] bg-white/[0.01] flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search user by name or email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white/[0.03] border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-all"
              />
            </div>
            <div className="text-xs font-mono font-bold text-slate-400">
              {filteredUsers.length} Active Accounts
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.02] text-[10px] uppercase tracking-wider text-slate-400 font-black">
                  <th className="p-4 pl-6">Client Identity</th>
                  <th className="p-4">Registered Date</th>
                  <th className="p-4">Unlocked Leads</th>
                  <th className="p-4 text-center">Deep Extractor API</th>
                  <th className="p-4 text-right pr-6">Credit Allocation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="p-12 text-center text-slate-500 text-xs font-mono">
                      Querying registered clients...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-12 text-center text-slate-500 text-xs">
                      No public users registered yet.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-white/[0.02] transition group">
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600/30 to-indigo-600/30 border border-violet-500/30 flex items-center justify-center text-violet-300 font-black text-xs">
                            {user.name?.[0] || 'U'}
                          </div>
                          <div>
                            <p className="font-bold text-white text-xs">{user.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-xs text-slate-300 font-mono">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Active'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-white/[0.03] text-slate-200 border border-white/[0.06]">
                          {user.unlockedLeads?.length || 0} leads
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleToggleDeepExtractor(user.id, user.deepExtractorEnabled)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                            user.deepExtractorEnabled ? 'bg-violet-600' : 'bg-white/10'
                          }`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                              user.deepExtractorEnabled ? 'translate-x-4.5' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </td>
                      <td className="p-4 pr-6 text-right">
                        {editingId === user.id ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <input
                              type="number"
                              className="w-16 px-2 py-1 bg-black border border-violet-500 rounded-lg text-xs font-mono font-bold text-center text-white focus:outline-none"
                              value={editCredits}
                              onChange={e => setEditCredits(e.target.value)}
                            />
                            <button
                              onClick={() => handleSaveCredits(user.id)}
                              className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition"
                            >
                              <Save size={13} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2.5">
                            <span className={`font-mono font-black text-sm ${user.credits > 0 ? 'text-violet-400' : 'text-red-400'}`}>
                              {user.credits}
                            </span>
                            <button
                              onClick={() => { setEditingId(user.id); setEditCredits(user.credits); }}
                              className="p-1 text-slate-400 hover:text-white bg-white/[0.03] rounded-lg transition opacity-0 group-hover:opacity-100"
                            >
                              <Edit3 size={13} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}
