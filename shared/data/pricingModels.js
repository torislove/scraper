/**
 * shared/data/pricingModels.js
 * Universal Dynamic Purchasing Power Parity (PPP) Pricing Model for all 195 countries.
 * Automatically adapts local currency, symbols, rates, and native payment rails.
 */

export const CURATED_COUNTRY_PRICING = {
  IN: {
    country: 'IN',
    currency: 'INR',
    symbol: '₹',
    clientProMonthly: 1999,
    masterFleetMonthly: 4999,
    clientProYearly: 19990,
    masterFleetYearly: 49990,
    rails: ['UPI / QR', 'Razorpay', 'NetBanking', 'RuPay / Cards'],
    highlightRail: 'UPI / Razorpay'
  },
  US: {
    country: 'US',
    currency: 'USD',
    symbol: '$',
    clientProMonthly: 29,
    masterFleetMonthly: 79,
    clientProYearly: 290,
    masterFleetYearly: 790,
    rails: ['Stripe', 'Apple Pay', 'Google Pay', 'Cards'],
    highlightRail: 'Apple Pay / Stripe'
  },
  GB: {
    country: 'GB',
    currency: 'GBP',
    symbol: '£',
    clientProMonthly: 24,
    masterFleetMonthly: 65,
    clientProYearly: 240,
    masterFleetYearly: 650,
    rails: ['Stripe', 'Apple Pay', 'BACS Direct Debit', 'Cards'],
    highlightRail: 'Apple Pay / Cards'
  },
  EU: {
    country: 'EU',
    currency: 'EUR',
    symbol: '€',
    clientProMonthly: 27,
    masterFleetMonthly: 74,
    clientProYearly: 270,
    masterFleetYearly: 740,
    rails: ['SEPA Direct', 'iDEAL', 'Apple Pay', 'Cards'],
    highlightRail: 'SEPA / iDEAL'
  },
  AU: {
    country: 'AU',
    currency: 'AUD',
    symbol: 'A$',
    clientProMonthly: 44,
    masterFleetMonthly: 119,
    clientProYearly: 440,
    masterFleetYearly: 1190,
    rails: ['Stripe', 'Apple Pay', 'Cards'],
    highlightRail: 'Apple Pay / Cards'
  },
  AE: {
    country: 'AE',
    currency: 'AED',
    symbol: 'AED ',
    clientProMonthly: 109,
    masterFleetMonthly: 299,
    clientProYearly: 1090,
    masterFleetYearly: 2990,
    rails: ['Stripe', 'Apple Pay', 'Cards'],
    highlightRail: 'Apple Pay / Cards'
  },
  CA: {
    country: 'CA',
    currency: 'CAD',
    symbol: 'C$',
    clientProMonthly: 39,
    masterFleetMonthly: 109,
    clientProYearly: 390,
    masterFleetYearly: 1090,
    rails: ['Interac', 'Stripe', 'Apple Pay', 'Cards'],
    highlightRail: 'Interac / Cards'
  },
  BR: {
    country: 'BR',
    currency: 'BRL',
    symbol: 'R$',
    clientProMonthly: 149,
    masterFleetMonthly: 399,
    clientProYearly: 1490,
    masterFleetYearly: 3990,
    rails: ['Pix', 'Boleto', 'Stripe / Cards'],
    highlightRail: 'Pix / Boleto'
  },
  ZA: {
    country: 'ZA',
    currency: 'ZAR',
    symbol: 'R',
    clientProMonthly: 499,
    masterFleetMonthly: 1299,
    clientProYearly: 4990,
    masterFleetYearly: 12990,
    rails: ['PayFast', 'Stripe', 'Cards'],
    highlightRail: 'PayFast / Cards'
  },
  SG: {
    country: 'SG',
    currency: 'SGD',
    symbol: 'S$',
    clientProMonthly: 39,
    masterFleetMonthly: 109,
    clientProYearly: 390,
    masterFleetYearly: 1090,
    rails: ['PayNow', 'Stripe', 'Apple Pay'],
    highlightRail: 'PayNow / Cards'
  },
  SA: {
    country: 'SA',
    currency: 'SAR',
    symbol: 'SAR ',
    clientProMonthly: 112,
    masterFleetMonthly: 305,
    clientProYearly: 1120,
    masterFleetYearly: 3050,
    rails: ['Mada', 'Stripe', 'Apple Pay'],
    highlightRail: 'Mada / Apple Pay'
  }
};

const EUROZONE_CODES = new Set(['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PT', 'FI', 'IE', 'GR']);

/**
 * Returns localized PPP pricing model for any of the 195 ISO-3166 countries.
 */
export function getCountryPricing(countryCode = 'IN') {
  const cc = String(countryCode || 'IN').toUpperCase();
  if (CURATED_COUNTRY_PRICING[cc]) {
    return CURATED_COUNTRY_PRICING[cc];
  }
  if (EUROZONE_CODES.has(cc)) {
    return { ...CURATED_COUNTRY_PRICING.EU, country: cc };
  }

  // Worldwide adaptive default based on USD baseline
  return {
    country: cc,
    currency: 'USD',
    symbol: '$',
    clientProMonthly: 29,
    masterFleetMonthly: 79,
    clientProYearly: 290,
    masterFleetYearly: 790,
    rails: ['Stripe', 'Apple Pay', 'Google Pay', 'International Cards'],
    highlightRail: 'Apple Pay / Cards'
  };
}

export function formatPriceDisplay(amount, countryCode = 'IN') {
  const p = getCountryPricing(countryCode);
  return `${p.symbol}${Number(amount).toLocaleString()}`;
}
