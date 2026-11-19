import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Check, Globe2, Layers, LogIn, Mail, MapPin,
  Phone, Plus, ShieldCheck, Zap
} from 'lucide-react';
import BrandLogo from './components/BrandLogo';
import Country3DFlag from './components/Country3DFlag';
import { POPULAR_COUNTRIES } from './data/countries';
import { pingHealth } from './api';
import './landingWhite.css';
import './landingRetro.css';

/**
 * The landing page.
 *
 * One job: explain the product in plain English and open the Command Center.
 * There is no hero search bar — a search box that does not search is worse than
 * no search box. Country choice happens in the Command Center, where the engine
 * can actually run.
 *
 * The eleven markets we support are listed. India is first and marked Home.
 * The featured revenue markets are shown next, then the rest alphabetically.
 */

// India plus the ten featured revenue markets. This is the whole product list.
// Order matters: it is the order the country grid uses.
const FEATURED_CODES = ['IN', 'US', 'GB', 'CA', 'AU', 'AE', 'SG', 'NZ', 'IE', 'ZA', 'DE'];
const MARKET_COUNT = FEATURED_CODES.length;

const HOW_IT_WORKS = [
  {
    title: 'Pick a country',
    body: 'India is Home. The other ten markets are one click away, each with its own local search sources.',
    icon: Globe2
  },
  {
    title: 'Type a town and a trade',
    body: 'For example: photographers in Troy, caterers in Slough, plumbers in Pune. Choose how wide to search — city, district or state.',
    icon: MapPin
  },
  {
    title: 'Get a clean list',
    body: 'Business name, phone number, website and address, collected in one folder. Call, message or export to Excel whenever you are ready.',
    icon: Phone
  }
];

const PROOF = [
  { value: '11', label: 'markets searchable' },
  { value: '619,287', label: 'Indian villages indexed' },
  { value: '24', label: 'live search engines' },
  { value: '0', label: 'API keys needed' }
];

const FAQ = [
  {
    q: 'Do I need an API key or a paid account?',
    a: 'No. Every source is public and keyless. There are no Google Cloud credits, no developer accounts and no monthly scraper subscription.'
  },
  {
    q: 'Which countries can I search?',
    a: 'Eleven markets are listed on this page. India is our Home market and is indexed down to the village level. The other ten have their own local directories and phone rules.'
  },
  {
    q: 'What do I actually get for each business?',
    a: 'The business name, its phone number when it is public, its website, and its address. When the website lists an email, that is collected too. Every row says which source it came from.'
  },
  {
    q: 'How do you keep results inside the area I chose?',
    a: 'Every lead is checked against the town, district or state you picked. Anything outside that area is moved to a separate Out of Bounds list instead of being mixed into your results.'
  },
  {
    q: 'Can I export the leads?',
    a: 'Yes. Any folder can be exported to Excel or CSV in one click, with clickable phone and WhatsApp links.'
  }
];

