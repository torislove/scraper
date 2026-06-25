import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Check, ArrowLeft, Zap, Sparkles, Building2, Loader2 } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API_URL } from '../apiConfig';

export default function PricingPage() {
  const navigate = useNavigate();
  const [isAnnual, setIsAnnual] = useState(false);
  const [publicUser, setPublicUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('gomandap_public_user')); } catch { return null; }
  });
  
  const [processingTier, setProcessingTier] = useState(null);

  const handleSubscribe = async (tierName) => {
    if (!publicUser) {
      toast('Please sign in to subscribe.', { icon: '🔒' });
      navigate('/marketplace');
      return;
    }
    
    setProcessingTier(tierName);
    
    try {
      // Dummy Checkout Simulation
      const res = await axios.post(`${API_URL}/public/checkout/dummy`, {
        userId: publicUser.id,
        tier: tierName
      });
      
      if (res.data.success) {
        setPublicUser(res.data.user);
        localStorage.setItem('gomandap_public_user', JSON.stringify(res.data.user));
        toast.success(`Successfully upgraded to ${tierName}!`);
        setTimeout(() => navigate('/marketplace'), 2000);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Payment failed');
    }
    
    setProcessingTier(null);
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#1a1a2e] overflow-x-hidden font-sans relative selection:bg-purple-200">
      
      {/* Tech UI / Clean SVG Background Animations */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(168, 85, 247, 0.1)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
        {/* Animated Tech Nodes */}
        <motion.div 
          animate={{ x: [0, 100, 0], y: [0, 50, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[20%] left-[10%] w-[500px] h-[500px] bg-purple-400/10 blur-[100px] rounded-full"
        />
        <motion.div 
          animate={{ x: [0, -100, 0], y: [0, -50, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[20%] right-[10%] w-[400px] h-[400px] bg-cyan-400/10 blur-[100px] rounded-full"
        />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 flex items-center justify-between px-8 py-6 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-600 hover:text-purple-600 transition-colors font-medium"
        >
          <ArrowLeft size={18} /> Back to OmniLead
        </button>
        <div className="flex gap-4 items-center">
          {publicUser ? (
            <div className="flex items-center gap-3">
              <div className="text-right hidden md:block">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Current Plan</p>
                <p className="text-sm font-black text-purple-600">{publicUser.subscriptionTier || 'Free'}</p>
              </div>
            </div>
          ) : (
            <button onClick={() => navigate('/marketplace')} className="text-gray-600 hover:text-purple-600 font-medium px-4 py-2">Login</button>
          )}
          <button className="px-5 py-2 text-sm font-bold bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-lg shadow-purple-500/30">
            Request Demo
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-6 pt-20 pb-32 flex flex-col items-center">
        
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-center text-[#1a1a2e] mb-12">
          OmniLead AI Pricing Plans
        </h1>

        {/* Toggle with Hand-drawn Arrow */}
        <div className="relative mb-20">
          <div className="absolute -top-8 -right-40 md:-right-48 hidden md:flex flex-col items-center">
            <span className="text-blue-600 font-caveat text-xl rotate-[-5deg]">Get two months free</span>
            <svg width="60" height="40" viewBox="0 0 60 40" fill="none" className="mt-1 text-blue-600">
              <path d="M5,5 Q30,-10 50,15 T45,35" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <path d="M40,30 L45,35 L50,25" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>
          </div>
          
          <div className="flex items-center bg-white border border-gray-200 p-1 rounded-xl shadow-sm">
            <button 
              onClick={() => setIsAnnual(false)}
              className={`px-8 py-2.5 rounded-lg text-sm font-bold transition-all ${!isAnnual ? 'bg-gray-100 text-gray-900 shadow' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Monthly
            </button>
            <button 
              onClick={() => setIsAnnual(true)}
              className={`px-8 py-2.5 rounded-lg text-sm font-bold transition-all ${isAnnual ? 'bg-gray-100 text-gray-900 shadow' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Annually
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full items-start">
          
          {/* Silver */}
          <PricingCard 
            title="Weekly Pro"
            price={isAnnual ? "33.16" : "40.83"}
            billingText={isAnnual ? "$398 billed upon purchase" : "Billed weekly"}
            onSubscribe={() => handleSubscribe('Weekly Pro')}
            isProcessing={processingTier === 'Weekly Pro'}
            features={[
              { text: "500 Lead Credits", value: "500" },
              { text: "DeepSeek AI Parsing", icon: <Check size={16} className="text-purple-500" /> },
              { text: "CSV Export Capability", icon: <Check size={16} className="text-purple-500" /> }
            ]}
          />

          {/* Gold (Highlighted) */}
          <PricingCard 
            title="Monthly Enterprise"
            price={isAnnual ? "67.50" : "82.50"}
            billingText={isAnnual ? "$810 billed upon purchase" : "Billed monthly"}
            isPopular={true}
            onSubscribe={() => handleSubscribe('Monthly Enterprise')}
            isProcessing={processingTier === 'Monthly Enterprise'}
            features={[
              { text: "All the benefits of Weekly Pro, plus:", isHeading: true },
              { text: "Lead Credits", value: "3000", isHighlighted: true },
              { text: "DeepSeek Semantic Verification", icon: <Check size={16} className="text-purple-500" /> },
              { text: "Priority Phone Support", icon: <Check size={16} className="text-purple-500" /> },
            ]}
          />

          {/* Enterprise */}
          <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-xl shadow-gray-200/50 relative flex flex-col h-full mt-4 md:mt-0">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-700 mb-6">Enterprise</h3>
              <p className="text-sm font-bold text-gray-900 mb-8 max-w-[200px] mx-auto">Get a plan tailored to your unique business needs.</p>
              <button className="w-full py-3 px-4 rounded-lg font-bold text-purple-600 bg-white border-2 border-purple-200 hover:border-purple-600 transition-colors">
                Contact us
              </button>
            </div>
            
            <div className="mt-8 space-y-4 text-sm text-gray-600 flex-1">
              <div className="font-bold text-gray-800 mb-2">All the benefits of Gold, plus:</div>
              <FeatureItem text="Personalized onboarding" />
              <FeatureItem text="Team training" />
              <FeatureItem text="Campaign setup and management" />
              <FeatureItem text="Dedicated Account Manager" />
              <FeatureItem text="Custom Interception Scripts" />
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

function PricingCard({ title, price, billingText, features, isPopular = false, onSubscribe, isProcessing }) {
  return (
    <div className={`bg-white rounded-2xl border ${isPopular ? 'border-purple-400 shadow-2xl shadow-purple-500/20 md:-mt-6 z-10' : 'border-gray-100 shadow-xl shadow-gray-200/50 mt-4 md:mt-0'} relative flex flex-col h-full`}>
      
      {isPopular && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#dfb22b] text-white text-xs font-bold px-8 py-2 rounded-sm clip-banner shadow-lg">
          Most Popular
        </div>
      )}

      <div className={`p-8 text-center border-b ${isPopular ? 'border-purple-100' : 'border-gray-100'}`}>
        <h3 className="text-xl font-medium text-gray-600 mb-4">{title}</h3>
        <div className="flex items-start justify-center gap-1 mb-2">
          <span className="text-xl font-bold mt-2">$</span>
          <span className="text-6xl font-black text-gray-900 tracking-tight">{price}</span>
          <span className="text-xl font-bold text-gray-500 mt-auto mb-2">/mo</span>
        </div>
        
        <button 
          onClick={onSubscribe}
          disabled={isProcessing}
          className={`w-full flex items-center justify-center gap-2 mt-6 py-3 px-4 rounded-lg font-bold transition-all ${isPopular ? 'text-purple-600 bg-white border-2 border-purple-200 hover:border-purple-600' : 'text-purple-600 bg-white border-2 border-purple-200 hover:border-purple-600'}`}
        >
          {isProcessing ? <Loader2 size={16} className="animate-spin" /> : 'Subscribe'}
        </button>
        <p className="text-xs text-gray-400 mt-4 font-medium">{billingText}</p>
      </div>

      <div className={`p-8 space-y-4 text-sm flex-1 ${isPopular ? 'bg-[#fafbfe]' : ''}`}>
        {features.map((f, i) => (
          <div key={i}>
            {f.isHeading ? (
              <div className="font-bold text-gray-800 mb-4">{f.text}</div>
            ) : (
              <div className="flex items-start gap-3">
                {f.icon ? (
                  <div className="mt-0.5 bg-purple-100 p-0.5 rounded-full">{f.icon}</div>
                ) : f.value ? (
                  <div className="font-bold text-purple-700 min-w-[40px]">{f.value}</div>
                ) : (
                  <div className="mt-0.5 bg-purple-100 p-0.5 rounded-full"><Check size={12} className="text-purple-500" /></div>
                )}
                
                {f.isHighlighted ? (
                  <div className="flex-1 bg-purple-100 text-purple-900 px-3 py-1.5 rounded text-xs font-medium border border-purple-200/50">
                    {f.text}
                  </div>
                ) : (
                  <span className="text-gray-600 flex-1">{f.text}</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function FeatureItem({ text }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 bg-purple-100 p-0.5 rounded-full shadow-sm">
        <Check size={12} className="text-purple-500" strokeWidth={3} />
      </div>
      <span className="text-gray-600">{text}</span>
    </div>
  );
}
