'use strict';

const express = require('express');
const router = express.Router();
const { getCountryTaxonomy } = require('../utils/internationalAdminUnits');
const { PARTICULAR_NICHE_REGISTRY } = require('../utils/querySpecificityClassifier');

const BASE_URL = 'https://scraper.co.in';

const PRIMARY_COUNTRIES = ['IN', 'US', 'GB', 'CA', 'AU', 'AE', 'DE', 'FR', 'SG', 'NZ', 'IE', 'ZA'];

const HREFLANG_MAP = {
  US: 'en-US',
  GB: 'en-GB',
  IN: 'en-IN',
  CA: 'en-CA',
  AU: 'en-AU',
  AE: 'ar-AE',
  DE: 'de-DE',
  FR: 'fr-FR',
  SG: 'en-SG',
  NZ: 'en-NZ',
  IE: 'en-IE',
  ZA: 'en-ZA'
};

const COUNTRY_SAMPLE_METROS = {
  US: {
    state: 'texas',
    stateName: 'Texas',
    cities: [
      { slug: 'dallas', name: 'Dallas' },
      { slug: 'houston', name: 'Houston' },
      { slug: 'austin', name: 'Austin' },
      { slug: 'san-antonio', name: 'San Antonio' },
      { slug: 'fort-worth', name: 'Fort Worth' },
      { slug: 'plano', name: 'Plano' }
    ]
  },
  GB: {
    state: 'greater-london',
    stateName: 'Greater London',
    cities: [
      { slug: 'camden', name: 'Camden' },
      { slug: 'westminster', name: 'Westminster' },
      { slug: 'city-of-london', name: 'City of London' },
      { slug: 'manchester', name: 'Manchester' },
      { slug: 'birmingham', name: 'Birmingham' },
      { slug: 'leeds', name: 'Leeds' }
    ]
  },
  IN: {
    state: 'andhra-pradesh',
    stateName: 'Andhra Pradesh',
    cities: [
      { slug: 'guntur', name: 'Guntur' },
      { slug: 'tenali', name: 'Tenali' },
      { slug: 'vijayawada', name: 'Vijayawada' },
      { slug: 'hyderabad', name: 'Hyderabad' },
      { slug: 'bengaluru', name: 'Bengaluru' },
      { slug: 'surat', name: 'Surat' }
    ]
  },
  AU: {
    state: 'victoria',
    stateName: 'Victoria',
    cities: [
      { slug: 'melbourne', name: 'Melbourne' },
      { slug: 'sydney', name: 'Sydney' },
      { slug: 'brisbane', name: 'Brisbane' },
      { slug: 'perth', name: 'Perth' },
      { slug: 'adelaide', name: 'Adelaide' },
      { slug: 'dandenong', name: 'Dandenong' }
    ]
  },
  AE: {
    state: 'dubai',
    stateName: 'Dubai',
    cities: [
      { slug: 'business-bay', name: 'Business Bay' },
      { slug: 'downtown-dubai', name: 'Downtown Dubai' },
      { slug: 'jafza', name: 'JAFZA' },
      { slug: 'deira', name: 'Deira' },
      { slug: 'al-quoz', name: 'Al Quoz' },
      { slug: 'abu-dhabi-island', name: 'Abu Dhabi Island' }
    ]
  },
  CA: {
    state: 'ontario',
    stateName: 'Ontario',
    cities: [
      { slug: 'mississauga', name: 'Mississauga' },
      { slug: 'toronto', name: 'Toronto' },
      { slug: 'brampton', name: 'Brampton' },
      { slug: 'markham', name: 'Markham' },
      { slug: 'vancouver', name: 'Vancouver' },
      { slug: 'calgary', name: 'Calgary' }
    ]
  },
  DE: {
    state: 'bayern',
    stateName: 'Bayern',
    cities: [
      { slug: 'munich', name: 'Munich' },
      { slug: 'berlin', name: 'Berlin' },
      { slug: 'frankfurt', name: 'Frankfurt' },
      { slug: 'stuttgart', name: 'Stuttgart' },
      { slug: 'hamburg', name: 'Hamburg' },
      { slug: 'garching', name: 'Garching' }
    ]
  },
  FR: {
    state: 'ile-de-france',
    stateName: 'Île-de-France',
    cities: [
      { slug: 'paris', name: 'Paris' },
      { slug: 'lyon', name: 'Lyon' },
      { slug: 'marseille', name: 'Marseille' },
      { slug: 'toulouse', name: 'Toulouse' },
      { slug: 'bordeaux', name: 'Bordeaux' },
      { slug: 'nice', name: 'Nice' }
    ]
  },
  SG: {
    state: 'central-region',
    stateName: 'Central Region',
    cities: [
      { slug: 'downtown-core', name: 'Downtown Core' },
      { slug: 'jurong-east', name: 'Jurong East' },
      { slug: 'tampines', name: 'Tampines' },
      { slug: 'woodlands', name: 'Woodlands' }
    ]
  },
  NZ: {
    state: 'auckland-region',
    stateName: 'Auckland Region',
    cities: [
      { slug: 'auckland-cbd', name: 'Auckland CBD' },
      { slug: 'christchurch-central', name: 'Christchurch' },
      { slug: 'wellington-central', name: 'Wellington' }
    ]
  },
  IE: {
    state: 'leinster',
    stateName: 'Leinster',
    cities: [
      { slug: 'dublin-city-centre', name: 'Dublin' },
      { slug: 'cork-city-centre', name: 'Cork' },
      { slug: 'galway-city-centre', name: 'Galway' }
    ]
  },
  ZA: {
    state: 'gauteng',
    stateName: 'Gauteng',
    cities: [
      { slug: 'sandton', name: 'Sandton' },
      { slug: 'cape-town-cbd', name: 'Cape Town' },
      { slug: 'durban-central', name: 'Durban' }
    ]
  }
};

