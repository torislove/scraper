import React from 'react';
import ThreeBrandLogo from './ThreeBrandLogo';
import { Sparkles, Shield, Cpu } from 'lucide-react';

export default function ThreeLoadingScreen({
  message = 'Initializing Sovereign Lead Harvester...',
  subMessage = 'Calibrating multi-lane Go Gosom & 11 Sovereign Directory shards',
  fullScreen = false
}) {
  const content = (
    <div className="flex flex-col items-center justify-center text-center p-8 select-none animate-in fade-in zoom-in-95 duration-500">
      {/* 1. 3D WebGL Rotating Monogram */}
      <div className="relative flex items-center justify-center mb-6">
        <div className="absolute inset-0 bg-amber-400/20 blur-2xl rounded-full scale-125 animate-pulse" />
        <ThreeBrandLogo size={96} speed={1.8} interactive={true} className="relative z-10 drop-shadow-xl" />
        <div className="absolute inset-0 border-2 border-amber-400/30 rounded-full animate-ping opacity-25" style={{ animationDuration: '3s' }} />
      </div>

      {/* 2. Executive Typography */}
      <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 mb-2">
        <Sparkles className="w-5 h-5 text-amber-500 animate-spin" style={{ animationDuration: '6s' }} />
        <span>{message}</span>
      </h2>

      <p className="text-xs sm:text-sm text-slate-500 max-w-md mb-6 leading-relaxed">
        {subMessage}
      </p>

      {/* 3. System Hardware Status Badges */}
      <div className="inline-flex items-center gap-3 px-3.5 py-1.5 rounded-full bg-slate-100/90 border border-slate-200/80 text-[11px] font-semibold text-slate-600 shadow-xs">
        <span className="flex items-center gap-1.5 text-emerald-600">
          <Cpu className="w-3.5 h-3.5" /> 32GB RAM Profile Active
        </span>
        <span className="text-slate-300">·</span>
        <span className="flex items-center gap-1.5 text-amber-700">
          <Shield className="w-3.5 h-3.5" /> Zero-Chromium Architecture
        </span>
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-md">
        {content}
      </div>
    );
  }

  return (
    <div className="w-full flex items-center justify-center py-12">
      {content}
    </div>
  );
}
