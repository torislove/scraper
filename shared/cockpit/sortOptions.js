/**
 * shared/cockpit/sortOptions.js
 * Pure constant options separated from FilterBar.jsx to preserve Vite React Fast Refresh.
 */

export const LEAD_SORT_OPTIONS = [
  ['newest', 'Newest first'],
  ['rating', 'Highest rating'],
  ['reviews', 'Most reviews'],
  ['quality', 'Most complete'],
  ['area', 'Area / Pincode'],
  ['name', 'Name A–Z']
];

export const LEAD_SOURCE_OPTIONS = [
  ['all', 'All engines'],
  ['google', 'Google Maps'],
  ['gmap-direct', 'Direct Maps RPC'],
  ['justdial', 'JustDial'],
  ['osm', 'OpenStreetMap'],
  ['web-discovery', 'Web Discovery'],
  ['social', 'Social'],
  ['yellowpages', 'YellowPages']
];