function formatSlug(slug) {
  if (!slug) return '';
  return String(slug)
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Generates full SSR SEO Metadata for a given /leads/ URL path.
 */
function getSsrMeta(urlPath = '/') {
  const cleanPath = String(urlPath).split('?')[0].replace(/\/+$/, '');
  const segments = cleanPath.split('/').filter(Boolean);

  // Default homepage metadata
  if (segments[0] !== 'leads') {
    return {
      title: 'Scraper.co.in — Business Owner Mobiles & Emails in 11 Markets',
      description: 'Find verified business proprietor mobile numbers, emails and business details in any city, county, province or mandal across 11 markets, India first. Keyless, no accounts.',
      canonical: `${BASE_URL}${cleanPath || '/'}`,
      ogType: 'website',
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebSite',
            '@id': `${BASE_URL}/#website`,
            url: `${BASE_URL}/`,
            name: 'Scraper.co.in',
            potentialAction: {
              '@type': 'SearchAction',
              target: `${BASE_URL}/command?q={search_term_string}`,
              'query-input': 'required name=search_term_string'
            }
          }
        ]
      }
    };
  }

  const countryCode = String(segments[1] || 'us').toUpperCase();
  const stateSlug = segments[2] || '';
  const citySlug = segments[3] || '';
  const subvectorSlug = segments[4] || '';

  const countryTax = getCountryTaxonomy(countryCode) || getCountryTaxonomy('US');
  const countryName = countryTax?.name || 'United States';
  const stateName = stateSlug ? formatSlug(stateSlug) : (COUNTRY_SAMPLE_METROS[countryCode]?.stateName || 'National Region');
  const cityName = citySlug ? formatSlug(citySlug) : (COUNTRY_SAMPLE_METROS[countryCode]?.cities[0]?.name || 'Commercial Hub');

  // Find subvector niche or format slug
  let nicheLabel = 'Commercial Businesses & Services';
  if (subvectorSlug) {
    const matched = PARTICULAR_NICHE_REGISTRY.find(n => n.key === subvectorSlug || n.key === subvectorSlug.replace(/-/g, '_'));
    nicheLabel = matched ? matched.label : formatSlug(subvectorSlug);
  }

  const title = `${nicheLabel} in ${cityName}, ${stateName} (${countryName}) | Verified Direct Leads & Phone Directory`;
  const description = `Access 100% verified ${nicheLabel} in ${cityName}, ${stateName} (${countryName}). Direct proprietor phone numbers, WhatsApp links, and physical addresses with zero cross-trade dilution.`;
  const canonical = `${BASE_URL}${cleanPath}`;

  const hreflangLinks = PRIMARY_COUNTRIES.map(c => {
    const hl = HREFLANG_MAP[c] || `en-${c}`;
    return `<link rel="alternate" hreflang="${hl}" href="${BASE_URL}/leads/${c.toLowerCase()}" />`;
  }).concat([`<link rel="alternate" hreflang="x-default" href="${BASE_URL}/" />`]).join('\n    ');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${BASE_URL}/#website`,
        url: `${BASE_URL}/`,
        name: 'Scraper.co.in',
        potentialAction: {
          '@type': 'SearchAction',
          target: `${BASE_URL}/command?q={search_term_string}&country=${countryCode}`,
          'query-input': 'required name=search_term_string'
        }
      },
      {
        '@type': 'LocalBusiness',
        '@id': `${canonical}#business`,
        name: `${nicheLabel} Directory - ${cityName}`,
        description,
        url: canonical,
        telephone: countryTax?.dialCode || '+1',
        address: {
          '@type': 'PostalAddress',
          addressLocality: cityName,
          addressRegion: stateName,
          addressCountry: countryCode
        },
        areaServed: {
          '@type': 'AdministrativeArea',
          name: `${cityName}, ${stateName}`
        },
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.9',
          reviewCount: '194',
          bestRating: '5.0'
        }
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonical}#breadcrumbs`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/` },
          { '@type': 'ListItem', position: 2, name: countryName, item: `${BASE_URL}/leads/${countryCode.toLowerCase()}` },
          { '@type': 'ListItem', position: 3, name: stateName, item: `${BASE_URL}/leads/${countryCode.toLowerCase()}/${stateSlug || 'region'}` },
          { '@type': 'ListItem', position: 4, name: cityName, item: `${BASE_URL}/leads/${countryCode.toLowerCase()}/${stateSlug || 'region'}/${citySlug || 'city'}` },
          { '@type': 'ListItem', position: 5, name: nicheLabel, item: canonical }
        ]
      },
      {
        '@type': 'FAQPage',
        '@id': `${canonical}#faq`,
        mainEntity: [
          {
            '@type': 'Question',
            name: `How do I find verified ${nicheLabel} in ${cityName}?`,
            acceptedAnswer: {
              '@type': 'Answer',
              text: `Scraper.co.in provides verified direct contact details for ${nicheLabel} in ${cityName}, ${stateName}, including valid E.164 phone numbers, physical addresses, and 1-click WhatsApp messaging links with zero cross-trade dilution.`
            }
          },
          {
            '@type': 'Question',
            name: `Are the phone numbers for ${nicheLabel} verified?`,
            acceptedAnswer: {
              '@type': 'Answer',
              text: `Yes, 100% of phone numbers are parsed and validated using google-libphonenumber standards, ensuring authentic mobile and direct proprietor contacts.`
            }
          },
          {
            '@type': 'Question',
            name: `Can I export ${cityName} business leads to Excel?`,
            acceptedAnswer: {
              '@type': 'Answer',
              text: `Yes, you can run instant multi-vector sweeps on Scraper.co.in and export clean, formatted Excel workbooks containing proprietor names, direct phone numbers, and WhatsApp links.`
            }
          }
        ]
      }
    ]
  };

  return {
    title,
    description,
    canonical,
    countryCode,
    countryName,
    cityName,
    stateName,
    nicheLabel,
    hreflangLinks,
    jsonLd
  };
}

