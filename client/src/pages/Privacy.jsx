import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function Privacy() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-50 py-16 px-6 font-sans text-gray-900">
      <div className="max-w-4xl mx-auto bg-white p-10 md:p-14 rounded-3xl shadow-sm border border-gray-100">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 mb-8 transition"
        >
          <ArrowLeft size={16} /> Back to Overview
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-sky-100 rounded-2xl flex items-center justify-center text-sky-600">
            <Lock size={24} />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-gray-900">
              Privacy Policy &amp; Public Data Architecture
            </h1>
            <p className="text-gray-500 text-sm font-medium mt-1">
              Effective Date: November 2026 · Committed to Transparent, Zero-Knowledge Client Privacy
            </p>
          </div>
        </div>

        <div className="space-y-8 text-gray-600 text-sm leading-relaxed">
          {/* Section 1 */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              1. Information We Process: Public Web Data
            </h2>
            <p>
              Scraper.co.in collects and indexes publicly available commercial information published on the open web by businesses, service providers, and institutions. This includes:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Commercial enterprise names, physical addresses, postal codes, and geocoordinates.</li>
              <li>Publicly listed business telephone, mobile, and WhatsApp numbers.</li>
              <li>Official corporate domains, contact email addresses, and tax identifiers (such as GSTIN, CIN).</li>
              <li>Public social media profile handles, follower counts, star ratings, and bio links (Instagram, Facebook, X, TikTok).</li>
            </ul>
            <p className="mt-2 text-xs text-gray-500">
              <strong>Notice:</strong> We do not collect private credentials, financial card details, confidential communications, or non-public personal information.
            </p>
          </div>

          {/* Section 2 */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              2. User Account Privacy (Zero-Knowledge Client Cockpit)
            </h2>
            <p>
              When you use the Client Scraper edition, your workspace runs locally in your browser. Your custom tags, export preferences, notes, and local lead folders are stored in your device’s local indexed storage. We do not track or sell your search queries or commercial target lists.
            </p>
          </div>

          {/* Section 3 */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              3. Legal Compliance: GDPR, CCPA &amp; DPDP
            </h2>
            <p>
              Under global data privacy laws:
            </p>
            <div className="mt-2 p-4 bg-sky-50 rounded-xl border border-sky-200 text-sky-950 text-xs space-y-2">
              <p>
                <strong>Right to Opt-Out / Removal:</strong> If you are a business owner or representative and wish to update or delist your publicly indexed business contact information from our central directory cache, contact our compliance officer at <code>privacy@scraper.co.in</code>. Verified delisting requests are processed within 48 hours.
              </p>
              <p>
                <strong>Legitimate Interest &amp; Public Source:</strong> Public business contact details are processed under the lawful basis of legitimate commercial interest for B2B discovery and directory indexing, in strict adherence to Article 6(1)(f) of the GDPR.
              </p>
            </div>
          </div>

          {/* Section 4 */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              4. Data Retention &amp; Security
            </h2>
            <p>
              Master cache records are refreshed periodically to purge defunct phone numbers and closed businesses. All network transmissions occur over 256-bit TLS encrypted channels. We do not store plain-text passwords or third-party social media access tokens.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
