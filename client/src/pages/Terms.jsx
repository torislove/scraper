import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export default function Terms() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-50 py-20 px-6 font-sans text-gray-900">
      <div className="max-w-3xl mx-auto bg-white p-12 rounded-3xl shadow-sm border border-gray-100">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 mb-8 transition">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="w-12 h-12 bg-violet-100 rounded-2xl flex items-center justify-center mb-6">
          <ShieldCheck size={24} className="text-violet-600" />
        </div>
        <h1 className="text-4xl font-black mb-4 tracking-tight">Terms & Conditions</h1>
        <p className="text-gray-500 mb-8 font-medium">Last updated: June 12, 2026</p>
        
        <div className="space-y-6 text-gray-600 text-sm leading-relaxed">
          <h2 className="text-xl font-bold text-gray-900">1. Acceptance of Terms</h2>
          <p>By accessing and using this marketplace, you agree to be bound by these Terms and Conditions. Our service allows you to search and view vendor listings, subject to the credit system limitations described below.</p>
          
          <h2 className="text-xl font-bold text-gray-900">2. Free Credits and Usage</h2>
          <p>Upon registration, each user account is granted a one-time allocation of 20 free credits. Each credit allows the user to reveal the contact information (phone number and email) of one vendor. Credits have no cash value and cannot be transferred between accounts.</p>
          
          <h2 className="text-xl font-bold text-gray-900">3. Purchasing Additional Credits</h2>
          <p>Once the free credits are exhausted, users must purchase premium packages to continue revealing contact information. All sales are final and non-refundable once credits have been used.</p>
          
          <h2 className="text-xl font-bold text-gray-900">4. Acceptable Use</h2>
          <p>You agree not to use the revealed contact information for spamming, harassment, or any illegal activities. Automated scraping of our masked data is strictly prohibited.</p>
        </div>
      </div>
    </div>
  );
}