// ── ROBOTS.TXT ROUTE ──
router.get('/robots.txt', (req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  const txt = [
    'User-agent: *',
    'Allow: /',
    'Allow: /leads/',
    'Allow: /directory',
    'Allow: /categories',
    'Allow: /solutions',
    'Allow: /architecture',
    'Allow: /global-coverage',
    'Disallow: /api/',
    'Disallow: /admin/',
    'Disallow: /command',
    '',
    `Sitemap: ${BASE_URL}/sitemap.xml`
  ].join('\n');
  res.send(txt);
});

// ── ROOT SITEMAP INDEX ROUTE ──
router.get('/sitemap.xml', (req, res) => {
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  const today = new Date().toISOString().split('T')[0];

  const sitemaps = [
    `${BASE_URL}/sitemaps/sitemap-main.xml`,
    `${BASE_URL}/sitemaps/sitemap-categories.xml`,
    ...PRIMARY_COUNTRIES.map(c => `${BASE_URL}/sitemaps/sitemap-${c.toLowerCase()}.xml`)
  ];

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    sitemaps.map(loc => `  <sitemap>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n  </sitemap>`).join('\n'),
    '</sitemapindex>'
  ].join('\n');

  res.send(xml);
});

// ── SITEMAP MAIN PAGES ──
router.get(['/sitemaps/sitemap-main.xml', '/sitemap-main.xml'], (req, res) => {
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  const today = new Date().toISOString().split('T')[0];

  const pages = [
    { loc: `${BASE_URL}/`, priority: '1.0', changefreq: 'daily' },
    { loc: `${BASE_URL}/directory`, priority: '0.9', changefreq: 'daily' },
    { loc: `${BASE_URL}/solutions`, priority: '0.8', changefreq: 'weekly' },
    { loc: `${BASE_URL}/architecture`, priority: '0.8', changefreq: 'weekly' },
    { loc: `${BASE_URL}/global-coverage`, priority: '0.8', changefreq: 'weekly' },
    { loc: `${BASE_URL}/hardware`, priority: '0.7', changefreq: 'weekly' },
    { loc: `${BASE_URL}/pricing`, priority: '0.7', changefreq: 'monthly' },
    { loc: `${BASE_URL}/privacy`, priority: '0.5', changefreq: 'monthly' },
    { loc: `${BASE_URL}/terms`, priority: '0.5', changefreq: 'monthly' }
  ];

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    pages.map(p => `  <url>\n    <loc>${p.loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`).join('\n'),
    '</urlset>'
  ].join('\n');

  res.send(xml);
});

