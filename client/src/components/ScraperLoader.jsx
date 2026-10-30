import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, Zap, Globe, ShieldCheck, Database, Search } from 'lucide-react';

export default function ScraperLoader({
  targetQuery = '',
  targetLocation = '',
  statusText = 'Autonomous NAS Swarm Active',
  compact = false
}) {
  const [pulsePhase, setPulsePhase] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setPulsePhase(p => (p + 1) % 4);
    }, 1400);
    return () => clearInterval(timer);
  }, []);

  const STATUS_MESSAGES = [
    'Autonomous NAS Swarm scanning grid nodes...',
    'Probing Google Places, Maps & SERP indices...',
    'Extracting phone numbers & WhatsApp-ready contacts...',
    'Validating geospatial containment & coordinates...'
  ];

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-violet-950/40 border border-violet-500/30 text-xs">
        <div className="relative w-4 h-4 flex items-center justify-center">
          <span className="absolute w-full h-full rounded-full bg-cyan-400/30 animate-ping" />
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        </div>
        <span className="font-mono font-bold text-white text-[11px] truncate">
          Scraper<span className="text-cyan-400">.co.in</span> Scanning...
        </span>
      </div>
    );
  }

  return (
    <div className="relative w-full py-10 px-4 flex flex-col items-center justify-center overflow-hidden rounded-3xl bg-slate-950/80 border border-slate-800/80 shadow-2xl backdrop-blur-xl">
      {/* Background Holographic Glow & Radial Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-violet-600/10 via-transparent to-transparent pointer-events-none" />

      {/* Cyber Radar Concentric Rings */}
      <div className="relative w-32 h-32 flex items-center justify-center mb-5">
        {/* Outer Ring 1 */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 rounded-full border border-dashed border-cyan-500/30"
        />

        {/* Outer Ring 2 */}
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-2 rounded-full border border-violet-500/40"
        />

        {/* Laser Sweep Beam */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          className="absolute w-full h-full rounded-full"
          style={{
            background: 'conic-gradient(from 0deg at 50% 50%, rgba(6, 182, 212, 0.35) 0deg, rgba(139, 92, 246, 0.1) 45deg, transparent 90deg)'
          }}
        />

        {/* Center Emblem */}
        <div className="relative z-10 w-16 h-16 rounded-2xl bg-slate-900 border border-cyan-500/50 shadow-lg shadow-cyan-500/20 flex flex-col items-center justify-center">
          <Radio size={24} className="text-cyan-400 animate-pulse" />
          <span className="text-[8px] font-mono font-black text-violet-300 mt-0.5">NAS</span>
        </div>
      </div>

      {/* Branded Title */}
      <div className="text-center space-y-1 mb-3 z-10">
        <h3 className="text-base sm:text-lg font-black tracking-tight flex items-center justify-center gap-2">
          <span className="text-white">Scraper</span>
          <span className="text-cyan-400 font-extrabold">.co.in</span>
          <span className="px-2 py-0.5 rounded-full bg-violet-600/20 border border-violet-500/40 text-violet-300 text-[10px] font-mono font-bold uppercase">
            Ultra-Blazing Swarm
          </span>
        </h3>

        {/* Active Target Banner */}
        {(targetQuery || targetLocation) && (
          <p className="text-xs text-slate-300 font-medium">
            Probing: <strong className="text-cyan-300 font-bold">"{targetQuery || 'Businesses'}"</strong> in{' '}
            <strong className="text-emerald-400 font-bold">{targetLocation || 'India'}</strong>
          </p>
        )}
      </div>

      {/* Dynamic Animated Status Ticker */}
      <div className="z-10 flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-white/10 text-xs font-mono text-slate-300 shadow-inner">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
        <AnimatePresence mode="wait">
          <motion.span
            key={pulsePhase}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="text-cyan-300 font-semibold"
          >
            {STATUS_MESSAGES[pulsePhase]}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Telemetry Footer */}
      <div className="mt-4 flex items-center gap-4 text-[10px] font-mono text-slate-500 z-10">
        <span className="flex items-center gap-1">
          <Zap size={11} className="text-yellow-400" />
          <span>Multi-Engine Parallel</span>
        </span>
        <span>•</span>
        <span className="flex items-center gap-1">
          <Globe size={11} className="text-cyan-400" />
          <span>Pan-India Coverage</span>
        </span>
        <span>•</span>
        <span className="flex items-center gap-1">
          <ShieldCheck size={11} className="text-emerald-400" />
          <span>100% Free & Open Source</span>
        </span>
      </div>
    </div>
  );
}
