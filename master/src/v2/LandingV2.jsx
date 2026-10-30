import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  motion, AnimatePresence, useInView, useReducedMotion, useScroll,
  useSpring, useTransform, animate
} from 'framer-motion';
import {
  ArrowRight, Briefcase, Check, CheckCircle2, Clock3, FolderArchive, Layers,
  LineChart, MapPin, Phone, Play, Plus, Search, Sparkles, Store, Target,
  TrendingUp, Users, X
} from 'lucide-react';
import './landing.css';

/* ================================================================== */
/* Motion helpers                                                     */
/* ================================================================== */

const EASE = [0.16, 1, 0.3, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.65, ease: EASE } }
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.085, delayChildren: 0.05 } }
};

function Reveal({ children, className = '', delay = 0, y = 24 }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.66, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

function Stagger({ children, className = '', step = 0.085 }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-70px' }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: step } } }}
    >
      {children}
    </motion.div>
  );
}

function Item({ children, className = '' }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} variants={fadeUp}>
      {children}
    </motion.div>
  );
}

/** Counts up the first time it scrolls into view. */
function Num({ to, decimals = 0, prefix = '', suffix = '', duration = 1.5, format = false }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });
  const reduce = useReducedMotion();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return undefined;
    if (reduce) {
      setValue(to);
      return undefined;
    }
    const controls = animate(0, to, {
      duration,
      ease: EASE,
      onUpdate: latest => setValue(latest)
    });
    return () => controls.stop();
  }, [inView, to, duration, reduce]);

  const shown = format
    ? value.toLocaleString('en-IN', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      })
    : value.toFixed(decimals);

  return (
    <span ref={ref}>
      {prefix}
      {shown}
      {suffix}
    </span>
  );
}

/* ================================================================== */
/* Content                                                            */
/* ================================================================== */

const PLACES = [
  { name: 'Mumbai', state: 'Maharashtra', count: 500 },
  { name: 'Delhi NCR', state: 'Delhi', count: 500 },
  { name: 'Bengaluru', state: 'Karnataka', count: 500 },
  { name: 'Hyderabad', state: 'Telangana', count: 480 },
  { name: 'Chennai', state: 'Tamil Nadu', count: 460 },
  { name: 'Pune', state: 'Maharashtra', count: 440 },
  { name: 'Jaipur', state: 'Rajasthan', count: 310 },
  { name: 'Kochi', state: 'Kerala', count: 240 }
];
const PLACE_TOTAL = PLACES.reduce((sum, place) => sum + place.count, 0); // 3,430

const DASH_ROWS = [
  { name: 'Sri Balaji Plumbing Works', phone: '+91 98480 21456', stage: 'is-new' },
  { name: 'Sai Ram Plumbers & Fittings', phone: '+91 99631 78204', stage: 'is-hot' },
  { name: 'NTR Plumbing Services', phone: '+91 90000 31987', stage: 'is-won' },
  { name: 'Krishna Pipe Traders', phone: '+91 94910 77321', stage: 'is-new' },
  { name: 'Lakshmi Borewells', phone: '+91 90009 11452', stage: 'is-hot' },
  { name: 'Amar Hardware & Sanitary', phone: '+91 91778 30094', stage: 'is-new' }
];

const MAP_PINS = [
  { left: '22%', top: '26%' }, { left: '46%', top: '18%' }, { left: '64%', top: '38%' },
  { left: '34%', top: '52%' }, { left: '58%', top: '66%' }, { left: '76%', top: '58%' },
  { left: '44%', top: '78%' }
];

const COMPARE = [
  {
    label: 'Phone quality',
    bad: 'Landlines or switchboards. About 65% of those calls go nowhere.',
    good: 'Direct Indian 10-digit mobiles. If it is not a real mobile, it never reaches you.'
  },
  {
    label: 'Data freshness',
    bad: 'Lists from six months ago, copied from public dumps and resold again and again.',
    good: 'Built fresh every time you search. Closed shops and changed numbers drop out.'
  },
  {
    label: 'How much you get',
    bad: 'A name and a number. Good luck building a pitch from that.',
    good: 'Up to 52 fields: owner, GSTIN, pricing, hours, reviews, photos, Instagram.'
  },
  {
    label: 'Location accuracy',
    bad: 'Messy free text like "Narasaraopet Wedding…" that no filter can use.',
    good: 'Clean columns: state, district, mandal, village — even though you search one place at a time.'
  },
  {
    label: 'Area covered',
    bad: 'One keyword, one city, first page only. Roughly 40 businesses.',
    good: 'Every page inside the city, town or village you named — up to your plan’s cap.'
  },
  {
    label: 'Reply rate',
    bad: '1.8% on cold calls, and half of those are gatekeepers.',
    good: '14.5% when a WhatsApp lands on the proprietor’s own number.'
  }
];

const STEPS = [
  {
    icon: Search,
    title: 'Say what you sell and where',
    body: 'Type it the way you would say it out loud: “banquet halls in Hyderabad”. No filters, no dropdowns, no training video.',
    detail: 'The category and the place are read as two separate things.'
  },
  {
    icon: MapPin,
    title: 'We search that place properly',
    body: 'The city, town or village you named gets every page and every locality searched, then the duplicates are thrown away. Not the first page and a shrug.',
    detail: 'One search = one place. Run ten places, get ten clean lists.'
  },
  {
    icon: Phone,
    title: 'Call, message, close',
    body: 'Pincodes, landlines, helplines and dummy numbers are removed before you ever see them. What is left is a real mobile.',
    detail: 'Usually with WhatsApp already on it.'
  }
];

