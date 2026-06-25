const Fuse = require('fuse.js');

const CATEGORIES = [
  "Banquet Halls", "Kalyana Mandapams", "Open Lawns & Farmhouses", 
  "Resorts & Destination Venues", "5-Star Hotels", "Party & Mini Halls", 
  "Temples & Ashrams", "Wedding Photographers", "Candid Photographers", 
  "Pre-Wedding Shoots", "Cinematographers", "Drone Specialists", 
  "Instant Photo Booths", "Decorators", "Caterers", "Makeup Artists", 
  "Mehndi Designers", "Wedding Clothes / Boutiques", "Jewelry Shops", 
  "Wedding Cards & Invites", "Cars & Buses (Travel)", "Astrologers / Pundits", 
  "Honeymoon Packages", "Event Planners"
];

const fuse = new Fuse(CATEGORIES, { threshold: 0.4 });
console.log('Fuse results for "phtographers":');
console.log(fuse.search('phtographers').map(r => r.item));
