import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Mail, User, ShieldAlert, ArrowRight, Sparkles } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002/api';

export default function LoginPage({ onLogin }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);

  const from = location.state?.from?.pathname || '/app/overview';

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (!email.trim()) return toast.error('Email is required!');

    try {
      setLoading(true);
      const res = await axios.post(`${API_URL}/public/auth`, {
        email: email.trim().toLowerCase(),
        name: name.trim() || undefined
      });

      if (res.data.success && res.data.user) {
        toast.success(`Welcome back, ${res.data.user.name}! 🚀`);
        
        // Save user to localStorage
        localStorage.setItem('indiascraper_client_user', JSON.stringify(res.data.user));
        
        // Use user ID as the client ID for continuing scrapes
        localStorage.setItem('indiascraper_client_id', res.data.user.id);
        
        onLogin(res.data.user);
        navigate(from, { replace: true });
      } else {
        toast.error('Authentication failed.');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to authenticate. Try again!');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestEntry = () => {
    try {
      setIsGuestLoading(true);
      // Retrieve or generate a guest client ID
      let guestId = localStorage.getItem('indiascraper_client_id');
      if (!guestId || !guestId.startsWith('client_')) {
        guestId = 'client_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('indiascraper_client_id', guestId);
      }

      const guestUser = {
        id: guestId,
        email: `${guestId}@anonymous.com`,
        name: `Guest_${guestId.substring(7, 12)}`,
        credits: 100,
        subscriptionTier: 'Free',
        isGuest: true
      };

      // Save guest user
      localStorage.setItem('indiascraper_client_user', JSON.stringify(guestUser));
      
      toast.success('Entering as Guest Scraper! 🤖');
      onLogin(guestUser);
      navigate(from, { replace: true });
    } catch (err) {
      toast.error('Guest access failed.');
    } finally {
      setIsGuestLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-black bg-[#fffbeb] font-sans flex items-center justify-center p-6 relative overflow-hidden">
      
      {/* Floaters decoration */}
      <div className="absolute top-10 left-10 text-4xl animate-bounce" style={{ animationDuration: '3s' }}>🤖</div>
      <div className="absolute bottom-10 right-10 text-4xl animate-bounce" style={{ animationDuration: '4s' }}>📞</div>
      <div className="absolute top-1/4 right-12 text-4xl animate-bounce" style={{ animationDuration: '5s' }}>🇮🇳</div>
      <div className="absolute bottom-1/4 left-12 text-4xl animate-bounce" style={{ animationDuration: '3.5s' }}>📈</div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 100 }}
        className="w-full max-w-md bg-white border-4 border-black rounded-3xl p-8 shadow-[6px_6px_0px_#000]"
      >
        <div className="text-center mb-8">
          <motion.div 
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.5 }}
            className="w-16 h-16 rounded-2xl bg-[#fbbf24] border-4 border-black flex items-center justify-center mx-auto shadow-[3px_3px_0px_#000] mb-4"
          >
            <span className="text-3xl">🔑</span>
          </motion.div>
          
          <h2 className="text-2xl font-black uppercase tracking-tight text-black">
            India<span className="text-[#ef4444]">Scraper</span> Login
          </h2>
          <p className="text-xs text-gray-500 font-semibold mt-1">
            Access your scraping minions & saved leads
          </p>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-5">
          <div>
            <label className="block text-xs font-black uppercase text-black mb-1.5 flex items-center gap-1">
              <Mail size={12} /> Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. you@domain.com"
              className="w-full px-4 py-3 cartoon-input focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-black mb-1.5 flex items-center gap-1">
              <User size={12} /> Full Name (Optional)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rahul Kumar"
              className="w-full px-4 py-3 cartoon-input focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading || isGuestLoading}
            className="cartoon-btn cartoon-btn-yellow w-full py-3.5 mt-2 flex items-center justify-center gap-2 text-xs uppercase"
          >
            {loading ? 'Authenticating...' : 'Sign In / Sign Up 🚀'}
            {!loading && <ArrowRight size={14} />}
          </button>
        </form>

        <div className="relative flex py-4 items-center">
          <div className="flex-grow border-t-2 border-dashed border-gray-300"></div>
          <span className="flex-shrink mx-4 text-xs font-black text-gray-400 uppercase">OR</span>
          <div className="flex-grow border-t-2 border-dashed border-gray-300"></div>
        </div>

        <div className="space-y-4">
          <button
            type="button"
            onClick={handleGuestEntry}
            disabled={loading || isGuestLoading}
            className="cartoon-btn cartoon-btn-red w-full py-3.5 flex items-center justify-center gap-2 text-xs uppercase"
            style={{ backgroundColor: '#10b981' }} // Emerald green override
          >
            {isGuestLoading ? 'Loading Guest...' : 'Frictionless Guest Scraper 🕵️'}
          </button>

          <div className="bg-[#eff6ff] border-2 border-black rounded-2xl p-3 flex items-start gap-2.5 shadow-[2px_2px_0px_#000]">
            <Sparkles size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-blue-900 font-semibold leading-relaxed">
              <strong>Frictionless Trial:</strong> Enter as guest to instantly get 100 free credits without any signup or password. Log in later with your email to sync and keep your leads forever!
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
