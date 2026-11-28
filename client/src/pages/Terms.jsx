import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Scale, CheckCircle2, Lock } from 'lucide-react';

export default function Terms() {
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
          <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
            <Scale size={24} />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-gray-900">
              Terms of Service &amp; Data Compliance
            </h1>
            <p className="text-gray-500 text-sm font-medium mt-1">
              Effective Date: November 2026 · Compliant with CFAA, GDPR, CCPA &amp; Indian DPDP Act
            </p>
          </div>
        </div>

        <div className="space-y-8 text-gray-600 text-sm leading-relaxed">
          {/* Section 1 */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              1. Platform Nature &amp; The Public Data Playbook
            </h2>
            <p>
              Scraper.co.in ("Platform", "we", "us") operates as an automated, cloud-based data discovery and extraction infrastructure utility. Our technology is strictly engineered to retrieve publicly available factual data on the open web—including business names, registered addresses, phone numbers, ratings, public social media metadata, and business hours.
            </p>
            <div className="mt-3 p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-xs">
              <strong>Core Operational Standards:</strong>
              <ul className="list-disc pl-5 mt-1 space-y-1">
                <li><strong>100% Logged-Out Scraping:</strong> We only harvest pages publicly accessible to any unauthenticated web visitor. We never bypass passwords, authentication systems, or paywalls.</li>
                <li><strong>Statutory Compliance:</strong> In accordance with settled judicial precedent (including <em>hiQ Labs v. LinkedIn</em> and <em>Meta Platforms v. Bright Data</em>), collecting publicly available factual data does not constitute unauthorized access under the US Computer Fraud and Abuse Act (CFAA) or equivalent anti-hacking laws.</li>
                <li><strong>Facts Are Public:</strong> Factual business records and aggregate statistics are not subject to copyright monopolies under the <em>Feist Publications</em> doctrine.</li>
              </ul>
            </div>
          </div>

          {/* Section 2 */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              2. Data Processor vs. Data Controller Roles
            </h2>
            <p>
              Under international privacy frameworks (including EU/UK GDPR, California CCPA/CPRA, and the Indian Digital Personal Data Protection Act):
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
              <li>
                <strong>Scraper.co.in acts strictly as a neutral Data Processor / Infrastructure Provider:</strong> We provide the computing automation and scraping engines that extract publicly indexed web data at the user’s direction.
              </li>
              <li>
                <strong>You (The User) act as the Data Controller:</strong> You retain complete responsibility and legal liability for how you store, filter, use, and communicate with the contact information gathered. You are required to observe all applicable anti-spam and telemarketing regulations (such as CAN-SPAM, TCPA, and TRAI regulations) when reaching out to any discovered business contact.
              </li>
            </ul>
          </div>

          {/* Section 3 */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              3. Strict Ethical Red Lines &amp; Acceptable Use
            </h2>
            <p>When using our Client Cockpit or Master Fleet Command, you explicitly agree to the following non-negotiables:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <div className="p-3 bg-red-50 rounded-xl border border-red-100 text-red-900 text-xs">
                <strong>Prohibited: Harassment &amp; Spamming</strong>
                <p className="mt-1 text-red-700">Do not transmit automated mass marketing or unsolicited communications that violate regional opt-out or DND (Do Not Disturb) registries.</p>
              </div>
              <div className="p-3 bg-red-50 rounded-xl border border-red-100 text-red-900 text-xs">
                <strong>Prohibited: Server Flooding &amp; DDoS</strong>
                <p className="mt-1 text-red-700">Our software enforces built-in concurrency caps and adaptive rate delays to safeguard target website stability. Circumventing these limits is forbidden.</p>
              </div>
            </div>
          </div>

          {/* Section 4 */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              4. Social Media Extraction Terms
            </h2>
            <p>
              Social media enrichment for Instagram, Facebook, X (Twitter), and TikTok extracts publicly displayed metadata (e.g. public bio text, link-in-bio URLs, follower counts, and public business email/phone buttons). Scraper.co.in does not store user account credentials, does not execute private account interactions, and does not access non-public private messaging or locked profiles.
            </p>
          </div>

          {/* Section 5 */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              5. Quotas, Subscriptions &amp; Data Classification
            </h2>
            <p>
              We provide phone classification tiers (WhatsApp-capable Mobile and STD Landline) derived from carrier format parsing and public web observation. Records are deduplicated within each session; because public listings change over time, third-party business contact availability should be verified prior to outreach.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
