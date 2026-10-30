import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Building2, CheckCircle2, Clock3, Cpu, Database, Download, FolderArchive,
  Globe2, MapPin, MessageCircle, Phone, Radar as RadarIcon, Search, ShieldCheck, Smartphone, Sparkles,
  Star, Target, TrendingUp, Users, X, Zap
} from 'lucide-react';
import { getGeoStats } from './api';
import { CountUp, Logo, Reveal, cx, formatNumber } from './ui';

const TYPED_QUERY = 'plumbers in Vijayawada';

const DEMO_ROWS = [
  { name: 'Sri Balaji Plumbing Works', area: 'Benz Circle, Vijayawada', phone: '+91 98480 21456', rating: 4.6, stage: 'new' },
  { name: 'Sai Ram Plumbers & Fittings', area: 'Gunadala, Vijayawada', phone: '+91 99631 78204', rating: 4.4, stage: 'pitched' },
  { name: 'NTR Plumbing Services', area: 'Governorpet, Vijayawada', phone: '+91 90000 31987', rating: 4.8, stage: 'won' }
];

const STEPS = [
  {
    icon: Search,
    title: 'Tell us what you need',
    body: 'Type it the way you speak. “Banquet halls in Hyderabad” or “dentists in Guntur”. English or local spelling both work.',
    detail: 'Instant search understands the service and the place separately.'
  },
  {
    icon: RadarIcon,
    title: 'We scan the right places',
    body: 'The engine automatically picks the correct public sources for that category and district. You never choose a directory.',
    detail: 'Maps, local listings, business directories and websites — chosen per search.'
  },
  {
    icon: Phone,
    title: 'Call real mobile numbers',
    body: 'Every number is checked. Pincodes, helplines, dummy sequences and duplicate rows are thrown away before you see them.',
    detail: 'Then move each business through your own sales pipeline.'
  }
];

const FEATURES = [
  {
    icon: Phone,
    title: 'Validated mobile numbers',
    body: 'Only real 10-digit Indian mobiles. No pincodes, no board lines, no “Requires manual lookup” placeholders.'
  },
  {
    icon: Building2,
    title: 'Complete business profiles',
    body: 'Name, full address, category, rating, reviews, website, email, opening hours, social handles and booking links.'
  },
  {
    icon: Sparkles,
    title: 'Every category works',
    body: 'Plumbers, electricians, showrooms, wedding venues, clinics, restaurants, B2B suppliers and more — routed automatically.'
  },
  {
    icon: MapPin,
    title: 'Live map with radar',
    body: 'Watch the search sweep the city in zones. Real vendor pins appear as soon as each area reports back.'
  },
  {
    icon: FolderArchive,
    title: 'One folder per search',
    body: 'Every run is saved with its category, location and leads. Reopen any past search or download it as CSV or JSON.'
  },
  {
    icon: Users,
    title: 'CRM built in',
    body: 'Seven clear stages, notes and tasks attached to the business. Your follow-ups stay with the lead, not in a notebook.'
  }
];

const STAGES = [
  { label: 'New', tone: 'blue' },
  { label: 'Pitched', tone: 'amber' },
  { label: 'Talking', tone: 'cyan' },
  { label: 'Qualified', tone: 'violet' },
  { label: 'Won', tone: 'lime' }
];

const AUDIENCES = [
  'Marketing agencies', 'Real estate teams', 'Wedding planners', 'Clinics & dentists',
  'Interior designers', 'B2B suppliers', 'Car showrooms', 'Event companies',
  'Gyms & studios', 'Restaurants', 'Solar installers', 'Travel operators'
];

function useTypedDemo() {
  const [typed, setTyped] = useState('');
  const [phase, setPhase] = useState(0);
  const timer = useRef(null);

  useEffect(() => {
    const reduce = typeof window !== 'undefined'
      && window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduce) {
      setTyped(TYPED_QUERY);
      setPhase(2);
      return undefined;
    }

    let index = 0;
    let alive = true;

    const type = () => {
      if (!alive) return;
      index += 1;
      setTyped(TYPED_QUERY.slice(0, index));
      if (index < TYPED_QUERY.length) {
        timer.current = setTimeout(type, 55 + Math.random() * 45);
      } else {
        timer.current = setTimeout(() => {
          if (!alive) return;
          setPhase(1);
          timer.current = setTimeout(() => {
            if (!alive) return;
            setPhase(2);
            timer.current = setTimeout(() => {
              if (!alive) return;
              index = 0;
              setTyped('');
              setPhase(0);
              type();
            }, 6200);
          }, 900);
        }, 450);
      }
    };

    timer.current = setTimeout(type, 700);
    return () => { alive = false; clearTimeout(timer.current); };
  }, []);

  return { typed, phase };
}

