import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock } from 'lucide-react';

export default function Privacy() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-50 py-20 px-6 font-sans text-gray-900">
      <div className="max-w-3xl mx-auto bg-white p-12 rounded-3xl shadow-sm border border-gray-100">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 mb-8 transition">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center mb-6">
          <Lock size={24} className="text-indigo-600" />
        </div>
        <h1 className="text-4xl font-black mb-4 tracking-tight">Privacy Policy</h1>
        <p className="text-gray-500 mb-8 font-medium">Last updated: June 12, 2026</p>
        
        <div className="space-y-6 text-gray-600 text-sm leading-relaxed">
          <h2 className="text-xl font-bold text-gray-900">1. Institutional Data Governance</h2>
          <p>Scraper.co.in operates strictly as a B2B public web indexing utility. Workspace authentication stores only your organizational identifier, email address, and encrypted session metadata.</p>
          
          <h2 className="text-xl font-bold text-gray-900">2. Zero-Knowledge Local Execution</h2>
          <p>Client-side extraction executes directly within local browser memory without storing private consumer databases or personal PII on central cloud servers. We never sell workspace metadata to third parties.</p>
          
          <h2 className="text-xl font-bold text-gray-900">3. Security Architecture</h2>
          <p>All telemetry transmissions occur over 256-bit TLS encrypted channels with hashed workspace tokens and strict role isolation between Client and Master Fleet consoles.</p>
        </div>
      </div>
    </div>
  );
}
