/**
 * Build-time configuration for the desktop edition.
 *
 * PUBLIC_KEY is safe to ship - it can only verify tokens, never mint them.
 * The matching private key lives on your license server (never in the app).
 * See desktop/license-server/README.md.
 */

module.exports = {
  // Set SCRAPER_LICENSE_API at build time to enable online activation.
  // Leave empty for a fully offline (file-licensed) build.
  API_URL: process.env.SCRAPER_LICENSE_API || '',

  PUBLIC_KEY: [
    '-----BEGIN PUBLIC KEY-----',
    'MCowBQYDK2VwAyEAgpp3MVG/i41Va3Iqe2M8ulFo+/CWUv9l2bZ9W5Jjv4o=',
    '-----END PUBLIC KEY-----'
  ].join('\n'),

  TRIAL_DAYS: Number(process.env.SCRAPER_TRIAL_DAYS || 14),
  GRACE_DAYS: Number(process.env.SCRAPER_GRACE_DAYS || 7),

  CHECKOUT_URL: process.env.SCRAPER_CHECKOUT_URL || 'https://scraper.co.in/pricing',
  SUPPORT_URL: 'mailto:support@scraper.co.in',

  PLANS: [
    {
      id: 'starter',
      name: 'Starter',
      price: '₹1,999',
      period: '/month',
      maxLeads: 500,
      blurb: 'Solo agents and single-city searches'
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '₹3,999',
      period: '/month',
      maxLeads: 2000,
      blurb: 'Agencies running daily category sweeps'
    },
    {
      id: 'agency',
      name: 'Agency',
      price: '₹7,999',
      period: '/month',
      maxLeads: 10000,
      blurb: 'Multi-city teams with CRM and exports'
    }
  ]
};
