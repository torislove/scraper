'use strict';

/**
 * server/src/services/paymentConfig.js
 * 5-Country Active Market & Frictionless Payment Gateway Matrix.
 * Pricing tiers are configured separately; this exposes the active gateway rails per country.
 */

const ACTIVE_MARKETS = ['IN', 'US', 'GB', 'AU', 'AE'];

const PAYMENT_PROVIDERS_BY_COUNTRY = {
  IN: {
    country: 'IN',
    name: 'India',
    role: 'Primary Market',
    currency: 'INR',
    symbol: '₹',
    primaryGateway: 'razorpay',
    fallbackGateway: 'stripe',
    methods: ['UPI (GPay / PhonePe / Paytm)', 'UPI QR Instant', 'NetBanking', 'RuPay / Visa / Mastercard'],
    taxSupport: 'GST Invoice Ready',
    note: 'Instant INR settlement via Razorpay UPI & Indian bank cards.'
  },
  US: {
    country: 'US',
    name: 'United States',
    role: 'High-ARPU Revenue Market',
    currency: 'USD',
    symbol: '$',
    primaryGateway: 'stripe',
    fallbackGateway: null,
    methods: ['Visa / Mastercard / Amex', 'Apple Pay', 'Google Pay', 'Stripe Link', 'ACH Direct Debit'],
    taxSupport: 'US Tax / EIN Receipt',
    note: '1-click USD checkout via Stripe Cards, Apple Pay & Link.'
  },
  GB: {
    country: 'GB',
    name: 'United Kingdom',
    role: 'High-ARPU Revenue Market',
    currency: 'GBP',
    symbol: '£',
    primaryGateway: 'stripe',
    fallbackGateway: null,
    methods: ['Visa / Mastercard / Amex', 'Apple Pay', 'Google Pay', 'Faster Payments'],
    taxSupport: 'UK VAT Receipt Ready',
    note: 'Native GBP checkout via Stripe with Apple Pay & UK cards.'
  },
  AU: {
    country: 'AU',
    name: 'Australia',
    role: 'High-ARPU Revenue Market',
    currency: 'AUD',
    symbol: 'A$',
    primaryGateway: 'stripe',
    fallbackGateway: null,
    methods: ['Visa / Mastercard / Amex', 'Apple Pay', 'Google Pay', 'Stripe Link'],
    taxSupport: 'AUD GST Receipt Ready',
    note: 'Native AUD checkout via Stripe with instant Apple/Google Pay.'
  },
  AE: {
    country: 'AE',
    name: 'United Arab Emirates',
    role: 'High-Ticket B2B Market',
    currency: 'AED',
    symbol: 'AED',
    primaryGateway: 'stripe',
    fallbackGateway: 'razorpay',
    methods: ['Visa / Mastercard', 'Apple Pay', 'Google Pay', 'International Corporate Cards'],
    taxSupport: 'UAE TRN / VAT Invoice Ready',
    note: 'AED & USD checkout via Stripe UAE with Razorpay International backup.'
  }
};

function getPaymentProviderForCountry(countryCode = 'IN') {
  const cc = String(countryCode || 'IN').toUpperCase();
  return PAYMENT_PROVIDERS_BY_COUNTRY[cc] || PAYMENT_PROVIDERS_BY_COUNTRY.IN;
}

module.exports = {
  ACTIVE_MARKETS,
  PAYMENT_PROVIDERS_BY_COUNTRY,
  getPaymentProviderForCountry
};
