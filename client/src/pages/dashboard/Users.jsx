import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Search, Edit3, Save, CheckCircle } from 'lucide-react';
import { API_URL } from '../../apiConfig';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editCredits, setEditCredits] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/public/admin/list`);
      setUsers(res.data);
    } catch (e) {
      console.error("Failed to fetch users", e);
    }
    setLoading(false);
  };

  const handleSaveCredits = async (userId) => {
    try {
      await axios.post(`${API_URL}/public/admin/credits`, {
        userId,
        credits: parseInt(editCredits)
      });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, credits: parseInt(editCredits) } : u));
      setEditingId(null);
    } catch (e) {
      alert("Failed to update credits");
    }
  };

  const handleToggleDeepExtractor = async (userId, currentValue) => {
    try {
      const res = await axios.post(`${API_URL}/public/admin/permissions`, {
        userId,
        deepExtractorEnabled: !currentValue
      });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, deepExtractorEnabled: !currentValue } : u));
    } catch (e) {
      alert("Failed to update permissions");
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 max-w-6xl mx-auto h-full overflow-y-auto font-sans">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Users size={20} className="text-indigo-600" />
            </div>
            Public Users & Credits
          </h1>
          <p className="text-gray-500 mt-2 font-medium">Manage marketplace users and their credit balances.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by name or email..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition"
            />
          </div>
          <div className="text-sm font-bold text-gray-500 ml-auto">
            {filteredUsers.length} Users Found
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 font-black">
                <th className="p-4 pl-6">User</th>
                <th className="p-4">Joined Date</th>
                <th className="p-4">Leads Revealed</th>
                <th className="p-4 text-center">Deep Extractor API</th>
                <th className="p-4 text-right pr-6">Credit Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-400 font-bold">Loading users...</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-400 font-bold">No public users found.</td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50 transition group">
                    <td className="p-4 pl-6">
                      <p className="font-bold text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500 font-medium">{user.email}</p>
                    </td>
                    <td className="p-4">
                      <span className="text-sm font-medium text-gray-600">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-sm font-bold text-gray-700 bg-gray-100 w-fit px-3 py-1 rounded-full">
                        {user.unlockedLeads?.length || 0}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => handleToggleDeepExtractor(user.id, user.deepExtractorEnabled)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${user.deepExtractorEnabled ? 'bg-violet-600' : 'bg-gray-200'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${user.deepExtractorEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      {editingId === user.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <input 
                            type="number" 
                            className="w-20 px-2 py-1 border border-indigo-300 rounded text-sm font-bold text-center focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={editCredits}
                            onChange={(e) => setEditCredits(e.target.value)}
                          />
                          <button 
                            onClick={() => handleSaveCredits(user.id)}
                            className="p-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded transition"
                          >
                            <Save size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-3">
                          <span className={`font-black text-lg ${user.credits > 0 ? 'text-indigo-600' : 'text-red-500'}`}>
                            {user.credits}
                          </span>
                          <button 
                            onClick={() => { setEditingId(user.id); setEditCredits(user.credits); }}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition opacity-0 group-hover:opacity-100"
                          >
                            <Edit3 size={16} />
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
  );
}
