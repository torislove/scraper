import React, { useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Shield, Loader2, Eye, EyeOff, WifiOff } from 'lucide-react';
import { API_URL } from './apiConfig';

// Offline fallback credentials (for deployed version without backend access)
const OFFLINE_ADMIN = { username: 'admin', password: 'password123' };
const OFFLINE_EMPLOYEES = [
  { username: 'telecaller1', password: 'password123', name: 'Agent 1', location: 'Guntur', role: 'employee', id: 'emp_1' },
];

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const tryOfflineLogin = (username, password) => {
    if (username === OFFLINE_ADMIN.username && password === OFFLINE_ADMIN.password) {
      return { success: true, user: { role: 'admin', name: 'Administrator' } };
    }
    const emp = OFFLINE_EMPLOYEES.find(e => e.username === username && e.password === password);
    if (emp) {
      return { success: true, user: { role: 'employee', name: emp.name, location: emp.location, id: emp.id } };
    }
    return { success: false };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await axios.post(`${API_URL}/auth/login`, { username, password }, { timeout: 5000 });
      if (res.data.success) {
        setIsOffline(false);
        onLogin(res.data.user);
      }
    } catch (err) {
      // If network error (backend not reachable), try offline login
      const isNetworkError = !err.response;
      if (isNetworkError) {
        setIsOffline(true);
        const offlineResult = tryOfflineLogin(username, password);
        if (offlineResult.success) {
          onLogin({ ...offlineResult.user, offlineMode: true });
          return;
        } else {
          setError('Invalid credentials (offline mode).');
        }
      } else {
        setError(err.response?.data?.message || 'Login failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        backgroundImage: 'url("https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
      
      <motion.div 
        animate={{ y: [-20, 20, -20], x: [-20, 20, -20] }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/30 rounded-full blur-[100px] will-change-transform"
      />
      <motion.div 
        animate={{ y: [20, -20, 20], x: [20, -20, 20] }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/30 rounded-full blur-[100px] will-change-transform"
      />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
        className="relative w-full max-w-md bg-white/5 backdrop-blur-2xl border border-white/20 shadow-2xl rounded-3xl p-10 will-change-transform"
      >
        <div className="absolute top-6 left-6">
          <button 
            onClick={() => window.location.href = '/'}
            className="text-white/50 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium"
          >
            ← Back to Home
          </button>
        </div>

        <div className="flex flex-col items-center mb-8 mt-4">
          <motion.div 
            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }}
            className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-blue-500/20"
          >
            <Shield className="text-white" size={36} />
          </motion.div>
          <h1 className="text-3xl font-black text-white tracking-tight">OmniLead AI</h1>
          <p className="text-white/60 text-sm mt-2 font-medium">Enterprise Intelligence System</p>
        </div>

        {/* Offline mode badge */}
        {isOffline && (
          <div className="mb-4 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-xs flex items-center gap-2">
            <WifiOff size={14} />
            <span><b>Offline Mode</b> — Backend unreachable. Using local credentials.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="bg-red-500/20 text-red-300 text-sm font-bold p-4 rounded-xl border border-red-500/30 flex items-center gap-2">
              ⚠️ {error}
            </motion.div>
          )}
          
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-white/70 uppercase tracking-widest ml-1">Username</label>
            <input 
              type="text" 
              required
              value={username} onChange={e => setUsername(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/30 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all backdrop-blur-md" 
              placeholder="admin"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-white/70 uppercase tracking-widest ml-1">Password</label>
            <div className="relative">
              <input 
                type={showPassword ? 'text' : 'password'}
                required
                value={password} onChange={e => setPassword(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 pr-14 text-white placeholder-white/30 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all backdrop-blur-md" 
                placeholder="password123"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <p className="text-white/30 text-xs ml-1 mt-1">Default: admin / password123</p>
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-black py-4 rounded-2xl mt-6 flex justify-center items-center gap-2 hover:from-blue-500 hover:to-purple-500 transition-all shadow-lg shadow-blue-500/25 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'Secure Login'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