export default function LandingV2() {
  const navigate = useNavigate();
  const [online, setOnline] = useState(true);
  const [countryFilter, setCountryFilter] = useState('');

  useEffect(() => {
    let cancelled = false;
    let timer = null;
    let attempt = 0;

    // The landing is often opened while a sweep is saturating the machine. One
    // short ping used to paint "Offline" and never recover. Retry quickly at
    // first, then settle into a slow keep-alive poll, so the pill heals itself
    // as soon as the backend answers.
    const check = async () => {
      const ok = await pingHealth();
      if (cancelled) return;
      setOnline(Boolean(ok));
      attempt += 1;
      const delay = ok ? 20000 : Math.min(2000 * attempt, 15000);
      timer = setTimeout(check, delay);
    };
    check();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  const openCommand = (countryCode) => {
    const code = countryCode || 'IN';
    navigate(`/command?country=${encodeURIComponent(code)}`);
  };

  // Featured first (India at the very top), then every other country in
  // alphabetical order. This is the complete list, not a sample.
  const orderedCountries = useMemo(() => {
    const rank = code => {
      if (code === 'IN') return 0;
      const index = FEATURED_CODES.indexOf(code);
      return index === -1 ? 1000 : index;
    };
    return [...POPULAR_COUNTRIES].sort((a, b) => {
      const byRank = rank(a.code) - rank(b.code);
      if (byRank !== 0) return byRank;
      return a.name.localeCompare(b.name);
    });
  }, []);

  const visibleCountries = useMemo(() => {
    const value = countryFilter.trim().toLowerCase();
    if (!value) return orderedCountries;
    return orderedCountries.filter(country =>
      country.name.toLowerCase().includes(value) ||
      country.code.toLowerCase() === value
    );
  }, [countryFilter, orderedCountries]);

  return (
    <div className="gb-landing">
      {/* ── Header: the logo appears here, and only here ─────────────────── */}
      <header className="gb-nav">
        <div className="gb-wrap gb-nav-inner">
          <button type="button" className="gb-brand" onClick={() => openCommand()} aria-label="Open Command Center">
            <BrandLogo size={34} theme="light" />
          </button>

          <nav className="gb-nav-links" aria-label="Sections">
            <a href="#how">How it works</a>
            <a href="#countries">Countries</a>
            <a href="#faq">Questions</a>
          </nav>

          <div className="gb-nav-actions">
            <span className={`gb-online ${online ? '' : 'is-off'}`}>
              <span className="gb-online-dot" />
              {online ? 'Online' : 'Offline'}
            </span>
            <button
              type="button"
              className="gb-btn gb-btn-ghost gb-signin"
              onClick={() => navigate('/login')}
              title="Sign in to your workspace"
            >
              <LogIn size={14} />
              <span>Sign in</span>
            </button>
            <button type="button" className="gb-btn gb-btn-primary" onClick={() => openCommand()}>
              Open Command Center
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className="gb-hero">
          <div className="gb-wrap gb-hero-grid">
            <div>
              <span className="gb-hero-badge">
                <Zap size={12} />
                <b>India first</b> · 11 markets
              </span>

              <h1 className="gb-h1">
                Search all the leads
                <span>in your area.</span>
              </h1>

              <p className="gb-sub">
                Pick a country, type a town, and choose what you are looking for.
                We find the businesses, their phone numbers, websites and addresses,
                and put them in one clean list. No API keys. No monthly fees.
              </p>

              <div className="gb-hero-actions">
                <button type="button" className="gb-btn gb-btn-primary" onClick={() => openCommand()}>
                  Open Command Center
                  <ArrowRight size={16} />
                </button>
                <a href="#countries" className="gb-btn gb-btn-ghost">
                  See all 11 markets
                </a>
              </div>

              <p className="gb-hero-note">
                <Check size={12} /> Free · Keyless · Works in all 11 markets
              </p>
            </div>

            {/* A pure-CSS white Game Boy. The screen shows what a finished
                folder looks like: name, contact and town. */}
            <div className="gb-device" aria-hidden="true">
              <div className="gb-device-top">
                <span>Lead Radar</span>
                <span className="gb-device-led" />
              </div>

              <div className="gb-screen">
                <div className="gb-screen-head">
                  <span>Folder · Wedding Photographers</span>
                  <span>4 of 128</span>
                </div>
                <div className="gb-screen-row">
                  <i>📷</i>
                  <b>Shutter Studio</b>
                  <span>+91 98••• ••210</span>
                </div>
                <div className="gb-screen-row">
                  <i>🎪</i>
                  <b>Grand Palm Venue</b>
                  <span>+1 512 ••• 0134</span>
                </div>
                <div className="gb-screen-row">
                  <i>🍽</i>
                  <b>Oak &amp; Ember Catering</b>
                  <span>+44 20 ••• 8842</span>
                </div>
                <div className="gb-screen-row">
                  <i>💐</i>
                  <b>Bloom &amp; Co.</b>
                  <span>+61 2 ••• 7710</span>
                </div>
                <div className="gb-screen-foot">Ready to call · exported to Excel</div>
              </div>

              <div className="gb-device-controls">
                <div className="gb-dpad" />
                <div className="gb-ab">
                  <button type="button" aria-hidden="true" />
                  <button type="button" aria-hidden="true" />
                </div>
              </div>

              <div className="gb-speaker">
                <i /><i /><i /><i /><i /><i />
              </div>
            </div>
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────────────── */}
        <section className="gb-section gb-section-alt" id="how">
          <div className="gb-wrap">
            <div className="gb-sec-head">
              <span className="gb-kicker"><Layers size={13} /> How it works</span>
              <h2>Three steps. No setup.</h2>
              <p>You do not need to configure anything. Choose where to search, and the engine does the rest.</p>
            </div>

            <div className="gb-steps">
              {HOW_IT_WORKS.map((step, index) => {
                const Icon = step.icon;
                return (
                  <article className="gb-step" key={step.title}>
                    <span className="gb-step-num">{index + 1}</span>
                    <h3><Icon size={16} style={{ verticalAlign: '-3px', marginRight: 7 }} />{step.title}</h3>
                    <p>{step.body}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Every country ─────────────────────────────────────────────── */}
        <section className="gb-section" id="countries">
          <div className="gb-wrap">
            <div className="gb-sec-head">
              <span className="gb-kicker"><Globe2 size={13} /> Countries</span>
              <h2>Eleven markets, one list.</h2>
              <p>
                India is Home and is indexed down to the village level. Each of the other
                ten markets runs its own local directories plus the same keyless global
                sources.
              </p>
            </div>

            <div className="gb-market-toolbar">
              <input
                type="search"
                className="gb-country-filter"
                value={countryFilter}
                onChange={event => setCountryFilter(event.target.value)}
                placeholder="Find your market — India, United States, Germany…"
                aria-label="Find your country"
              />
              <span className="gb-market-count">
                {visibleCountries.length} of {MARKET_COUNT} markets
              </span>
            </div>

            <div className="gb-country-grid">
              {visibleCountries.map(country => {
                const isHome = country.code === 'IN';
                const isFeatured = FEATURED_CODES.includes(country.code);
                return (
                  <button
                    type="button"
                    key={country.code}
                    className={`gb-country${isHome ? ' is-home' : ''}`}
                    onClick={() => openCommand(country.code)}
                    title={`Search in ${country.name}`}
                  >
                    <span className="gb-country-flag">
                      <Country3DFlag code={country.code} size={22} isHome={isHome} />
                    </span>
                    <span className="gb-country-text">
                      <span className="gb-country-name">{country.name}</span>
                      <span className="gb-country-meta">
                        {isHome ? 'Home' : isFeatured ? 'Featured' : country.code}
                        {country.phone ? ` · ${country.phone}` : ''}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {!visibleCountries.length && (
              <p style={{ marginTop: 18, color: 'var(--gb-ink-muted)' }}>
                No country matches “{countryFilter}”. Try the country name or its two-letter code.
              </p>
            )}
          </div>
        </section>

        {/* ── Proof ────────────────────────────────────────────────────── */}
        <section className="gb-section gb-section-alt" id="coverage">
          <div className="gb-wrap">
            <div className="gb-sec-head">
              <span className="gb-kicker"><ShieldCheck size={13} /> Coverage</span>
              <h2>Built for real coverage, not a demo.</h2>
              <p>Every number below is measured from the running engine, not a marketing estimate.</p>
            </div>

            <div className="gb-stats">
              {PROOF.map(item => (
                <div className="gb-stat" key={item.label}>
                  <b>{item.value}</b>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Questions ────────────────────────────────────────────────── */}
        <section className="gb-section" id="faq">
          <div className="gb-wrap gb-faq">
            <div>
              <span className="gb-kicker"><Mail size={13} /> Questions</span>
              <h2 style={{ margin: '0 0 10px', fontSize: 'clamp(26px, 3.2vw, 38px)', lineHeight: 1.08, letterSpacing: '-0.02em' }}>
                Clear answers.
              </h2>
              <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.6, color: 'var(--gb-ink-soft)' }}>
                If something is still unclear, the Command Center shows the source and
                the area for every lead, so you can check it yourself.
              </p>
            </div>

            <div className="gb-faq-list">
              {FAQ.map((item, index) => (
                <details className="gb-faq-item" key={item.q} open={index === 0}>
                  <summary>
                    <span>{item.q}</span>
                    <Plus size={16} />
                  </summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── Final call to action ─────────────────────────────────────── */}
        <section className="gb-cta">
          <div className="gb-wrap">
            <div className="gb-cta-card">
              <div>
                <h2>Ready to search your area?</h2>
                <p>Open the Command Center, choose a country, and start with the town you know best.</p>
              </div>
              <button type="button" className="gb-btn gb-btn-primary" onClick={() => openCommand()}>
                Open Command Center
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="gb-footer">
        <div className="gb-wrap gb-footer-inner">
          <span className="gb-footer-copy">
            © {new Date().getFullYear()} Scraper.co.in · Keyless lead finder
          </span>
          <div className="gb-footer-links">
            <a href="#how">How it works</a>
            <a href="#countries">Countries</a>
            <a href="#faq">Questions</a>
            <button type="button" onClick={() => openCommand()}>Open Command Center →</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
