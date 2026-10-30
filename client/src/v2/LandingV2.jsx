import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  motion, AnimatePresence, useInView, useReducedMotion, animate
} from 'framer-motion';
import {
  ArrowRight, Briefcase, Check, CheckCircle2, Clock3, FolderArchive, Layers,
  LineChart, MapPin, Phone, Play, Plus, Radar as RadarIcon, Search, Sparkles,
  Store, Target, TrendingUp, Users, X
} from 'lucide-react';
import './landing.css';

/* ------------------------------------------------------------------ */
/* Motion helpers                                                      */
/* ------------------------------------------------------------------ */

const EASE = [0.16, 1, 0.3, 1];

function FadeUp({ children, delay = 0, y = 22, className = '', once = true }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: '-70px' }}
      transition={{ duration: 0.62, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

function Stagger({ children, className = '', delay = 0, step = 0.09 }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-60px' }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: step, delayChildren: delay } }
      }}
    >
      {children}
    </motion.div>
  );
}

const childVariant = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } }
};

function StaggerItem({ children, className = '' }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} variants={childVariant}>
      {children}
    </motion.div>
  );
}

/* Animated number that counts up when it scrolls into view. */
function Counter({ to, decimals = 0, prefix = '', suffix = '', duration = 1.5 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
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

  return (
    <span ref={ref}>
      {prefix}
      {value.toFixed(decimals)}
      {suffix}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Copy                                                                */
/* ------------------------------------------------------------------ */

const DEMO_QUERIES = [
  'wedding photographers in Vijayawada',
  'grocery stores in Guntur',
  'dental clinics in Warangal'
];

const DEMO_ROWS = [
  { name: 'Sri Balaji Digital Studio', area: 'Benz Circle, Vijayawada', phone: '+91 98480 21456' },
  { name: 'Sai Ram Photo & Films', area: 'Gunadala, Vijayawada', phone: '+91 99631 78204' },
  { name: 'NTR Wedding Clicks', area: 'Governorpet, Vijayawada', phone: '+91 90000 31987' }
];

const DASH_ROWS = [
  { name: 'Sri Balaji Plumbing Works', phone: '+91 98480 21456', stage: 'is-new' },
  { name: 'Sai Ram Plumbers & Fittings', phone: '+91 99631 78204', stage: 'is-hot' },
  { name: 'NTR Plumbing Services', phone: '+91 90000 31987', stage: 'is-won' },
  { name: 'Krishna Pipe Traders', phone: '+91 94910 77321', stage: 'is-new' },
  { name: 'Lakshmi Borewells', phone: '+91 90009 11452', stage: 'is-hot' },
  { name: 'Amar Hardware & Sanitary', phone: '+91 91778 30094', stage: 'is-new' }
];

const COMPARE = [
  {
    label: 'Phone quality',
    bad: 'Landlines (080-, 040-) or switchboards. Around 65% of calls go nowhere.',
    good: 'Direct Indian 10-digit mobiles (+91 98…, 97…, 99…). If it is not a real mobile, we drop it.'
  },
  {
    label: 'Data freshness',
    bad: 'Lists scraped 6+ months ago, copied from public dumps and resold many times.',
    good: 'Live harvest every time you search. Closed shops and changed numbers do not come back.'
  },
  {
    label: 'Data depth',
    bad: 'A name and a phone number. Nothing else to work with.',
    good: 'A full 52-field dossier: owner, GSTIN, pricing, hours, reviews and socials — whenever the source publishes them.'
  },
  {
    label: 'Location accuracy',
    bad: 'Messy free text like "Narasaraopet Wedding…" that cannot be filtered.',
    good: 'A clean 4-level hierarchy: State → District → Mandal → Village.'
  },
  {
    label: 'Usable hit rate',
    bad: 'Under 3% of rows are reachable local businesses.',
    good: 'Only validated 10-digit numbers. No pincodes, no helplines, no dummy sequences.'
  },
  {
    label: 'Reply rate',
    bad: '1.8% on cold calls, and mostly you speak to a gatekeeper.',
    good: '14.5% reply rate when you send a one-click WhatsApp to the proprietor.'
  }
];

const STEPS = [
  {
    icon: Search,
    title: 'Type it the way you speak',
    body: '“Wedding photographers in Vijayawada” or “grocery stores in Guntur”. Plain English, local spelling, either works.',
    detail: 'We read the category and the place as two separate things.'
  },
  {
    icon: RadarIcon,
    title: 'We search the right sources',
    body: 'The engine picks the correct public sources for that category and district by itself. You never have to choose a directory.',
    detail: 'Maps, local listings, business directories and the shop’s own website.'
  },
  {
    icon: Phone,
    title: 'Get numbers you can call',
    body: 'Pincodes, helplines, dummy sequences and duplicates are removed before you ever see them. What is left is a real mobile.',
    detail: 'Then push each owner through your own follow-up pipeline.'
  }
];

const DASH_POINTS = [
  {
    icon: Layers,
    title: 'Workspace — one search box',
    body: 'Category, city and how many leads you want. That is the whole setup.'
  },
  {
    icon: Users,
    title: 'Leads — the list you actually work',
    body: 'Name, owner mobile, area, rating and full profile. Click a row to see all 52 fields.'
  },
  {
    icon: MapPin,
    title: 'Map — see the city fill up',
    body: 'Real pins appear area by area, so you know exactly what has been covered.'
  },
  {
    icon: FolderArchive,
    title: 'Folders — nothing is ever lost',
    body: 'Every search is saved with its category, city and leads. Reopen any old search later.'
  },
  {
    icon: Target,
    title: 'CRM — follow-up built in',
    body: 'New, pitched, talking, qualified, won. Notes and tasks stay attached to the business.'
  }
];

const AUDIENCES = [
  {
    icon: LineChart,
    title: 'B2B SaaS & fintech',
    body: 'Pull 500 grocery stores, restaurants or clinics with verified mobiles for a WhatsApp pitch campaign.',
    quote: 'Reply rate moves from 1.8% to 14.5% — same team, same number of messages.'
  },
  {
    icon: Store,
    title: 'Marketplaces & aggregators',
    body: 'Fill entire supplier networks in tier-2 and tier-3 cities — Guntur, Vijayawada, Warangal, Palnadu.',
    quote: 'A full city list with photos and pricing in about 15 minutes.'
  },
  {
    icon: Briefcase,
    title: 'Growth agencies',
    body: 'Hand every client their own lead vault, exported to CSV or Excel and ready for HubSpot or Notion.',
    quote: 'Clean columns, no scientific notation, no cleaning up before import.'
  }
];

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '₹1,999',
    period: '/month',
    line: 'For one person doing their own outreach.',
    leads: '500 leads per search',
    seats: '1 computer',
    features: [
      '500 leads in every search',
      'All 52 vendor fields',
      'Live map and saved folders',
      'CSV and Excel export',
      'Email support'
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '₹3,999',
    period: '/month',
    line: 'For agencies running daily sweeps.',
    leads: '2,000 leads per search',
    seats: '3 computers',
    featured: true,
    features: [
      '2,000 leads in every search',
      'Everything in Starter',
      'CRM with 7 stages and notes',
      'Deep profile expansion',
      'Priority support'
    ]
  },
  {
    id: 'agency',
    name: 'Agency',
    price: '₹7,999',
    period: '/month',
    line: 'For multi-city teams.',
    leads: '10,000 leads per search',
    seats: '10 computers',
    features: [
      '10,000 leads in every search',
      'Everything in Pro',
      'Multi-city category sweeps',
      'Client-ready export templates',
      'Onboarding call'
    ]
  }
];

const FAQ = [
  {
    q: 'Where do the numbers come from?',
    a: 'From public business information that shops and offices already publish — maps listings, business directories and their own websites. We collect it fresh when you search, then clean and validate it. Nothing is bought from a resold list.'
  },
  {
    q: 'How do I know the numbers are real?',
    a: 'Every number is checked against Indian mobile rules: 10 digits, starts with 6, 7, 8 or 9, correct prefix. Pincodes, landlines, helplines and repeated dummy sequences are thrown away. If a field is unknown, we show “Unknown” — we never fill it with a guess.'
  },
  {
    q: 'Will the same list be sold to my competitors?',
    a: 'No. Every search runs live on your computer and the results stay on your computer. There is no shared database that gets resold, which is exactly why your list will not look like everyone else’s.'
  },
  {
    q: 'Do I need a fast internet connection?',
    a: 'A normal home broadband or mobile hotspot is enough. The heavy work happens on your own PC, not on a server, so you are not waiting in a queue behind other users.'
  },
  {
    q: 'Can I export to Excel or my CRM?',
    a: 'Yes. Every folder exports to CSV and Excel with clean columns, so numbers stay as text and never turn into scientific notation. It imports straight into HubSpot, Notion or Google Sheets.'
  },
  {
    q: 'Is this allowed?',
    a: 'You are collecting business contact details that the business itself publishes for customers to call. Use the data responsibly: contact only relevant businesses, respect do-not-disturb requests, and follow the rules of the platforms you reach out on.'
  }
];

const CATEGORIES = [
  'Wedding photographers', 'Banquet halls', 'Dental clinics', 'Interior designers',
  'Plumbers', 'Electricians', 'Grocery stores', 'Restaurants', 'Real estate agents',
  'Gyms & fitness', 'Car showrooms', 'Solar installers', 'Travel operators',
  'Fabricators', 'Hospitals', 'Coaching centres', 'Printers', 'Caterers'
];

/* ------------------------------------------------------------------ */
/* Hero demo console                                                   */
/* ------------------------------------------------------------------ */

const RADAR_PINS = [
  { left: '26%', top: '34%' },
  { left: '58%', top: '22%' },
  { left: '72%', top: '52%' },
  { left: '38%', top: '62%' },
  { left: '52%', top: '74%' }
];

function DemoConsole() {
  const reduce = useReducedMotion();
  const [typed, setTyped] = useState(reduce ? DEMO_QUERIES[0] : '');
  const [phase, setPhase] = useState(reduce ? 'results' : 'typing');
  const [queryIndex, setQueryIndex] = useState(0);

  useEffect(() => {
    if (reduce) return undefined;

    let alive = true;
    let timer = null;
    const query = DEMO_QUERIES[queryIndex];

    setTyped('');
    setPhase('typing');

    let i = 0;
    const type = () => {
      if (!alive) return;
      i += 1;
      setTyped(query.slice(0, i));
      if (i < query.length) {
        timer = setTimeout(type, 42 + Math.random() * 46);
        return;
      }
      timer = setTimeout(() => {
        if (!alive) return;
        setPhase('scanning');
        timer = setTimeout(() => {
          if (!alive) return;
          setPhase('results');
          timer = setTimeout(() => {
            if (!alive) return;
            setQueryIndex(prev => (prev + 1) % DEMO_QUERIES.length);
          }, 5200);
        }, 1700);
      }, 420);
    };

    timer = setTimeout(type, 350);

    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [queryIndex, reduce]);

  const scanning = phase === 'scanning';
  const showRows = phase === 'results';

  return (
    <motion.div
      className="lp-console"
      initial={reduce ? false : { opacity: 0, y: 26, rotateX: 6 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.85, delay: 0.15, ease: EASE }}
      style={{ perspective: 1200 }}
    >
      <div className="lp-console-top">
        <div className="lp-dots"><span /><span /><span /></div>
        <span className="lp-console-title">Live harvest</span>
        <span className="lp-console-live"><i />{scanning ? 'Scanning' : showRows ? 'Ready' : 'Idle'}</span>
      </div>

      <div className="lp-console-body">
        <div className="lp-searchbar">
          <Search size={15} />
          <div className="lp-searchbar-text">
            {typed}
            <span className="lp-caret" />
          </div>
        </div>

        <div className="lp-radar">
          <div className="lp-radar-sweep" />
          {RADAR_PINS.map((pin, index) => (
            <motion.span
              key={index}
              className="lp-pin-dot"
              style={{ left: pin.left, top: pin.top }}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{
                opacity: scanning || showRows ? 1 : 0,
                scale: scanning || showRows ? 1 : 0.4
              }}
              transition={{ duration: 0.4, delay: index * 0.16 }}
            />
          ))}
          <div className="lp-console-count">
            {scanning ? 'Sweeping 7 zones…' : showRows ? <>Found <b>42</b> businesses</> : 'Waiting for a search'}
          </div>
        </div>

        <div className="lp-demo-rows">
          <AnimatePresence mode="popLayout">
            {showRows &&
              DEMO_ROWS.map((row, index) => (
                <motion.div
                  key={`${queryIndex}-${row.phone}`}
                  className="lp-demo-row"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.11, ease: EASE }}
                >
                  <span className="lp-demo-avatar">{row.name.charAt(0)}</span>
                  <div className="lp-demo-main">
                    <b>{row.name}</b>
                    <span>{row.area}</span>
                  </div>
                  <span className="lp-demo-phone">{row.phone}</span>
                  <CheckCircle2 size={13} className="lp-demo-check" />
                </motion.div>
              ))}
          </AnimatePresence>
        </div>
      </div>

      <div className="lp-console-foot">
        <span>Mobile only · validated</span>
        <span><b>38 of 42</b> have a direct mobile</span>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Dashboard mock                                                      */
/* ------------------------------------------------------------------ */

const MAP_PINS = [
  { left: '22%', top: '26%' },
  { left: '46%', top: '18%' },
  { left: '64%', top: '38%' },
  { left: '34%', top: '52%' },
  { left: '58%', top: '66%' },
  { left: '76%', top: '58%' },
  { left: '44%', top: '78%' }
];

function DashboardMock() {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className="lp-window"
      initial={reduce ? false : { opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, ease: EASE }}
    >
      <div className="lp-window-bar">
        <div className="lp-dots"><span /><span /><span /></div>
        <span className="lp-window-url">scraper — workspace</span>
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
              initial={reduce ? false : { opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.07, ease: EASE }}
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
              animate={reduce ? {} : { opacity: [0.45, 1, 0.45] }}
              transition={{ duration: 2.6, repeat: Infinity, delay: index * 0.24 }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Section heading                                                     */
/* ------------------------------------------------------------------ */

function SectionHead({ tag, title, sub }) {
  return (
    <FadeUp className="lp-section-head">
      <span className="lp-tag">{tag}</span>
      <h2 className="lp-h2">{title}</h2>
      {sub ? <p className="lp-sub">{sub}</p> : null}
    </FadeUp>
  );
}

/* ------------------------------------------------------------------ */
/* FAQ                                                                 */
/* ------------------------------------------------------------------ */

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
            transition={{ duration: 0.26, ease: EASE }}
            style={{ overflow: 'hidden' }}
          >
            {item.a}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function LandingV2() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const go = useCallback(() => navigate('/command'), [navigate]);

  const jump = useCallback(id => {
    const node = document.getElementById(id);
    if (!node) return;
    node.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }, [reduce]);

  return (
    <div className="lp-root">
      <div className="lp-grid-bg" />
      <div className="lp-glow lp-glow-a" />
      <div className="lp-glow lp-glow-b" />
      <div className="lp-glow lp-glow-c" />

      {/* ---------------------------------------------------------- nav */}
      <header className="lp-nav" data-scrolled={scrolled}>
        <div className="lp-nav-inner">
          <a
            className="lp-brand"
            href="/"
            onClick={event => {
              event.preventDefault();
              window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
            }}
          >
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
          </a>

          <nav className="lp-nav-links">
            <button type="button" onClick={() => jump('why')}>Why us</button>
            <button type="button" onClick={() => jump('how')}>How it works</button>
            <button type="button" onClick={() => jump('dashboard')}>Dashboard</button>
            <button type="button" onClick={() => jump('pricing')}>Pricing</button>
            <button type="button" onClick={() => jump('faq')}>FAQ</button>
          </nav>

          <div className="lp-nav-actions">
            <button type="button" className="lp-btn lp-btn-ghost lp-btn-sm" onClick={() => jump('pricing')}>
              Pricing
            </button>
            <button type="button" className="lp-btn lp-btn-primary lp-btn-sm" onClick={go}>
              Open dashboard <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* -------------------------------------------------------- hero */}
        <section className="lp-hero">
          <div className="lp-container lp-hero-grid">
            <div className="lp-hero-copy">
              <motion.span
                className="lp-eyebrow"
                initial={reduce ? false : { opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: EASE }}
              >
                <i /> Made in India · for Indian businesses
              </motion.span>

              <motion.h1
                className="lp-h1"
                initial={reduce ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.06, ease: EASE }}
              >
                Get the <span className="lp-hl">owner’s mobile number</span>, not the office landline.
              </motion.h1>

              <motion.p
                className="lp-lede"
                initial={reduce ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.14, ease: EASE }}
              >
                Type a business type and a city. In <b>under 90 seconds</b> you get a fresh list of
                real 10-digit mobile numbers with the full shop details — ready to send on WhatsApp.
                No old lists. No switchboard numbers. No duplicates.
              </motion.p>

              <motion.div
                className="lp-cta-row"
                initial={reduce ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.22, ease: EASE }}
              >
                <button type="button" className="lp-btn lp-btn-primary lp-btn-lg" onClick={go}>
                  Start free for 14 days <ArrowRight size={16} />
                </button>
                <button type="button" className="lp-btn lp-btn-ghost lp-btn-lg" onClick={() => jump('how')}>
                  <Play size={15} /> See how it works
                </button>
              </motion.div>

              <motion.ul
                className="lp-micro"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.32 }}
              >
                <li><Check size={13} /> No card needed</li>
                <li><Check size={13} /> Runs on your own laptop</li>
                <li><Check size={13} /> Ready in about 40 seconds</li>
              </motion.ul>
            </div>

            <DemoConsole />
          </div>

          <div className="lp-container">
            <Stagger className="lp-stats" delay={0.1}>
              <StaggerItem className="lp-stat">
                <b><Counter to={52} suffix="" /> fields</b>
                <span>Owner, address, category, rating, hours, socials and more — for every business.</span>
              </StaggerItem>
              <StaggerItem className="lp-stat">
                <b><Counter to={90} prefix="<" suffix=" sec" /></b>
                <span>From typing the query to a working list of mobile numbers.</span>
              </StaggerItem>
              <StaggerItem className="lp-stat">
                <b>4 levels</b>
                <span>State → District → Mandal → Village. No messy city text.</span>
              </StaggerItem>
              <StaggerItem className="lp-stat">
                <b><Counter to={100} suffix="%" /> mobiles</b>
                <span>Every number is a validated Indian 10-digit mobile. Nothing else gets through.</span>
              </StaggerItem>
            </Stagger>

            <div className="lp-marquee">
              <div className="lp-marquee-track">
                {[...CATEGORIES, ...CATEGORIES].map((cat, index) => (
                  <span className="lp-chip" key={`${cat}-${index}`}>{cat}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* --------------------------------------------------------- why */}
        <section className="lp-section" id="why">
          <div className="lp-container">
            <SectionHead
              tag="Why startups need this"
              title="One wrong number is one lost day."
              sub="Old lead databases were built for a world of landlines and call centres. Indian businesses run on a proprietor’s mobile and a WhatsApp message. That is the whole reason this product exists."
            />

            <Stagger className="lp-cards-3">
              <StaggerItem className="lp-card">
                <span className="lp-card-icon"><Clock3 size={19} /></span>
                <h3>Zero stale data</h3>
                <p>
                  Every search is a <b>live search</b>. Nothing is pulled from a six-month-old dump.
                  If a shop has closed or changed hands, it does not come back in your list.
                </p>
                <div className="lp-card-figure">
                  <b>Fresh</b>
                  <span>on every single search</span>
                </div>
              </StaggerItem>

              <StaggerItem className="lp-card">
                <span className="lp-card-icon"><Phone size={19} /></span>
                <h3>Direct proprietor mobiles</h3>
                <p>
                  Not the reception, not the switchboard, not “call between 11 and 4”. The number
                  that actually belongs to the person who can say yes — and usually has WhatsApp.
                </p>
                <div className="lp-card-figure">
                  <b>10 digits</b>
                  <span>validated, every time</span>
                </div>
              </StaggerItem>

              <StaggerItem className="lp-card">
                <span className="lp-card-icon"><TrendingUp size={19} /></span>
                <h3>Lower cost to acquire</h3>
                <p>
                  When more of your calls and messages reach a real decision-maker, you spend less
                  to win each customer. Same team, same budget, more closed deals.
                </p>
                <div className="lp-card-figure">
                  <b>14.5%</b>
                  <span>WhatsApp reply rate vs 1.8% cold calling</span>
                </div>
              </StaggerItem>
            </Stagger>
          </div>
        </section>

        {/* ----------------------------------------------------- compare */}
        <section className="lp-section" id="compare">
          <div className="lp-container">
            <SectionHead
              tag="The honest comparison"
              title="Old databases vs a live harvest"
              sub="This is the difference our customers feel in the first week. Every row below is something you can check yourself."
            />

            <FadeUp>
              <div className="lp-compare">
                <div className="lp-compare-head">
                  <div>What matters</div>
                  <div className="is-bad">Old scrapers &amp; databases</div>
                  <div className="is-good">Gomandap / LeadHarvest Pro</div>
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
                    <div className="lp-compare-cell is-bad">
                      <X size={13} /> <span>{row.bad}</span>
                    </div>
                    <div className="lp-compare-cell is-good">
                      <Check size={13} /> <span>{row.good}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </FadeUp>
          </div>
        </section>

        {/* --------------------------------------------------------- how */}
        <section className="lp-section" id="how">
          <div className="lp-container">
            <SectionHead
              tag="How it works"
              title="Three steps. No training needed."
              sub="If you can type a message on WhatsApp, you can run this. There is nothing to configure and no manual to read."
            />

            <Stagger className="lp-steps">
              {STEPS.map((step, index) => {
                const Icon = step.icon;
                return (
                  <StaggerItem className="lp-step" key={step.title}>
                    <span className="lp-step-num">0{index + 1}</span>
                    <span className="lp-step-icon"><Icon size={20} /></span>
                    <h3>{step.title}</h3>
                    <p>{step.body}</p>
                    <small>{step.detail}</small>
                  </StaggerItem>
                );
              })}
            </Stagger>
          </div>
        </section>

        {/* --------------------------------------------------- dashboard */}
        <section className="lp-section" id="dashboard">
          <div className="lp-container">
            <div className="lp-dash-grid">
              <div>
                <FadeUp>
                  <span className="lp-tag">Inside the dashboard</span>
                  <h2 className="lp-h2">One screen. Everything you need to sell.</h2>
                  <p className="lp-sub">
                    No tabs full of settings, no live log noise. Open it and start working.
                    Search on the left, work your leads on the right.
                  </p>
                </FadeUp>

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

        {/* --------------------------------------------------------- who */}
        <section className="lp-section" id="who">
          <div className="lp-container">
            <SectionHead
              tag="Who uses it"
              title="Built for the teams that live on outreach"
              sub="Same product, three very different jobs."
            />

            <Stagger className="lp-audience">
              {AUDIENCES.map(item => {
                const Icon = item.icon;
                return (
                  <StaggerItem className="lp-card" key={item.title}>
                    <h3><Icon size={17} /> {item.title}</h3>
                    <p>{item.body}</p>
                    <div className="lp-quote">{item.quote}</div>
                  </StaggerItem>
                );
              })}
            </Stagger>
          </div>
        </section>

        {/* ----------------------------------------------------- pricing */}
        <section className="lp-section" id="pricing">
          <div className="lp-container">
            <SectionHead
              tag="Pricing"
              title="Simple monthly price. Cancel anytime."
              sub="Every plan includes the full engine, the map, saved folders and exports. You are only choosing how many leads you can pull at once."
            />

            <Stagger className="lp-pricing">
              {PLANS.map(plan => (
                <StaggerItem key={plan.id} className={`lp-plan${plan.featured ? ' is-featured' : ''}`}>
                  {plan.featured ? (
                    <span className="lp-plan-badge"><Sparkles size={10} /> Most popular</span>
                  ) : null}
                  <div className="lp-plan-name">{plan.name}</div>
                  <div className="lp-plan-price">
                    <b>{plan.price}</b>
                    <span>{plan.period}</span>
                  </div>
                  <div className="lp-plan-note">{plan.line}</div>

                  <ul className="lp-plan-features">
                    <li><Check size={13} /> {plan.leads}</li>
                    <li><Check size={13} /> {plan.seats}</li>
                    {plan.features.map(feature => (
                      <li key={feature}><Check size={13} /> {feature}</li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    className={`lp-btn ${plan.featured ? 'lp-btn-primary' : 'lp-btn-ghost'}`}
                    onClick={go}
                  >
                    {plan.featured ? 'Start free trial' : 'Choose ' + plan.name}
                  </button>
                </StaggerItem>
              ))}
            </Stagger>

            <FadeUp>
              <div className="lp-cost-note">
                <p>
                  <b>Look at the cost per lead.</b> Starter works out to about ₹4 per lead, Pro to
                  about ₹2, and Agency to under ₹1 — for a number you can actually call. One closed
                  deal covers the month.
                </p>
                <button type="button" className="lp-btn lp-btn-ghost lp-btn-sm" onClick={go}>
                  Start free for 14 days <ArrowRight size={13} />
                </button>
              </div>
            </FadeUp>
          </div>
        </section>

        {/* --------------------------------------------------------- faq */}
        <section className="lp-section" id="faq">
          <div className="lp-container">
            <SectionHead
              tag="Questions"
              title="The things people ask before they start"
            />

            <FadeUp className="lp-faq">
              {FAQ.map((item, index) => (
                <FaqItem
                  key={item.q}
                  item={item}
                  isOpen={openFaq === index}
                  onToggle={() => setOpenFaq(openFaq === index ? -1 : index)}
                />
              ))}
            </FadeUp>
          </div>
        </section>

        {/* ------------------------------------------------------- final */}
        <section className="lp-final">
          <div className="lp-container lp-final-inner">
            <FadeUp>
              <span className="lp-tag" style={{ justifyContent: 'center' }}>Get started</span>
              <h2>Your next customer is already on WhatsApp.</h2>
              <p>
                Open the dashboard, type a category and a city, and see the first numbers in about
                a minute. Fourteen days free. Nothing to install beyond this app.
              </p>
              <div className="lp-cta-row">
                <button type="button" className="lp-btn lp-btn-primary lp-btn-lg" onClick={go}>
                  Open the dashboard <ArrowRight size={16} />
                </button>
                <button type="button" className="lp-btn lp-btn-ghost lp-btn-lg" onClick={() => jump('pricing')}>
                  See pricing
                </button>
              </div>
              <ul className="lp-micro">
                <li><Check size={13} /> No card needed</li>
                <li><Check size={13} /> Cancel anytime</li>
                <li><Check size={13} /> Your data stays with you</li>
              </ul>
            </FadeUp>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-container lp-footer-inner">
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