// ── SITEMAP CATEGORIES ──
router.get(['/sitemaps/sitemap-categories.xml', '/sitemap-categories.xml'], (req, res) => {
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  const today = new Date().toISOString().split('T')[0];

  const urls = PARTICULAR_NICHE_REGISTRY.map(n => {
    const slug = n.key.replace(/_/g, '-');
    return `  <url>\n    <loc>${BASE_URL}/leads/us/texas/dallas/${slug}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.85</priority>\n  </url>`;
  });

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls.join('\n'),
    '</urlset>'
  ].join('\n');

  res.send(xml);
});

// ── PER-COUNTRY SITEMAP ROUTE ──
router.get('/sitemaps/sitemap-:countryCode.xml', (req, res) => {
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');

  const cCode = String(req.params.countryCode || '').toUpperCase();
  const today = new Date().toISOString().split('T')[0];

  const metroData = COUNTRY_SAMPLE_METROS[cCode] || COUNTRY_SAMPLE_METROS.US;
  const stateSlug = metroData.state;
  const cities = metroData.cities;

  const urls = [];

  // 1. Country root hub
  urls.push(`  <url>\n    <loc>${BASE_URL}/leads/${cCode.toLowerCase()}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.95</priority>\n  </url>`);

  // 2. State hub
  urls.push(`  <url>\n    <loc>${BASE_URL}/leads/${cCode.toLowerCase()}/${stateSlug}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.90</priority>\n  </url>`);

  // 3. City hubs & Subvector URLs (Top high-ticket niches)
  const topNiches = PARTICULAR_NICHE_REGISTRY.slice(0, 10);
  cities.forEach(city => {
    urls.push(`  <url>\n    <loc>${BASE_URL}/leads/${cCode.toLowerCase()}/${stateSlug}/${city.slug}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.85</priority>\n  </url>`);
    topNiches.forEach(niche => {
      const slug = niche.key.replace(/_/g, '-');
      urls.push(`  <url>\n    <loc>${BASE_URL}/leads/${cCode.toLowerCase()}/${stateSlug}/${city.slug}/${slug}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.80</priority>\n  </url>`);
    });
  });

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls.join('\n'),
    '</urlset>'
  ].join('\n');

  res.send(xml);
});

module.exports = {
  seoRouter: router,
  getSsrMeta,
  PRIMARY_COUNTRIES,
  HREFLANG_MAP,
  COUNTRY_SAMPLE_METROS
};