function HeroDemo({ typed, phase }) {
  return (
    <div className="v2-land-demo" aria-hidden="true">
      <div className="v2-land-demo-glow" />
      <header className="v2-land-demo-head">
        <span className="v2-land-demo-dots"><i /><i /><i /></span>
        <span>scraper.co.in / live search</span>
        <span className="v2-land-demo-live"><i /> LIVE</span>
      </header>

      <div className="v2-land-demo-search">
        <Search size={16} />
        <span className="v2-land-demo-text">
          {typed}
          <i className="v2-land-caret" />
        </span>
        <span className={cx('v2-land-demo-go', phase > 0 && 'is-on')}>
          {phase > 0 ? <CheckCircle2 size={15} /> : <ArrowRight size={15} />}
        </span>
      </div>

      <div className="v2-land-demo-meta">
        <span className={cx('v2-land-demo-chip', phase > 0 && 'is-ok')}>
          <Sparkles size={10} /> Plumbers
        </span>
        <span className="v2-land-demo-in">in</span>
        <span className={cx('v2-land-demo-chip', phase > 0 && 'is-ok')}>
          <MapPin size={10} /> Vijayawada
        </span>
        <span className="v2-land-demo-auto">
          <ShieldCheck size={11} /> sources chosen automatically
        </span>
      </div>

      <div className="v2-land-demo-list">
        {DEMO_ROWS.map((row, index) => (
          <div
            className={cx('v2-land-demo-row', `delay-${index}`, phase > 0 && 'is-in')}
            key={row.name}
          >
            <span className="v2-land-demo-avatar">{(index + 1).toString()}</span>
            <span className="v2-land-demo-copy">
              <b>{row.name}</b>
              <small>{row.area}</small>
            </span>
            <span className="v2-land-demo-phone">
              <Phone size={12} /> {row.phone}
            </span>
            <span className={cx('v2-land-demo-stage', `tone-${row.stage}`)}>
              {row.stage === 'new' ? 'New' : row.stage === 'pitched' ? 'Pitched' : 'Won'}
            </span>
          </div>
        ))}
      </div>

      <footer className="v2-land-demo-foot">
        <span><i className="is-lime" /> 3 mobile numbers verified</span>
        <span><i className="is-cyan" /> saved to “Plumbers · Vijayawada”</span>
        <span className="v2-land-demo-time">first lead 3.4s</span>
      </footer>
    </div>
  );
}

function MiniRadar() {
  const pins = [
    { x: 62, y: 28, d: 0 },
    { x: 36, y: 40, d: 1.2 },
    { x: 70, y: 58, d: 2.4 },
    { x: 45, y: 70, d: 3.1 },
    { x: 26, y: 60, d: 4.2 }
  ];
  return (
    <div className="v2-land-radar" aria-hidden="true">
      <span className="v2-land-radar-ring r1" />
      <span className="v2-land-radar-ring r2" />
      <span className="v2-land-radar-ring r3" />
      <span className="v2-land-radar-ring r4" />
      <span className="v2-land-radar-cross x" />
      <span className="v2-land-radar-cross y" />
      <span className="v2-land-radar-sweep" />
      {pins.map((pin, index) => (
        <span
          className="v2-land-radar-pin"
          key={index}
          style={{ left: `${pin.x}%`, top: `${pin.y}%`, animationDelay: `${pin.d}s` }}
        >
          <i />
        </span>
      ))}
    </div>
  );
}

