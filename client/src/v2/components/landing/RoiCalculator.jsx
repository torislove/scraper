import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Calculator, Zap, Sparkles, TrendingUp, CheckCircle2,
  ArrowRight, ShieldCheck, MessageSquare, PhoneCall
} from "lucide-react";

export default function RoiCalculator({ onClaimClick }) {
  const [leadsCount, setLeadsCount] = useState(2000);
  const [dealValue, setDealValue] = useState(25000);

  // 14.5% WhatsApp response rate on direct Indian owner mobiles (from Manoj's business plan)
  const estimatedWaReplies = Math.round(leadsCount * 0.145);
  // Conservative 3.5% conversion to paying client
  const estimatedDeals = Math.max(1, Math.round(estimatedWaReplies * 0.18));
  // Total pipeline generated
  const estimatedRevenue = estimatedDeals * dealValue;

  return (
    <div className="roi-calculator-section">
      <div className="roi-header">
        <span className="eyebrow">
          <Calculator size={13} className="text-mint" /> INSTANT VALUE & ROI MODEL
        </span>
        <h2>How Direct Owner Outreach<br /><span className="gradient-text">makes your business money from Day 1.</span></h2>
        <p>1 verified lead = 1 real business proprietor reached directly on their personal WhatsApp. Zero dead landlines. Zero gatekeepers. Unlimited free Excel & CSV exports.</p>
      </div>

      <div className="roi-card-grid">
        {/* Left: Interactive Controls */}
        <div className="roi-slider-panel">
          <div className="slider-group">
            <div className="slider-label-row">
              <label>Monthly Target Leads to Sweep</label>
              <span className="slider-val text-mint">{leadsCount.toLocaleString("en-IN")} leads</span>
            </div>
            <input
              type="range"
              min={500}
              max={10000}
              step={250}
              value={leadsCount}
              onChange={(e) => setLeadsCount(Number(e.target.value))}
              className="roi-range-input"
            />
            <div className="slider-bounds">
              <span>500 (Free Grant)</span>
              <span>2,500</span>
              <span>5,000</span>
              <span>10,000+</span>
            </div>
          </div>

          <div className="slider-group">
            <div className="slider-label-row">
              <label>Your Average Client / Deal Value (₹)</label>
              <span className="slider-val">₹{dealValue.toLocaleString("en-IN")}</span>
            </div>
            <input
              type="range"
              min={5000}
              max={150000}
              step={5000}
              value={dealValue}
              onChange={(e) => setDealValue(Number(e.target.value))}
              className="roi-range-input"
            />
            <div className="slider-bounds">
              <span>₹5k (Local Shop)</span>
              <span>₹25k (Website/SEO)</span>
              <span>₹75k (Wedding Package)</span>
              <span>₹1.5L (Commercial)</span>
            </div>
          </div>

          {/* Key differentiator callout */}
          <div className="roi-proof-box">
            <div className="proof-metric">
              <div className="p-num text-mint">14.5%</div>
              <div className="p-text">
                <b>WhatsApp Owner Reply Rate</b>
                <small>Direct 10-digit Indian mobile lines reach decision-makers, not gatekeepers.</small>
              </div>
            </div>
            <div className="proof-metric">
              <div className="p-num text-blue">1.8%</div>
              <div className="p-text">
                <b>Traditional Cold Calling Rate</b>
                <small>Switchboards and reception landlines produce high rejection rates.</small>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Revenue & Deal Outcome Preview */}
        <div className="roi-results-panel">
          <div className="results-top-pill">
            <Zap size={13} className="text-mint" />
            <span>ESTIMATED BUSINESS OUTCOME</span>
          </div>

          <div className="outcome-metric-big">
            <span className="outcome-label">ESTIMATED CLIENT REVENUE</span>
            <div className="outcome-val gradient-text">
              ₹{estimatedRevenue.toLocaleString("en-IN")}
            </div>
            <small className="outcome-sub">Based on ~{estimatedDeals} closed deals at ₹{dealValue.toLocaleString("en-IN")} each</small>
          </div>

          <div className="outcome-stats-grid">
            <div className="o-stat">
              <span>WHATSAPP DIALOGUES</span>
              <b>~{estimatedWaReplies} owners</b>
              <small>1-click wa.me chat</small>
            </div>
            <div className="o-stat">
              <span>FREE CREDITS INCLUDED</span>
              <b className="text-mint">1,000 Leads</b>
              <small>Instant on install</small>
            </div>
            <div className="o-stat">
              <span>DEDUPLICATION</span>
              <b>100% Free</b>
              <small>Never charged twice</small>
            </div>
            <div className="o-stat">
              <span>CSV & EXCEL EXPORT</span>
              <b className="text-mint">Unlimited</b>
              <small>Forever accessible</small>
            </div>
          </div>

          <button className="roi-claim-btn" onClick={onClaimClick}>
            <span>Launch Dashboard & Get 50 Free Leads</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