const DASH_POINTS = [
  { icon: Layers, title: 'Workspace', body: 'Category, city, how many leads. That is the whole setup.' },
  { icon: Users, title: 'Leads', body: 'Name, owner mobile, area, rating. Click a row for all 52 fields.' },
  { icon: MapPin, title: 'Map', body: 'Watch the city fill up, area by area, so you know what is covered.' },
  { icon: FolderArchive, title: 'Folders', body: 'Every search is saved with its category and city. Nothing gets lost.' },
  { icon: Target, title: 'CRM', body: 'New → pitched → talking → won. Notes and tasks stay on the business.' }
];

const PLAYBOOKS = [
  {
    who: 'Web / ads agency',
    title: 'Sell websites to shops that do not have one',
    body: 'Pick one category and one town. Find every shop with no website, message the owner, and show them a competitor who is already online. That is the entire pitch — no deck needed.',
    steps: ['Find 200 dentists in Guntur', 'Keep the ones with no website', 'Send 40 WhatsApp messages a day'],
    money: [{ k: '₹15k–40k', v: 'per client' }, { k: '3–4', v: 'clients a month' }, { k: '₹1,999', v: 'your cost' }]
  },
  {
    who: 'Distributor / wholesaler',
    title: 'Get your products into every shop in the town',
    body: 'You already know what sells. What you do not have is a list of every retailer who could stock it. Build the route before the salesmen leave the office.',
    steps: ['Every hardware shop across 3 towns', 'Filter by area, then plan the route', 'Owner numbers, not counter landlines'],
    money: [{ k: '1 stockist', v: 'pays for the year' }, { k: '3 towns', v: 'in one afternoon' }, { k: '₹0', v: 'to start' }]
  },
  {
    who: 'SaaS · insurance · loans · EdTech',
    title: 'Call the person who can actually say yes',
    body: 'A switchboard keeps you on hold for eleven minutes, then transfers you to somebody who is not there. An owner’s mobile rings once — and gets answered.',
    steps: ['Verified 10-digit owner mobiles', 'Only businesses in your target category', 'Export straight into your CRM'],
    money: [{ k: '14.5%', v: 'WhatsApp reply rate' }, { k: '1.8%', v: 'cold calling' }, { k: '8×', v: 'better' }]
  },
  {
    who: 'Freelancer / consultant',
    title: 'One afternoon, one niche, one list',
    body: 'You do not need a data team or a ₹40,000-a-month subscription. You need 500 names in one niche — and the nerve to send the first message.',
    steps: ['Pick the niche you know best', 'Build 500 leads before lunch', 'Start calling the same day'],
    money: [{ k: '500', v: 'leads in one sitting' }, { k: '₹0', v: 'free credits' }, { k: '1', v: 'first client' }]
  },
  {
    who: 'Agency / market research',
    title: 'Sell the list itself',
    body: 'Every client asks the same question: “who should we talk to in this city?”. You can answer it in twenty minutes, with clean columns, and charge for it every month.',
    steps: ['One city or town per client', 'Export CSV or Excel, clean columns', 'Charge it as market research'],
    money: [{ k: '₹5k–15k', v: 'per city report' }, { k: '1 city', v: '= 1 deliverable' }, { k: '₹0', v: 'extra effort' }]
  }
];

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '₹1,999',
    period: '/month',
    line: 'One person doing their own outreach.',
    credits: '2,000',
    perLead: '₹1.00',
    features: ['500 leads per search', 'All 52 fields', 'Map, folders and exports', 'Email support']
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '₹3,999',
    period: '/month',
    line: 'Agencies running daily searches.',
    credits: '10,000',
    perLead: '₹0.40',
    featured: true,
    features: ['2,000 leads per search', 'Everything in Starter', 'CRM with 7 stages', 'Deep profile expansion', 'Priority support']
  },
  {
    id: 'agency',
    name: 'Agency',
    price: '₹7,999',
    period: '/month',
    line: 'Multi-city teams and resellers.',
    credits: '50,000',
    perLead: '₹0.16',
    features: ['10,000 leads per search', 'Everything in Pro', 'Batch city & town searches', 'Client-ready export templates', 'Onboarding call']
  }
];

const FAQ = [
  {
    q: 'Where do these numbers come from?',
    a: 'From what businesses already publish so customers can reach them: their Maps listing, their own website, public directories. We read it fresh when you ask and check every number before it reaches you. Nothing comes from a bought list.'
  },
  {
    q: 'How do I know the mobile number is real?',
    a: 'It has to pass Indian mobile rules: ten digits, starts with 6, 7, 8 or 9, valid prefix. Pincodes, landlines, helplines and repeated dummy numbers are thrown out. If we cannot confirm a field, we write “Unknown”. We never invent a number to fill the row.'
  },
  {
    q: 'Will my competitor end up with the same list?',
    a: 'No. The list is built on your computer and stays on your computer. There is no shared database being resold to fifty people — which is exactly why your list will not look like everyone else’s.'
  },
  {
    q: 'What happens when my 1,000 free credits finish?',
    a: 'Nothing dramatic. Every business you already found stays yours: folders, notes, exports, CRM. You only need a plan if you want to keep finding new businesses. And credits never expire, so there is no clock running.'
  },
  {
    q: 'Do I need a fast internet connection?',
    a: 'A normal home broadband or a mobile hotspot is fine. The heavy work happens on your own PC, so you are not waiting in a queue behind other users.'
  },
  {
    q: 'Can I get a whole district, or every mandal in one go?',
    a: 'Not automatically, and that is on purpose: the app searches one city, town or village at a time, so the list you get is exactly the list you paid for. If you need a district-wide or mandal-level job, or a large multi-town run, email support@scraper.co.in and we will quote it as a custom order.'
  },
  {
    q: 'Which parts of India are covered?',
    a: 'All 28 states and 8 union territories. Major cities, smaller towns, and villages by name. If a place has businesses listed online, it can be searched.'
  },
  {
    q: 'Can I export this into Excel or my CRM?',
    a: 'Yes. Every folder exports to CSV and Excel with clean columns, so phone numbers stay as text and never turn into scientific notation. It imports straight into HubSpot, Notion or Google Sheets.'
  }
];