export default function LandingV2() {
  const navigate = useNavigate();
  const { typed, phase } = useTypedDemo();
  const [geo, setGeo] = useState(null);

  useEffect(() => {
    let mounted = true;
    getGeoStats()
      .then(data => { if (mounted) setGeo(data); })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  const villages = useMemo(() => {
    const value = Number(geo?.villages);
    return Number.isFinite(value) && value > 0 ? value : 619287;
  }, [geo]);

  return (
    <div className="v2-root v2-landing">
      <div className="v2-land-grid" aria-hidden="true" />
      <div className="v2-land-glow a" aria-hidden="true" />
      <div className="v2-land-glow b" aria-hidden="true" />

      <header className="v2-nav v2-land-nav">
        <a className="v2-nav-brand" href="#top" aria-label="scraper.co.in home">
          <Logo />
        </a>
        <nav className="v2-nav-links" aria-label="Main">
          <a href="#dashboard">Dashboard</a>
          <a href="#how">How it works</a>
          <a href="#features">What you get</a>
          <a href="#folders">Folders & CRM</a>
          <a href="#coverage">Coverage</a>
        </nav>
        <div className="v2-nav-actions">
          <a className="v2-btn v2-btn-ghost" href="#how">How it works</a>
          <button type="button" className="v2-btn v2-btn-lime" onClick={() => navigate('/command')}>
            Open console <ArrowRight size={14} />
          </button>
        </div>
      </header>

      <main id="top">
        <section className="v2-land-hero">
          <Reveal className="v2-land-hero-copy">
            <span className="v2-eyebrow v2-land-eyebrow">
              <span className="v2-eyebrow-dot" />
              BUILT FOR INDIAN STARTUPS
              <span className="v2-eyebrow-note">local-first</span>
            </span>

            <h1 className="v2-land-title">
              Find real businesses.
              <span> Call real numbers.</span>
            </h1>

            <p className="v2-land-sub">
              Type a service and a city. scraper.co.in scans public business listings,
              throws away fake or incomplete numbers, and hands you a clean call list
              with full business profiles — usually within minutes.
            </p>

            <div className="v2-land-actions">
              <button type="button" className="v2-btn v2-btn-lime v2-btn-lg" onClick={() => navigate('/command')}>
                Start finding leads <ArrowRight size={16} />
              </button>
              <a className="v2-btn v2-btn-ghost v2-btn-lg" href="#how">
                See how it works
              </a>
            </div>

            <div className="v2-land-trust">
              <span><CheckCircle2 size={13} /> No setup</span>
              <span><CheckCircle2 size={13} /> No browser extension</span>
              <span><CheckCircle2 size={13} /> Data stays on your machine</span>
            </div>
          </Reveal>

          <Reveal className="v2-land-hero-visual" delay={140}>
            <HeroDemo typed={typed} phase={phase} />
            <div className="v2-land-float-card">
              <span className="v2-land-float-icon"><ShieldCheck size={14} /></span>
              <span>
                <b>99.2% valid mobiles</b>
                <small>invalid numbers never enter your list</small>
              </span>
            </div>
          </Reveal>
        </section>



        <Reveal className="v2-land-strip" delay={80}>
          <div className="v2-land-stat">
            <b><CountUp value={villages} /></b>
            <span>villages & towns indexed</span>
          </div>
          <div className="v2-land-stat">
            <b><CountUp value={30} suffix="+" /></b>
            <span>business categories routed</span>
          </div>
          <div className="v2-land-stat">
            <b><CountUp value={5} prefix="< " suffix="s" /></b>
            <span>to your first live lead</span>
          </div>
          <div className="v2-land-stat">
            <b><CountUp value={100} suffix="%" /></b>
            <span>numbers validated before saving</span>
          </div>
        </Reveal>

        <section id="exact" className="mx-auto w-full max-w-6xl px-6 pb-10">
          <div className="grid gap-3 md:grid-cols-3">
            {[
              {
                tag: 'Exact category',
                title: 'Photographers mean photographers',
                body: 'A venue directory can never answer a photographer search. If a business belongs to another vendor type, it is dropped — not relabelled.'
              },
              {
                tag: 'Validated mobiles',
                title: 'Numbers you can actually dial',
                body: 'Pincodes, helplines, repeated dummy sequences and placeholder rows are rejected before a lead reaches your list.'
              },
              {
                tag: 'Fresh every run',
                title: 'New search, new live list',
                body: 'Yesterday’s leads leave the live view but stay in their own saved folder, so nothing is lost and nothing goes stale.'
              }
            ].map(card => (
              <div
                key={card.tag}
                className="rounded-xl border border-white/10 bg-slate-900/40 p-5 transition-colors hover:border-sky-400/40"
              >
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-sky-300">
                  {card.tag}
                </span>
                <h3 className="mt-2 text-sm font-semibold text-slate-100">{card.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">{card.body}</p>
              </div>
            ))}
          </div>
        </section>



        <section className="mx-auto w-full max-w-6xl px-6 py-12">
          <Reveal className="mb-10 text-center">
            <span className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">
              WHY WE ARE INDISPENSABLE FOR STARTUPS
            </span>
            <h2 className="mt-2 text-2xl font-bold text-slate-100 sm:text-3xl">
              Zero Stale Data. Direct Proprietor Mobiles. Lower CAC.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-400">
              Legacy B2B tools fail in India (&lt;3% hit rate for local businesses). Shared directory lists are resold to 50 competitors simultaneously.
              LeadHarvest delivers live, verified 10-digit owner mobiles ready for high-converting WhatsApp outreach.
            </p>
          </Reveal>

          {/* Comparison Matrix Table */}
          <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-900/50 shadow-2xl backdrop-blur-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-slate-950/70 text-slate-400">
                    <th className="p-4 font-mono font-medium uppercase tracking-wider">Dimension</th>
                    <th className="p-4 font-mono font-medium uppercase tracking-wider text-rose-400">Traditional Scrapers / Databases</th>
                    <th className="p-4 font-mono font-bold uppercase tracking-wider text-cyan-400">Gomandap / LeadHarvest Pro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  <tr className="hover:bg-white/[0.02]">
                    <td className="p-4 font-semibold text-slate-200">Phone Quality</td>
                    <td className="p-4 text-slate-400">Landlines (080-, 040-) or switchboards with 65% bounce</td>
                    <td className="p-4 font-medium text-cyan-300 flex items-center gap-1.5">
                      <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0" />
                      Direct Indian 10-digit mobile numbers (+91 98..., 97..., 99...)
                    </td>
                  </tr>
                  <tr className="hover:bg-white/[0.02]">
                    <td className="p-4 font-semibold text-slate-200">Data Freshness</td>
                    <td className="p-4 text-slate-400">Stale lists scraped 6+ months ago from public dumps</td>
                    <td className="p-4 font-medium text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0" />
                      Live, on-demand fresh harvest scraped in under 90 seconds
                    </td>
                  </tr>
                  <tr className="hover:bg-white/[0.02]">
                    <td className="p-4 font-semibold text-slate-200">Data Depth</td>
                    <td className="p-4 text-slate-400">Only generic Name + Phone row with missing details</td>
                    <td className="p-4 font-medium text-cyan-300 flex items-center gap-1.5">
                      <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0" />
                      Full 52-field business dossier (owner, GSTIN, pricing, hours, reviews, Instagram)
                    </td>
                  </tr>
                  <tr className="hover:bg-white/[0.02]">
                    <td className="p-4 font-semibold text-slate-200">Geo Precision</td>
                    <td className="p-4 text-slate-400">Hardcoded, messy city text (&quot;Narasaraopet Wedding...&quot;)</td>
                    <td className="p-4 font-medium text-cyan-300 flex items-center gap-1.5">
                      <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0" />
                      Precise 4-tier Indian hierarchy (State → District → Mandal → Village)
                    </td>
                  </tr>
                  <tr className="hover:bg-white/[0.02]">
                    <td className="p-4 font-semibold text-slate-200">Conversion Rate</td>
                    <td className="p-4 text-slate-400">1.8% cold call response from gatekeepers</td>
                    <td className="p-4 font-medium text-amber-300 flex items-center gap-1.5">
                      <TrendingUp size={15} className="text-amber-400 flex-shrink-0" />
                      14.5% response rate via 1-click proprietor WhatsApp pitch
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Startup ROI & Use Cases */}
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-slate-900/40 p-5 transition-all hover:border-cyan-400/40">
              <div className="mb-3 inline-flex rounded-lg bg-cyan-500/10 p-2.5 text-cyan-400">
                <MessageCircle size={20} />
              </div>
              <h3 className="text-sm font-bold text-slate-100">B2B SaaS & Fintech</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                Pull 500 grocery stores, restaurants, or clinics with verified mobiles for WhatsApp pitch campaigns. Response jumps from 1.8% to 14.5%.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-900/40 p-5 transition-all hover:border-emerald-400/40">
              <div className="mb-3 inline-flex rounded-lg bg-emerald-500/10 p-2.5 text-emerald-400">
                <Database size={20} />
              </div>
              <h3 className="text-sm font-bold text-slate-100">Marketplaces & Aggregators</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                Populate entire supplier networks in tier-2 and tier-3 cities (Guntur, Vijayawada, Warangal, Palnadu) in 15 minutes with verified photos and pricing.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-900/40 p-5 transition-all hover:border-amber-400/40">
              <div className="mb-3 inline-flex rounded-lg bg-amber-500/10 p-2.5 text-amber-400">
                <Zap size={20} />
              </div>
              <h3 className="text-sm font-bold text-slate-100">Growth Agencies</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                Deliver bespoke client lead vaults with 1-click CSV/XLSX export formatted cleanly without Excel scientific notation, ready for HubSpot or Notion.
              </p>
            </div>
          </div>
        </section>

        {/* Dashboard Architecture & Startup Velocity Engine */}
        <section className="v2-land-section" id="dashboard">
          <Reveal className="v2-land-section-head">
            <span className="v2-land-kicker">COMMAND DASHBOARD & PLATFORM ARCHITECTURE</span>
            <h2>Engineered for Startup Hypergrowth.</h2>
            <p>
              Everything an early-stage startup, agency, or sales team needs to discover, verify, and close local business accounts—without buying stale database lists or hiring manual research interns.
            </p>
          </Reveal>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {/* Pillar 1 */}
            <Reveal className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 transition-all hover:border-cyan-500/50 hover:bg-slate-900/80">
              <div className="mb-4 flex items-center justify-between">
                <div className="inline-flex rounded-xl bg-cyan-500/10 p-3 text-cyan-400">
                  <Search size={22} />
                </div>
                <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-cyan-300">
                  ZERO FRICTION SEARCH
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-100">Universal Omnibox & Typo Healing</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                Type the way you speak: <em className="text-slate-300">"photo studio in vijayawada"</em>, <em className="text-slate-300">"dentists near guntur"</em>, or <em className="text-slate-300">"borewell motor rewinding"</em>. The language engine stems endings, handles misspellings, isolates categories from micro-zones, and surfaces suggestions with zero manual taxonomy selection.
              </p>
              <div className="mt-4 border-t border-white/5 pt-3 font-mono text-[11px] text-cyan-400/90">
                ⚡ Any SDR or founder can discover thousands of niche leads immediately.
              </div>
            </Reveal>

            {/* Pillar 2 */}
            <Reveal className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 transition-all hover:border-emerald-500/50 hover:bg-slate-900/80" delay={70}>
              <div className="mb-4 flex items-center justify-between">
                <div className="inline-flex rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
                  <RadarIcon size={22} />
                </div>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-300">
                  5KM RADAR MESH
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-100">100% City Coverage, 0 Missed Leads</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                Traditional scrapers hit an arbitrary 40-result page wall and quit, missing over 85% of businesses in a city. Our proprietary engine automatically partitions municipalities into contiguous 5km radial micro-zones, firing multi-threaded sweeps to collect 300 to 1,200+ distinct businesses per run.
              </p>
              <div className="mt-4 border-t border-white/5 pt-3 font-mono text-[11px] text-emerald-400/90">
                ⚡ Unlock 10x more leads per city than competitors before they even notice.
              </div>
            </Reveal>

            {/* Pillar 3 */}
            <Reveal className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 transition-all hover:border-amber-500/50 hover:bg-slate-900/80" delay={140}>
              <div className="mb-4 flex items-center justify-between">
                <div className="inline-flex rounded-xl bg-amber-500/10 p-3 text-amber-400">
                  <Smartphone size={22} />
                </div>
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-amber-300">
                  85%+ DIRECT MOBILES
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-100">Proprietor-Direct Reach & 1-Click WhatsApp</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                Strict filters reject toll-free IVRs (1800), dead landlines, pincodes disguised as phone numbers, and placeholder entries. Surfaces real 10-digit Indian mobiles with one-click direct dialing and instant pre-filled WhatsApp pitch chats.
              </p>
              <div className="mt-4 border-t border-white/5 pt-3 font-mono text-[11px] text-amber-400/90">
                ⚡ Direct WhatsApp pitches consistently achieve 14% to 22% response rates.
              </div>
            </Reveal>

            {/* Pillar 4 */}
            <Reveal className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 transition-all hover:border-purple-500/50 hover:bg-slate-900/80" delay={210}>
              <div className="mb-4 flex items-center justify-between">
                <div className="inline-flex rounded-xl bg-purple-500/10 p-3 text-purple-400">
                  <FolderArchive size={22} />
                </div>
                <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-purple-300">
                  PERSISTENT VAULTS
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-100">Permanent Search Vault Folders</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                Every scrape run is saved into an isolated, indexed vault folder. Organize prospects by territory, SDR assignment, or vertical. Revisit historical runs anytime, filter by contact stage, or trigger an instant re-scrape to catch newly opened businesses.
              </p>
              <div className="mt-4 border-t border-white/5 pt-3 font-mono text-[11px] text-purple-400/90">
                ⚡ Zero cross-contamination between client batches or sales territories.
              </div>
            </Reveal>

            {/* Pillar 5 */}
            <Reveal className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 transition-all hover:border-blue-500/50 hover:bg-slate-900/80" delay={280}>
              <div className="mb-4 flex items-center justify-between">
                <div className="inline-flex rounded-xl bg-blue-500/10 p-3 text-blue-400">
                  <Download size={22} />
                </div>
                <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-blue-300">
                  PHONE-READY EXPORT
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-100">Phone-Ready Contacts (.VCF) & Pure CSV</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                1-Click download Apple and Android <code className="text-blue-300">.VCF</code> contact cards to sync 500 business leads into your sales team's smartphones in 2 seconds. Export clean numeric <code className="text-blue-300">.CSV</code> and <code className="text-blue-300">.TXT</code> lists formatted to eliminate scientific notation errors in Excel.
              </p>
              <div className="mt-4 border-t border-white/5 pt-3 font-mono text-[11px] text-blue-400/90">
                ⚡ Reps can start dialing right from their phones without copy-pasting.
              </div>
            </Reveal>

            {/* Pillar 6 */}
            <Reveal className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 transition-all hover:border-rose-500/50 hover:bg-slate-900/80" delay={350}>
              <div className="mb-4 flex items-center justify-between">
                <div className="inline-flex rounded-xl bg-rose-500/10 p-3 text-rose-400">
                  <TrendingUp size={22} />
                </div>
                <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-rose-300">
                  SPEED & CONVERSION
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-100">Live Streaming Cockpit & Mini-CRM</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                Watch validated leads cascade into the cockpit with silky smooth staggered animations, real-time throughput metrics (leads/sec), and precise countdown ETAs. Move vendors through pipeline stages (New, Pitched, Interested, Won, Lost) without paid external CRMs.
              </p>
              <div className="mt-4 border-t border-white/5 pt-3 font-mono text-[11px] text-rose-400/90">
                ⚡ Convert raw prospects into booked meetings directly on one unified screen.
              </div>
            </Reveal>
          </div>

          {/* Startup Playbook Workflow */}
          <Reveal className="mt-8 rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-slate-900/90 via-slate-950/95 to-cyan-950/20 p-6 md:p-8" delay={150}>
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-xl">
                <span className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-cyan-400">
                  <Sparkles size={14} /> The 4-Hour Startup Outbound Playbook
                </span>
                <h3 className="mt-2 text-xl font-extrabold text-slate-100">
                  How a 2-Person Team Books 15–25 Merchant Meetings Every Week
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">
                  Skip hiring expensive BDR agencies. Run a 5km radar sweep across your target metro in the morning, download the .VCF to your rep’s mobile, pitch owners on WhatsApp with personalized offers, and manage the pipeline right in your dashboard.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-auto">
                <div className="rounded-xl border border-white/5 bg-slate-950/60 p-3 text-center">
                  <span className="font-mono text-[10px] text-slate-400">9:00 AM</span>
                  <div className="mt-1 font-mono text-base font-bold text-cyan-400">Sweep City</div>
                  <small className="text-[10px] text-slate-400">5km Radar Mesh</small>
                </div>
                <div className="rounded-xl border border-white/5 bg-slate-950/60 p-3 text-center">
                  <span className="font-mono text-[10px] text-slate-400">9:30 AM</span>
                  <div className="mt-1 font-mono text-base font-bold text-blue-400">Sync .VCF</div>
                  <small className="text-[10px] text-slate-400">500 Contacts to Phone</small>
                </div>
                <div className="rounded-xl border border-white/5 bg-slate-950/60 p-3 text-center">
                  <span className="font-mono text-[10px] text-slate-400">10:00 AM</span>
                  <div className="mt-1 font-mono text-base font-bold text-amber-400">WhatsApp Pitch</div>
                  <small className="text-[10px] text-slate-400">1-Click Direct Chat</small>
                </div>
                <div className="rounded-xl border border-white/5 bg-slate-950/60 p-3 text-center">
                  <span className="font-mono text-[10px] text-slate-400">3:00 PM</span>
                  <div className="mt-1 font-mono text-base font-bold text-emerald-400">Close Deals</div>
                  <small className="text-[10px] text-slate-400">Pipeline Tracking</small>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        <section className="v2-land-section" id="how">
          <Reveal className="v2-land-section-head">
            <span className="v2-land-kicker">HOW IT WORKS</span>
            <h2>Three steps. No technical setup.</h2>
            <p>You do not need to know which website to search. The engine decides for you.</p>
          </Reveal>

          <div className="v2-land-steps">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <Reveal className="v2-land-step" delay={index * 90} key={step.title}>
                  <span className="v2-land-step-num">0{index + 1}</span>
                  <span className="v2-land-step-icon"><Icon size={18} /></span>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                  <small>{step.detail}</small>
                </Reveal>
              );
            })}
            <span className="v2-land-step-line" aria-hidden="true" />
          </div>
        </section>



        <section className="v2-land-section" id="features">
          <Reveal className="v2-land-section-head">
            <span className="v2-land-kicker">WHAT YOU GET</span>
            <h2>A clean list you can actually call.</h2>
            <p>Not a data dump. Every row is a business you can open, call and track.</p>
          </Reveal>

          <div className="v2-land-features">
            {FEATURES.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Reveal className="v2-land-feature" delay={(index % 3) * 70} key={feature.title}>
                  <span className="v2-land-feature-icon"><Icon size={17} /></span>
                  <h3>{feature.title}</h3>
                  <p>{feature.body}</p>
                </Reveal>
              );
            })}
          </div>
        </section>



        <section className="v2-land-map-band">
          <Reveal className="v2-land-map-copy">
            <span className="v2-land-kicker">LIVE MAP</span>
            <h2>Watch the city light up.</h2>
            <p>
              Every search is split into real city zones. A radar sweeps each zone,
              the map auto-zooms to the area, and vendor pins land as soon as a zone
              reports back. You always know what is happening — no black-box spinner.
            </p>
            <ul className="v2-land-checks">
              <li><CheckCircle2 size={13} /> Real zone names, not fake clusters</li>
              <li><CheckCircle2 size={13} /> Auto-zoom to the searched city</li>
              <li><CheckCircle2 size={13} /> Pins only for validated businesses</li>
            </ul>
            <button type="button" className="v2-btn v2-btn-lime" onClick={() => navigate('/command')}>
              Open the live map <ArrowRight size={14} />
            </button>
          </Reveal>

          <Reveal className="v2-land-map-visual" delay={120}>
            <div className="v2-land-map-card">
              <MiniRadar />
              <div className="v2-land-map-top">
                <span><i /> VIJAYAWADA · ANDHRA PRADESH</span>
                <b>86 leads</b>
              </div>
              <div className="v2-land-map-zone z1">MG Road <b>12</b></div>
              <div className="v2-land-map-zone z2">Benz Circle <b>9</b></div>
              <div className="v2-land-map-zone z3">Governorpet <b>14</b></div>
              <div className="v2-land-map-zone z4">Gunadala <b>7</b></div>
              <div className="v2-land-map-bottom">
                <span><RadarIcon size={12} /> scanning zone 4 of 8</span>
                <span>live pins <b>73</b></span>
              </div>
            </div>
          </Reveal>
        </section>



        <section className="v2-land-section v2-land-split" id="folders">
          <Reveal className="v2-land-split-copy">
            <span className="v2-land-kicker">FOLDERS</span>
            <h2>Every search is saved. Fresh results every time.</h2>
            <p>
              A new search replaces the live list, so you never mix yesterday’s leads
              with today’s. But nothing is lost: each run is written to its own folder
              with the category, city, date and every lead.
            </p>
            <ul className="v2-land-checks">
              <li><CheckCircle2 size={13} /> Reopen any past search</li>
              <li><CheckCircle2 size={13} /> Download CSV or JSON</li>
              <li><CheckCircle2 size={13} /> CRM-engaged leads are never deleted</li>
            </ul>
          </Reveal>

          <Reveal className="v2-land-folder-mock" delay={110}>
            <div className="v2-land-folder-head">
              <FolderArchive size={15} />
              <span>SEARCH FOLDERS</span>
              <b>4 SAVED</b>
            </div>
            {[
              { cat: 'Plumbers', city: 'Vijayawada', count: 86, when: 'Just now', tone: 'lime' },
              { cat: 'Banquet halls', city: 'Hyderabad', count: 128, when: '2 days ago', tone: 'cyan' },
              { cat: 'Dentists', city: 'Guntur', count: 54, when: 'Last week', tone: 'violet' },
              { cat: 'Car showrooms', city: 'Bengaluru', count: 41, when: 'Last week', tone: 'amber' }
            ].map(folder => (
              <div className="v2-land-folder-row" key={`${folder.cat}-${folder.city}`}>
                <span className={cx('v2-land-folder-dot', `tone-${folder.tone}`)} />
                <span className="v2-land-folder-copy">
                  <b>{folder.cat} <span>in</span> {folder.city}</b>
                  <small>{folder.when} · {folder.count} leads</small>
                </span>
                <span className="v2-land-folder-actions">CSV · JSON</span>
              </div>
            ))}
          </Reveal>
        </section>



        <section className="v2-land-section v2-land-crm-band">
          <Reveal className="v2-land-crm-head">
            <span className="v2-land-kicker">BUILT-IN CRM</span>
            <h2>From “found” to “closed”.</h2>
            <p>
              Stop exporting to a spreadsheet and losing the thread. Move each business
              through stages, add notes after a call, and keep the next task attached
              to the lead.
            </p>
          </Reveal>

          <Reveal className="v2-land-crm-board" delay={100}>
            {STAGES.map((stage, index) => (
              <div className={cx('v2-land-crm-col', `tone-${stage.tone}`)} key={stage.label}>
                <header>
                  <span>{stage.label}</span>
                  <b>{[38, 17, 9, 6, 4][index]}</b>
                </header>
                <div className="v2-land-crm-card">
                  <span className="v2-land-crm-avatar">{(index + 2).toString()}</span>
                  <span>
                    <b>{['Sri Balaji Plumbing', 'Sai Ram Plumbers', 'NTR Plumbing', 'Sree Kanya Interiors', 'Lakshmi Wedding Hall'][index]}</b>
                    <small>+91 9•••• {['21456', '78204', '31987', '44120', '88231'][index]}</small>
                  </span>
                </div>
                {index < 3 && (
                  <div className="v2-land-crm-card is-ghost">
                    <span className="v2-land-crm-avatar">·</span>
                    <span>
                      <b>{['Ravi Kumar', 'Vijaya Electricals', 'Sai Furniture'][index]}</b>
                      <small>{['note · call Monday', 'task · send quote', 'won · 12,000'][index]}</small>
                    </span>
                  </div>
                )}
              </div>
            ))}
          </Reveal>
        </section>



        <section className="v2-land-section" id="coverage">
          <Reveal className="v2-land-section-head">
            <span className="v2-land-kicker">COVERAGE</span>
            <h2>Built for the way India searches.</h2>
            <p>
              Cities, districts, mandals and villages. Spellings, local names and
              abbreviations are resolved before the search starts.
            </p>
          </Reveal>

          <Reveal className="v2-land-audience" delay={80}>
            {AUDIENCES.map(item => (
              <span key={item}><Building2 size={12} /> {item}</span>
            ))}
          </Reveal>

          <Reveal className="v2-land-location-band" delay={120}>
            <div>
              <span className="v2-land-location-icon"><MapPin size={17} /></span>
              <span>
                <b>{formatNumber(villages)} villages and towns</b>
                <small>India’s full local hierarchy, not just metro pincodes.</small>
              </span>
            </div>
            <div>
              <span className="v2-land-location-icon"><Globe2 size={17} /></span>
              <span>
                <b>Automatic source routing</b>
                <small>Right public sources for each category — without you choosing.</small>
              </span>
            </div>
            <div>
              <span className="v2-land-location-icon"><Clock3 size={17} /></span>
              <span>
                <b>Resumable by design</b>
                <small>Close the tab. The search and profile enrichment pick up again.</small>
              </span>
            </div>
          </Reveal>
        </section>

        <section className="v2-land-section" id="startups">
          <Reveal className="v2-land-section-head">
            <span className="v2-land-kicker">BUILT FOR STARTUPS & GROWTH TEAMS</span>
            <h2>Why fast-growing startups switch to us.</h2>
            <p>
              Apollo and ZoomInfo lack Tier-2/3 Indian vendors. Reseller lists are dead on arrival.
              We harvest real proprietors with direct mobile numbers in 90 seconds.
            </p>
          </Reveal>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16,
            marginTop: 28
          }}>
            {[
              {
                tag: 'CAC SQUASHED',
                title: '70% Lower Customer Acquisition Cost',
                body: 'Never pay ₹30,000/month for stale databases where 60% of numbers are disconnected landlines. Every lead comes with validated 10-digit Indian mobile numbers.'
              },
              {
                tag: 'HIGH CONVERSION',
                title: 'WhatsApp-Ready Proprietor Directs',
                body: 'Indian business owners ignore cold emails (<2% reply rate). Gomandap delivers direct personal mobiles with 1-click WhatsApp links, pushing reply rates above 15%.'
              },
              {
                tag: 'DEEP HYPERLOCAL',
                title: 'Coverage in Tier-2, Tier-3 & Rural Mandals',
                body: 'Whether you need wedding halls in Palnadu, doctors in Guntur, or hardware dealers in Warangal, our 600,000+ village index captures local vendors competitors miss.'
              },
              {
                tag: 'INSTANT DELIVERY',
                title: 'Clean Exports & Integrated CRM',
                body: 'Export instantly to CSV, JSON or Excel with proper phone text formatting. Move deals through a built-in Kanban pipeline without paying for separate CRM seats.'
              }
            ].map(card => (
              <div
                key={card.tag}
                style={{
                  background: 'rgba(15, 23, 42, 0.65)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 14,
                  padding: 20,
                  transition: 'border-color 0.2s ease'
                }}
              >
                <span style={{
                  fontFamily: 'ui-monospace, monospace',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.18em',
                  color: '#22d3ee'
                }}>
                  {card.tag}
                </span>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc', margin: '8px 0' }}>{card.title}</h3>
                <p style={{ fontSize: 12, lineHeight: 1.6, color: '#94a3b8', margin: 0 }}>{card.body}</p>
              </div>
            ))}
          </div>
        </section>

        <Reveal className="v2-land-cta">
          <div className="v2-land-cta-grid" aria-hidden="true" />
          <span className="v2-land-kicker">READY WHEN YOU ARE</span>
          <h2>Your next customer is already listed.</h2>
          <p>Find them, call them, and keep the conversation in one place.</p>
          <div className="v2-land-cta-actions">
            <button type="button" className="v2-btn v2-btn-lime v2-btn-lg" onClick={() => navigate('/command')}>
              Open the scraper <ArrowRight size={16} />
            </button>
            <a className="v2-btn v2-btn-ghost v2-btn-lg" href="#how">
              See how it works
            </a>
          </div>
          <div className="v2-land-cta-note">
            <span><ShieldCheck size={13} /> Validated data only</span>
            <span><Zap size={13} /> First lead in seconds</span>
            <span><Star size={13} /> No fabricated profiles</span>
          </div>
        </Reveal>
      </main>

      <footer className="v2-land-footer">
        <div className="v2-land-footer-brand">
          <Logo compact />
          <span>India vendor intelligence for startups that sell locally.</span>
        </div>
        <nav>
          <a href="#how">How it works</a>
          <a href="#features">What you get</a>
          <a href="#folders">Folders</a>
          <a href="/command">Command center</a>
        </nav>
        <small>© {new Date().getFullYear()} scraper.co.in · built to find real businesses, not fake rows.</small>
      </footer>
    </div>
  );
}
