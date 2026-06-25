import React, { useState, useEffect } from 'react';
import { Sparkles, Megaphone } from 'lucide-react';

const ADS_LIST = [
  {
    sponsor: 'Vercel Minion Deploy',
    text: 'Ship your frontends with zero config. Just cartoon vibes and instant deploys! 🚀',
    cta: 'Fly Now',
    color: '#ef4444' // Red
  },
  {
    sponsor: 'DigitalOcean Shark Cloud',
    text: 'Cute little shark VPS instances starting at just $4/mo. Super snappy! 🦈',
    cta: 'Catch Shark',
    color: '#fbbf24' // Yellow
  },
  {
    sponsor: 'Supabase Zap DB',
    text: 'The open-source PostgreSQL database with real-time zapping superpowers! ⚡',
    cta: 'Zap Database',
    color: '#10b981' // Green
  },
  {
    sponsor: 'OmniLead Premium Power',
    text: 'Deploy 5,000 scraping minions in any city instantly. Buy Premium! 💎',
    cta: 'Go Super Saiyan',
    color: '#3b82f6' // Blue
  }
];

export default function SponsorAd({ layout = 'vertical', onAdClick }) {
  const [currentIdx, setCurrentIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIdx(prev => (prev + 1) % ADS_LIST.length);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  const ad = ADS_LIST[currentIdx];

  const handleAdClick = () => {
    if (onAdClick) onAdClick();
    alert(`Thank you for supporting us! Redirecting to simulated sponsor: ${ad.sponsor}`);
  };

  if (layout === 'horizontal') {
    return (
      <div 
        onClick={handleAdClick}
        className="cartoon-card cursor-pointer p-4 bg-amber-100/80 border-4 border-black shadow-[4px_4px_0px_#000] flex items-center justify-between gap-4 my-6 hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-[2px_2px_0px_#000] transition-all relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-1 bg-red-500 text-[8px] font-black text-white border-l-2 border-b-2 border-black rotate-3 uppercase tracking-wider">
          Sponsored Ad
        </div>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-white border-2 border-black flex items-center justify-center shrink-0" style={{ boxShadow: '2px 2px 0px #000' }}>
            <Megaphone className="text-red-500 animate-bounce" size={20} />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-black uppercase text-red-600 flex items-center gap-1.5 font-display">
              {ad.sponsor} <Sparkles size={11} className="text-amber-500 animate-pulse" />
            </h4>
            <p className="text-[11px] text-gray-700 font-semibold truncate max-w-[280px] sm:max-w-md md:max-w-lg mt-0.5">
              {ad.text}
            </p>
          </div>
        </div>
        <button 
          type="button"
          className="cartoon-btn px-4 py-1.5 text-xs font-black text-white uppercase shrink-0"
          style={{ backgroundColor: ad.color, border: '2px solid black', boxShadow: '2px 2px 0px #000' }}
        >
          {ad.cta}
        </button>
      </div>
    );
  }

  return (
    <div 
      onClick={handleAdClick}
      className="cartoon-card cursor-pointer p-4 bg-amber-50 border-4 border-black shadow-[4px_4px_0px_#000] flex flex-col gap-3 my-4 hover:-translate-y-0.5 hover:translate-x-0.5 hover:shadow-[2px_2px_0px_#000] transition-all relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 px-2 py-0.5 bg-red-500 text-[8px] font-black text-white border-l-2 border-b-2 border-black uppercase tracking-wider font-display">
        Sponsor
      </div>
      <div className="flex items-center gap-2 mt-2">
        <div className="w-8 h-8 rounded-lg bg-white border-2 border-black flex items-center justify-center shadow-[1px_1px_0px #000]">
          <Megaphone className="text-red-500 animate-bounce" size={16} />
        </div>
        <h4 className="text-[10px] font-black uppercase text-red-600 tracking-wider font-display">
          {ad.sponsor}
        </h4>
      </div>
      <p className="text-[10px] text-gray-700 font-semibold leading-relaxed">
        {ad.text}
      </p>
      <button 
        type="button"
        className="cartoon-btn w-full py-2 text-[10px] font-black text-white uppercase text-center mt-1"
        style={{ backgroundColor: ad.color, border: '2px solid black', boxShadow: '2px 2px 0px #000' }}
      >
        {ad.cta}
      </button>
    </div>
  );
}