const CATEGORIES = [
  'Wedding photographers', 'Banquet halls', 'Dental clinics', 'Interior designers',
  'Plumbers', 'Electricians', 'Grocery stores', 'Restaurants', 'Real estate agents',
  'Gyms & fitness', 'Car showrooms', 'Solar installers', 'Travel operators',
  'Fabricators', 'Hospitals', 'Coaching centres', 'Printers', 'Caterers'
];

/* ================================================================== */
/* Place queue — the hero visual                                      */
/* ================================================================== */

function PlaceQueue() {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(reduce ? PLACES.length : 0);

  useEffect(() => {
    if (reduce) return undefined;

    let index = 0;
    let timer = null;

    const tick = () => {
      index += 1;
      setStep(index);

      if (index >= PLACES.length) {
        timer = setTimeout(() => {
          index = 0;
          setStep(0);
          timer = setTimeout(tick, 1000);
        }, 3600);
        return;
      }

      timer = setTimeout(tick, 760);
    };

    timer = setTimeout(tick, 500);
    return () => clearTimeout(timer);
  }, [reduce]);

  const found = PLACES.slice(0, step).reduce((sum, place) => sum + place.count, 0);
  const mobiles = Math.round(found * 0.935);
  const progress = Math.round((step / PLACES.length) * 100);

  return (
    <motion.div
      className="lp-sweep"
      initial={reduce ? false : { opacity: 0, y: 30, rotateX: 5 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.9, delay: 0.18, ease: EASE }}
      style={{ perspective: 1200 }}
    >
      <div className="lp-sweep-top">
        <div className="lp-dots"><span /><span /><span /></div>
        <span className="lp-sweep-title">Search queue</span>
        <span className="lp-sweep-live"><i /> live</span>
      </div>

      <div className="lp-sweep-head">
        <b>All India</b>
        <span>cities · towns · villages</span>
      </div>

      <div className="lp-q">
        {PLACES.map((place, index) => {
          const state = index < step ? 'done' : index === step ? 'busy' : 'idle';
          return (
            <div className="lp-q-row" data-state={state} key={place.name}>
              <span className="lp-q-pin"><MapPin size={10} /></span>
              <span className="lp-q-name">
                {place.name}
                <em>{place.state}</em>
              </span>
              {state === 'done' ? <span className="lp-q-count">{place.count}</span> : null}
              {state === 'busy' ? <span className="lp-q-busy">searching…</span> : null}
              {state === 'idle' ? <span className="lp-q-idle">queued</span> : null}
            </div>
          );
        })}
      </div>

      <div className="lp-sweep-bar">
        <motion.span animate={{ width: `${progress}%` }} transition={{ duration: 0.4, ease: 'linear' }} />
      </div>

      <div className="lp-sweep-meta">
        <span>Place <b>{Math.min(step, PLACES.length)}</b> of {PLACES.length}</span>
        <span><b>{found.toLocaleString('en-IN')}</b> found</span>
      </div>

      <div className="lp-sweep-foot">
        <div>
          <b>{found.toLocaleString('en-IN')}</b>
          <span>businesses</span>
        </div>
        <div>
          <b>{mobiles.toLocaleString('en-IN')}</b>
          <span>with a mobile</span>
        </div>
        <div>
          <b>~90s</b>
          <span>per place</span>
        </div>
      </div>
    </motion.div>
  );
}

/* ================================================================== */
/* Dashboard mock                                                     */
/* ================================================================== */

function DashboardMock() {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className="lp-window"
      initial={reduce ? false : { opacity: 0, y: 34 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-90px' }}
      transition={{ duration: 0.75, ease: EASE }}
    >
      <div className="lp-window-bar">
        <div className="lp-dots"><span /><span /><span /></div>
        <span className="lp-window-url">workspace — leads</span>
      </div>

      <div className="lp-window-tabs">
        {['Workspace', 'Leads 120', 'Map 120', 'CRM 8', 'Folders 36'].map((tab, index) => (
          <span key={tab} className={`lp-window-tab${index === 1 ? ' is-on' : ''}`}>{tab}</span>
        ))}
      </div>

      <div className="lp-window-body">
        <div className="lp-window-table">
          <div className="lp-window-tr is-head">
            <span>Business</span>
            <span>Mobile</span>
            <span />
          </div>
          {DASH_ROWS.map((row, index) => (
            <motion.div
              key={row.phone}
              className="lp-window-tr"
              initial={reduce ? false : { opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.42, delay: index * 0.07, ease: EASE }}
            >
              <span className="nm">{row.name}</span>
              <span className="ph">{row.phone}</span>
              <span className={`st ${row.stage}`} />
            </motion.div>
          ))}
        </div>

        <div className="lp-window-map">
          {MAP_PINS.map((pin, index) => (
            <motion.span
              key={index}
              className="lp-map-pin"
              style={{ left: pin.left, top: pin.top }}
              animate={reduce ? {} : { opacity: [0.4, 1, 0.4], scale: [1, 1.25, 1] }}
              transition={{ duration: 2.8, repeat: Infinity, delay: index * 0.26 }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ================================================================== */
/* Credit meter                                                       */
/* ================================================================== */

function CreditMeter() {
  const reduce = useReducedMotion();
  const [left, setLeft] = useState(reduce ? 180 : 1000);

  useEffect(() => {
    if (reduce) return undefined;
    const controls = animate(1000, 180, {
      duration: 5.5,
      ease: 'easeInOut',
      repeat: Infinity,
      repeatType: 'reverse',
      repeatDelay: 1.1,
      onUpdate: value => setLeft(value)
    });
    return () => controls.stop();
  }, [reduce]);

  const used = Math.round(1000 - left);

  return (
    <motion.div
      className="lp-credit-card"
      initial={reduce ? false : { opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, ease: EASE }}
    >
      <div className="lp-credit-top">
        <b>{Math.round(left).toLocaleString('en-IN')}</b>
        <span>credits left<br />1 credit = 1 business</span>
      </div>

      <div className="lp-meter">
        <motion.span animate={{ width: `${Math.max(4, (left / 1000) * 100)}%` }} transition={{ duration: 0.12 }} />
      </div>

      <ul className="lp-credit-rows">
        <li>
          <Check size={14} />
          <span><b>{used.toLocaleString('en-IN')} businesses found</b> — and every one came with a mobile number that passed the check.</span>
        </li>
        <li>
          <Check size={14} />
          <span><b>Granted once per computer.</b> Reinstalling, logging in again, or opening a second window will not reset it.</span>
        </li>
        <li>
          <Check size={14} />
          <span><b>They never expire.</b> Use 60 this month, 940 next month. No countdown, no “your trial ends today” email.</span>
        </li>
        <li>
          <Check size={14} />
          <span><b>Only new businesses cost credits.</b> Re-opening a folder, exporting, or writing a note is free.</span>
        </li>
      </ul>
    </motion.div>
  );
}

/* ================================================================== */
/* Section heading                                                    */
/* ================================================================== */

function Head({ tag, title, sub }) {
  return (
    <Reveal className="lp-head">
      <span className="lp-tag">{tag}</span>
      <h2 className="lp-h2">{title}</h2>
      {sub ? <p className="lp-sub">{sub}</p> : null}
    </Reveal>
  );
}

/* ================================================================== */
/* FAQ                                                                */
/* ================================================================== */

function FaqItem({ item, isOpen, onToggle }) {
  return (
    <div className={`lp-faq-item${isOpen ? ' is-open' : ''}`}>
      <button type="button" className="lp-faq-q" onClick={onToggle} aria-expanded={isOpen}>
        {item.q}
        <Plus size={16} />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            className="lp-faq-a"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: EASE }}
            style={{ overflow: 'hidden' }}
          >
            {item.a}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ================================================================== */
/* Page                                                               */
/* ================================================================== */

export default function LandingV2() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [solid, setSolid] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const [play, setPlay] = useState(0);

  const { scrollYProgress } = useScroll();
  const bar = useSpring(scrollYProgress, { stiffness: 140, damping: 26, restDelta: 0.001 });

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // index.css locks the body for the cockpit; the marketing page must scroll.
  useEffect(() => {
    document.documentElement.classList.add('lp-page');
    document.body.classList.add('lp-page');
    return () => {
      document.documentElement.classList.remove('lp-page');
      document.body.classList.remove('lp-page');
    };
  }, []);

  const go = () => navigate('/command');

  const jump = id => {
    const node = document.getElementById(id);
    if (!node) return;
    node.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };

  const active = PLAYBOOKS[play];

  return (
    <div className="lp-root">
      <div className="lp-glow lp-glow-1" />
      <div className="lp-glow lp-glow-2" />
      <div className="lp-glow lp-glow-3" />
      <div className="lp-mesh" />

      <motion.div
        style={{
          scaleX: bar,
          transformOrigin: '0% 50%',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          zIndex: 80,
          background: 'linear-gradient(90deg, #2563eb, #22d3ee)',
          boxShadow: '0 0 14px rgba(34,211,238,0.5)'
        }}
      />

      <header className="lp-nav" data-solid={solid}>
        <div className="lp-nav-in">
          <div className="lp-brand">
            <span className="lp-brand-mark">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z" stroke="#e0f2fe" strokeWidth="1.7" strokeLinejoin="round" />
                <circle cx="12" cy="10" r="2.6" stroke="#a5f3fc" strokeWidth="1.7" />
              </svg>
            </span>
            <span className="lp-brand-text">
              <b>SCRAPER</b>
              <span>Lead intelligence</span>
            </span>
          </div>

          <nav className="lp-links">
            <button type="button" onClick={() => jump('why')}>Why us</button>
            <button type="button" onClick={() => jump('difference')}>One place at a time</button>
            <button type="button" onClick={() => jump('how')}>How it works</button>
            <button type="button" onClick={() => jump('money')}>Make money</button>
            <button type="button" onClick={() => jump('pricing')}>Pricing</button>
          </nav>

          <div className="lp-nav-right">
            <span className="lp-pill"><i /> 1,000 leads free</span>
            <button
              type="button"
              className="lp-btn lp-btn-sm"
              onClick={() => navigate('/master')}
              style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c)', color: '#fff', border: 'none', fontWeight: 700 }}
              title="Open Master Command Center for District, State & Mandal coverage"
            >
              🗺️ Master Center
            </button>
            <button type="button" className="lp-btn lp-btn-primary lp-btn-sm" onClick={go}>
              Client Workspace <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* ------------------------------------------------------- hero */}
        <section className="lp-hero">
          <div className="lp-wrap lp-hero-grid">
            <div>
              <motion.span
                className="lp-eyebrow"
                initial={reduce ? false : { opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: EASE }}
              >
                🔥 B2B LEAD RADAR · STARTUPS, AGENCIES & GROWING ENTERPRISES · ALL 28 STATES
              </motion.span>

              <motion.h1
                className="lp-h1"
                initial={reduce ? false : 'hidden'}
                animate="show"
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.11, delayChildren: 0.05 } } }}
              >
                <motion.span variants={fadeUp} style={{ display: 'block' }}>Every shop in the town.</motion.span>
                <motion.span variants={fadeUp} style={{ display: 'block' }}>
                  <span className="lp-hl lp-hl-vibrant">Every district, mandal & city.</span>
                </motion.span>
              </motion.h1>

              <motion.p
                className="lp-lede"
                initial={reduce ? false : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.18, ease: EASE }}
              >
                Name any city, town or village in India. Ninety seconds later you have a fresh list
                of real businesses there, with <b>the owner’s mobile number</b> — the one that
                actually rings, and usually has WhatsApp.
              </motion.p>

              <motion.div
                className="lp-cta"
                initial={reduce ? false : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.26, ease: EASE }}
              >
                <button type="button" className="lp-btn-3d" onClick={go}>
                  🚀 Client Workspace (Single City/Town) <ArrowRight size={16} />
                </button>
                <button
                  type="button"
                  className="lp-btn-3d lp-btn-3d-cyan"
                  onClick={() => navigate('/master')}
                  title="Open Master Command Center for complete district and state sweeps"
                >
                  🗺️ Master Center (District & State Sweeps)
                </button>
              </motion.div>

              <motion.ul
                className="lp-micro"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.36 }}
              >
                <li><Check size={13} /> No card</li>
                <li><Check size={13} /> No login</li>
                <li><Check size={13} /> Nothing leaves your PC</li>
                <li><Check size={13} /> 1,000 leads, once per computer</li>
              </motion.ul>
            </div>

            <PlaceQueue />
          </div>

          <div className="lp-wrap">
            <Stagger className="lp-stats" step={0.09}>
              <Item className="lp-stat">
                <b><Num to={500} format /> leads</b>
                <span>From one city, town or village search. More on bigger plans.</span>
              </Item>
              <Item className="lp-stat">
                <b>&lt; <Num to={90} /> sec</b>
                <span>From typing the words to a list you can start messaging.</span>
              </Item>
              <Item className="lp-stat">
                <b><Num to={52} /> fields</b>
                <span>Owner, GSTIN, hours, reviews, photos, socials — where published.</span>
              </Item>
              <Item className="lp-stat">
                <b><Num to={100} />% mobiles</b>
                <span>Every number is a validated Indian 10-digit mobile. Nothing else gets in.</span>
              </Item>
            </Stagger>

            <Reveal delay={0.05}>
              <div className="lp-cover">
                <span className="lp-cover-label"><MapPin size={12} /> Coverage</span>
                <p>
                  <b>All 28 states and 8 union territories.</b> Every major city, plus towns and
                  villages by name. Search them one at a time, or ask us for a district-wide run.
                </p>
              </div>
            </Reveal>

            <div className="lp-marquee">
              <div className="lp-marquee-track">
                {[...CATEGORIES, ...CATEGORIES].map((category, index) => (
                  <span className="lp-chip" key={`${category}-${index}`}>{category}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------- difference */}
        
        {/* ------------------------------------------------------- AUDIENCE & AGENCY POWER */}
        <section className="lp-section" id="agency-power">
          <div className="lp-wrap">
            <Reveal className="lp-head">
              <span className="lp-kicker">BUILT FOR HIGH-VELOCITY REVENUE</span>
              <h2 className="lp-h2">Why Startups, Agencies & Growing Businesses Swear By LeadHarvest Pro</h2>
              <p className="lp-sub">From a founder needing their first 50 paying customers to a marketing agency delivering multi-city lead campaigns — we do the heavy lifting so you close deals.</p>
            </Reveal>

            <div className="lp-audience-grid">
              {/* Pillar 1: Startups */}
              <div className="lp-audience-card theme-startup">
                <span className="lp-audience-pill">🚀 FOR STARTUPS & FOUNDERS</span>
                <h3>Close Your First 50 Customers Before Lunch</h3>
                <p>Stop paying ₹40,000/mo for stale databases. Type your target niche and town, get verified Indian 10-digit mobile lines, and launch direct WhatsApp outreach the same afternoon.</p>
                <ul className="lp-audience-points">
                  <li><Check size={14} className="v2-text-lime" /> Zero gatekeepers — owner mobiles only</li>
                  <li><Check size={14} className="v2-text-lime" /> High reply rate (14.5% on WhatsApp)</li>
                  <li><Check size={14} className="v2-text-lime" /> ₹0 to start with 1,000 free credits</li>
                </ul>
              </div>

              {/* Pillar 2: Agencies */}
              <div className="lp-audience-card theme-agency">
                <span className="lp-audience-pill">🏢 FOR AGENCIES & LEAD RESELLERS</span>
                <h3>Sell City Lead Packs at ₹5,000–₹15,000 Per Report</h3>
                <p>Your clients constantly ask "who should we target in this city?". Run a 90-second radar sweep, export a clean client-ready spreadsheet, and charge recurring monthly retainer fees.</p>
                <ul className="lp-audience-points">
                  <li><Check size={14} className="v2-text-violet" /> White-label export templates (CSV, Dialer, VCF)</li>
                  <li><Check size={14} className="v2-text-violet" /> Search Vault Folders for each client account</li>
                  <li><Check size={14} className="v2-text-violet" /> 3 reports a month = ₹45,000 extra profit</li>
                </ul>
              </div>

              {/* Pillar 3: Wholesalers & Establishments */}
              <div className="lp-audience-card theme-enterprise">
                <span className="lp-audience-pill">🏭 FOR DISTRIBUTORS & ENTERPRISES</span>
                <h3>Sweep Entire Mandals & Districts in 1 Click</h3>
                <p>Expanding dealership routes? Our Master Folder engine sweeps all 14–35 mandals in a district simultaneously, eliminating duplicates so your sales reps never collide.</p>
                <ul className="lp-audience-points">
                  <li><Check size={14} className="v2-text-cyan" /> Complete district & state geo coverage</li>
                  <li><Check size={14} className="v2-text-cyan" /> Built-in 7-stage CRM pipeline with ₹ INR deal values</li>
                  <li><Check size={14} className="v2-text-cyan" /> Telephony dialer format for your calling team</li>
                </ul>
              </div>
            </div>

            {/* Master Geo-Swarm Visual Explainer */}
            <div className="lp-geo-swarm-box">
              <span className="lp-kicker">🗺️ THE ONLY 3-TIER GEO INTELLIGENCE ENGINE IN INDIA</span>
              <h3 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: '8px 0 12px' }}>
                Type Any State, District, Mandal or Village — The Engine Knows Exactly How to Swarm It
              </h3>
              <p style={{ color: '#94a3b8', fontSize: 14, maxWidth: 820, margin: 0 }}>
                Other tools stop at page one of a single city. LeadHarvest Pro indexes all 36 states, 627 districts, and 5,618 mandals locally. Whether you need every photo studio in Tenali Mandal or all hardware suppliers across Guntur District, you get complete regional coverage.
              </p>
              <div className="lp-geo-tiers">
                <div className="lp-geo-tier-card">
                  <b>📍 Tier 1: Mandal / Tehsil Swarm</b>
                  <p>Swarms all constituent villages, commercial markets, and town wards. Yields 60–150 hyper-targeted local vendor numbers.</p>
                </div>
                <div className="lp-geo-tier-card">
                  <b>🗺️ Tier 2: District Master Sweep</b>
                  <p>Orchestrates all 14–35 mandals across the entire district into a single consolidated Master Folder with zero cross-mandal duplicates.</p>
                </div>
                <div className="lp-geo-tier-card">
                  <b>🏛️ Tier 3: State-Wide Swarm</b>
                  <p>Deploys multi-threaded workers across all economic districts in the state for massive enterprise B2B distributor discovery.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="lp-section" id="difference">
          <div className="lp-wrap">
            <Head
              tag="One place, searched properly"
              title="Page one is not the whole town."
              sub={
                <>
                  Type “plumbers in Guntur” into a normal tool and you get the first page — maybe forty
                  shops. We keep going: every page, every locality inside that city, town or village,
                  duplicates removed. <b>One search gives you the whole place</b> — then you move to the next one.
                </>
              }
            />

            <Reveal>
              <div className="lp-gap">
                <div className="lp-gap-row" data-tone="bad">
                  <div className="lp-gap-label">
                    <b>Other tools</b>
                    <span>One keyword · first page</span>
                  </div>
                  <div className="lp-gap-track">
                    <motion.div
                      className="lp-gap-fill"
                      initial={reduce ? false : { width: 0 }}
                      whileInView={{ width: '3.1%' }}
                      viewport={{ once: true, margin: '-60px' }}
                      transition={{ duration: 0.9, delay: 0.15, ease: EASE }}
                    />
                  </div>
                  <div className="lp-gap-num">~40</div>
                </div>

                <div className="lp-gap-row" data-tone="good">
                  <div className="lp-gap-label">
                    <b>Scraper</b>
                    <span>Every page in that city, town or village</span>
                  </div>
                  <div className="lp-gap-track">
                    <motion.div
                      className="lp-gap-fill"
                      initial={reduce ? false : { width: 0 }}
                      whileInView={{ width: '100%' }}
                      viewport={{ once: true, margin: '-60px' }}
                      transition={{ duration: 1.6, delay: 0.25, ease: EASE }}
                    />
                  </div>
                  <div className="lp-gap-num">500</div>
                </div>

                <p className="lp-gap-note">
                  Same place. Same afternoon. <b>12× more businesses</b> on the smallest plan — and
                  roughly twelve times more chances to find the one that says yes. Bigger plans go
                  up to 10,000 per search.
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              <div className="lp-custom">
                <div>
                  <span className="lp-custom-kicker"><MapPin size={12} /> Need more than one place?</span>
                  <h3>Whole district? Every mandal? That is a custom run.</h3>
                  <p>
                    The app searches one city, town or village at a time, so you always know exactly
                    what you are paying for. If you need a district-wide or mandal-level list, or a
                    big multi-town job, <b>tell us and we will quote it</b>.
                  </p>
                </div>
                <a className="lp-btn lp-btn-ghost" href="mailto:support@scraper.co.in?subject=District%20or%20mandal%20list">
                  Ask for a custom run <ArrowRight size={14} />
                </a>
              </div>
            </Reveal>
          </div>
        </section>

        {/* --------------------------------------------------------- why */}
        <section className="lp-section" id="why">
          <div className="lp-wrap">
            <Head
              tag="Why startups keep this open"
              title="Three reasons you will not go back to a bought list."
              sub="Bought lists were built for a world of landlines and call centres. Indian business runs on one proprietor, one mobile, and a WhatsApp message."
            />

            <Stagger className="lp-cards-3">
              <Item className="lp-card">
                <span className="lp-card-icon"><Clock3 size={19} /></span>
                <h3>Everything is fresh</h3>
                <p>
                  Every search is a <b>live search</b>. Nothing comes from a six-month-old dump.
                  Shop closed? Changed hands? It does not show up in your list.
                </p>
                <div className="lp-card-figure">
                  <b>Fresh</b>
                  <span>on every single search</span>
                </div>
              </Item>

              <Item className="lp-card">
                <span className="lp-card-icon"><Phone size={19} /></span>
                <h3>The owner’s mobile, not the office line</h3>
                <p>
                  Not the reception. Not “call between 11 and 4”. The number that belongs to the
                  person who can say yes — <b>and usually has WhatsApp</b>.
                </p>
                <div className="lp-card-figure">
                  <b>10 digits</b>
                  <span>validated, every time</span>
                </div>
              </Item>

              <Item className="lp-card">
                <span className="lp-card-icon"><TrendingUp size={19} /></span>
                <h3>Lower cost to win a customer</h3>
                <p>
                  When more of your messages reach a real decision-maker, you spend less to win
                  each one. Same team, same budget, <b>more closed deals</b>.
                </p>
                <div className="lp-card-figure">
                  <b>14.5%</b>
                  <span>WhatsApp replies vs 1.8% cold calling</span>
                </div>
              </Item>
            </Stagger>
          </div>
        </section>

        {/* ----------------------------------------------------- compare */}
        <section className="lp-section" id="compare">
          <div className="lp-wrap">
            <Head
              tag="The honest scorecard"
              title="Old databases vs a live place search"
              sub="Six rows. Every one of them something you can check yourself in the first ten minutes."
            />

            <Reveal>
              <div className="lp-compare">
                <div className="lp-compare-head">
                  <div>What matters</div>
                  <div className="is-bad">Bought lists &amp; old tools</div>
                  <div className="is-good">LeadHarvest Pro (Live Radar)</div>
                </div>

                {COMPARE.map((row, index) => (
                  <motion.div
                    className="lp-compare-row"
                    key={row.label}
                    initial={reduce ? false : { opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ duration: 0.45, delay: index * 0.06, ease: EASE }}
                  >
                    <div className="lp-compare-cell is-label">{row.label}</div>
                    <div className="lp-compare-cell is-bad"><X size={13} /> <span>{row.bad}</span></div>
                    <div className="lp-compare-cell is-good"><Check size={13} /> <span>{row.good}</span></div>
                  </motion.div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* --------------------------------------------------------- how */}
        <section className="lp-section" id="how">
          <div className="lp-wrap">
            <Head
              tag="How it works"
              title="Three steps. About the time it takes to make chai."
              sub="If you can type a WhatsApp message, you can run this. Nothing to configure, no manual, no training call."
            />

            <Stagger className="lp-steps">
              {STEPS.map((step, index) => {
                const Icon = step.icon;
                return (
                  <Item className="lp-step" key={step.title}>
                    <span className="lp-step-num">0{index + 1}</span>
                    <span className="lp-step-icon"><Icon size={20} /></span>
                    <h3>{step.title}</h3>
                    <p>{step.body}</p>
                    <small>{step.detail}</small>
                  </Item>
                );
              })}
            </Stagger>
          </div>
        </section>

        {/* --------------------------------------------------- dashboard */}
        <section className="lp-section" id="dashboard">
          <div className="lp-wrap">
            <div className="lp-dash-grid">
              <div>
                <Reveal>
                  <span className="lp-tag">Inside the dashboard</span>
                  <h2 className="lp-h2">One screen. No manual.</h2>
                  <p className="lp-sub">
                    Left: tell it what you want. Right: work the list. That is genuinely the whole app.
                  </p>
                </Reveal>

                <ul className="lp-dash-list">
                  {DASH_POINTS.map((point, index) => {
                    const Icon = point.icon;
                    return (
                      <motion.li
                        key={point.title}
                        initial={reduce ? false : { opacity: 0, y: 18 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-40px' }}
                        transition={{ duration: 0.5, delay: index * 0.07, ease: EASE }}
                      >
                        <span className="ico"><Icon size={16} /></span>
                        <span className="lp-dash-text">
                          <b>{point.title}</b>
                          <span>{point.body}</span>
                        </span>
                      </motion.li>
                    );
                  })}
                </ul>
              </div>

              <DashboardMock />
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------- money */}
        <section className="lp-section" id="money">
          <div className="lp-wrap">
            <Head
              tag="How people actually make money"
              title="Five ways customers use this."
              sub="Same list. Five very different businesses. Pick the one that sounds like yours."
            />

            <div className="lp-money">
              <div className="lp-tabs">
                {PLAYBOOKS.map((item, index) => (
                  <button
                    key={item.title}
                    type="button"
                    className="lp-tab"
                    data-on={index === play}
                    onClick={() => setPlay(index)}
                  >
                    <span className="n">0{index + 1}</span>
                    {item.who}
                  </button>
                ))}
              </div>

              <div className="lp-play">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={active.title}
                    initial={reduce ? false : { opacity: 0, x: 22 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={reduce ? undefined : { opacity: 0, x: -18 }}
                    transition={{ duration: 0.32, ease: EASE }}
                  >
                    <span className="who"><Briefcase size={12} /> {active.who}</span>
                    <h3>{active.title}</h3>
                    <p>{active.body}</p>

                    <ul className="lp-play-steps">
                      {active.steps.map(step => (
                        <li key={step}><CheckCircle2 size={13} /> {step}</li>
                      ))}
                    </ul>

                    <div className="lp-play-money">
                      {active.money.map(item => (
                        <div key={item.v}>
                          <b>{item.k}</b>
                          <span>{item.v}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </section>

        {/* --------------------------------------------- startups/agencies */}
        <section className="lp-section" id="who">
          <div className="lp-wrap">
            <Head
              tag="Two very different lives"
              title="Just starting, or already running?"
              sub="The list is the same. What you do with it is not."
            />

            <Stagger className="lp-two">
              <Item className="lp-panel">
                <span className="lp-panel-kicker"><Sparkles size={12} /> Just starting</span>
                <h3>You have everything except a list.</h3>
                <p>
                  No data team. No ₹40,000-a-month subscription. No idea where the first hundred
                  customers are hiding. <b>That is the exact problem this solves</b> — and the first
                  1,000 leads are on us.
                </p>
                <ul className="lp-panel-list">
                  <li><Check size={13} /> Pick one niche and one town. That is your whole market.</li>
                  <li><Check size={13} /> Message 100 owners a day on WhatsApp, personally.</li>
                  <li><Check size={13} /> Book your first call this week, not this quarter.</li>
                  <li><Check size={13} /> Pay nothing until the 1,000 run out.</li>
                </ul>
                <div className="lp-panel-metric">
                  <b>₹0</b>
                  <span>to your first real lead list</span>
                </div>
              </Item>

              <Item className="lp-panel is-accent">
                <span className="lp-panel-kicker"><Store size={12} /> Already running</span>
                <h3>You have clients. You need fresh ground.</h3>
                <p>
                  Your process works. What breaks is scale: every new client wants a new city, and
                  every bought list looks exactly like the one your competitor bought.{' '}
                  <b>A town nobody else has searched</b> is your unfair advantage.
                </p>
                <ul className="lp-panel-list">
                  <li><Check size={13} /> One new city or town per client, per month.</li>
                  <li><Check size={13} /> Export clean columns straight into HubSpot or Notion.</li>
                  <li><Check size={13} /> Deliver market research as a paid add-on.</li>
                  <li><Check size={13} /> Your list stays private — it is not resold to anyone.</li>
                </ul>
                <div className="lp-panel-metric">
                  <b>1 city</b>
                  <span>= 1 new billable deliverable</span>
                </div>
              </Item>
            </Stagger>
          </div>
        </section>

        {/* ----------------------------------------------------- credits */}
        <section className="lp-section" id="credits">
          <div className="lp-wrap lp-credit-grid">
            <div>
              <Reveal>
                <span className="lp-tag">The free part, honestly</span>
                <h2 className="lp-h2">1,000 leads free. <em>No card, no countdown.</em></h2>
                <p className="lp-sub">
                  A trial expires while you are busy. Credits wait for you. One credit finds one
                  business, and your first thousand are on the house — <b>once per computer</b>.
                </p>
              </Reveal>

              <Reveal delay={0.1}>
                <ul className="lp-credit-rows" style={{ marginTop: 22 }}>
                  <li><Check size={14} /><span><b>One credit, one business.</b> Not one search. Not one page. One real business with a working mobile.</span></li>
                  <li><Check size={14} /><span><b>Free once per computer.</b> No login required, so there is nothing to sign up for twice.</span></li>
                  <li><Check size={14} /><span><b>Never expires.</b> Use them at your pace.</span></li>
                </ul>
              </Reveal>
            </div>

            <CreditMeter />
          </div>
        </section>

        {/* ----------------------------------------------------- pricing */}
        <section className="lp-section" id="pricing">
          <div className="lp-wrap">
            <Head
              tag="Pricing"
              title="Pick a size. Cancel whenever."
              sub="Every plan includes the whole engine — map, folders, CRM, exports. The only difference is how many leads you can pull each month."
            />

            <Stagger className="lp-pricing">
              {PLANS.map(plan => (
                <Item key={plan.id} className={`lp-plan${plan.featured ? ' is-featured' : ''}`}>
                  {plan.featured ? (
                    <span className="lp-plan-badge"><Sparkles size={10} /> Most popular</span>
                  ) : null}

                  <div className="lp-plan-name">{plan.name}</div>
                  <div className="lp-plan-price">
                    <b>{plan.price}</b>
                    <span>{plan.period}</span>
                  </div>
                  <div className="lp-plan-line">{plan.line}</div>

                  <div className="lp-plan-credits">
                    <b>{plan.credits}</b>
                    <span>leads / month · {plan.perLead} each</span>
                  </div>

                  <ul className="lp-plan-features">
                    {plan.features.map(feature => (
                      <li key={feature}><Check size={13} /> {feature}</li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    className={`lp-btn ${plan.featured ? 'lp-btn-primary' : 'lp-btn-ghost'}`}
                    onClick={go}
                  >
                    {plan.featured ? 'Start with 1,000 free' : `Choose ${plan.name}`}
                  </button>
                </Item>
              ))}
            </Stagger>

            <Reveal>
              <div className="lp-cost">
                <p>
                  <b>Starter is ₹1 per lead. Pro is 40 paise. Agency is 16 paise.</b> For a number
                  you can actually ring, that is cheaper than the chai you drink while cold-calling.
                  One closed client covers the month.
                </p>
                <button type="button" className="lp-btn lp-btn-ghost lp-btn-sm" onClick={go}>
                  Try it free <ArrowRight size={13} />
                </button>
              </div>
            </Reveal>
          </div>
        </section>

        {/* --------------------------------------------------------- faq */}
        <section className="lp-section" id="faq">
          <div className="lp-wrap">
            <Head tag="Questions" title="The things people ask before they press the button." />

            <Reveal className="lp-faq">
              {FAQ.map((item, index) => (
                <FaqItem
                  key={item.q}
                  item={item}
                  isOpen={openFaq === index}
                  onToggle={() => setOpenFaq(openFaq === index ? -1 : index)}
                />
              ))}
            </Reveal>
          </div>
        </section>

        {/* ------------------------------------------------------- final */}
        <section className="lp-final">
          <div className="lp-wrap lp-final-in">
            <Reveal>
              <span className="lp-tag" style={{ justifyContent: 'center' }}>Go on then</span>
              <h2>Your next customer already has WhatsApp.</h2>
              <p>
                Open the dashboard, type what you sell and where you sell it, and watch the town
                fill up. The first 1,000 leads cost nothing. The only thing you risk is a busy week.
              </p>
              <div className="lp-cta">
                <button type="button" className="lp-btn lp-btn-primary lp-btn-lg" onClick={go}>
                  Get 1,000 leads free <ArrowRight size={16} />
                </button>
                <button type="button" className="lp-btn lp-btn-ghost lp-btn-lg" onClick={() => jump('pricing')}>
                  See pricing
                </button>
              </div>
              <ul className="lp-micro">
                <li><Check size={13} /> No card</li>
                <li><Check size={13} /> Cancel anytime</li>
                <li><Check size={13} /> Your data stays with you</li>
              </ul>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-wrap lp-footer-in">
          <span className="lp-footer-note">© {new Date().getFullYear()} scraper.co.in</span>
          <div className="lp-footer-links">
            <a href="/pricing">Pricing</a>
            <a href="/terms">Terms</a>
            <a href="/privacy">Privacy</a>
            <a href="mailto:support@scraper.co.in">support@scraper.co.in</a>
          </div>
          <span className="lp-footer-note">Made in India</span>
        </div>
      </footer>
    </div>
  );
}
