/**
 * WhatsApp Product Catalog & Lead Capture Utilities
 * Supports:
 * - Product & Service Catalog items with pricing, photos & links
 * - Variable formatting for WhatsApp outreach templates
 * - Image-to-OS-Clipboard copying for 1-click Ctrl+V pasting into WhatsApp Web
 * - vCard 3.0 (.vcf) mobile phonebook contact generation
 */

export const DEFAULT_PRODUCTS = [
  {
    id: 'album_premium',
    title: '12x36 Velvet Matte Wedding Album',
    price: '₹3,500',
    description: 'Ultra HD non-tearable velvet matte photobook with luxury metallic briefcase & UV embossing.',
    link: 'https://scraper.co.in/catalog/wedding-albums',
    image: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80',
    category: 'Printing & Digital Press'
  },
  {
    id: 'b2b_wholesale',
    title: 'Commercial Wholesale Dealership & Supply',
    price: 'Tier-1 B2B Rates',
    description: 'Direct manufacturer supply with 30-day credit terms, GST billing, and guaranteed doorstep freight.',
    link: 'https://scraper.co.in/catalog/wholesale-rates',
    image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=80',
    category: 'Wholesale & Distribution'
  },
  {
    id: 'web_audit',
    title: 'Business Website & Google Maps Growth Package',
    price: '₹14,999',
    description: 'Ultra-fast mobile website, Google Maps local SEO ranking & 1-click WhatsApp lead capture widget.',
    link: 'https://scraper.co.in/services/digital-growth',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop&q=80',
    category: 'Agencies & Software'
  },
  {
    id: 'service_quote',
    title: 'Standard Commercial Service AMC Package',
    price: 'Custom Quote',
    description: 'Licensed certified technicians with same-day emergency dispatch, genuine parts & 6-month warranty.',
    link: 'https://scraper.co.in/services/commercial',
    image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80',
    category: 'Local Services'
  }
];

export const CATALOG_TEMPLATES = {
  product: 'Hi {name}, we supply premium *{productTitle}* in {city}. Special pricing: *{productPrice}*. {productHighlights} Check our catalog: {productLink}',
  b2b: 'Hello {name}, we are looking for reliable {category} partners in {area}. Are you open to wholesale contracts for *{productTitle}*? Review our commercial rates: {productLink}',
  highticket: 'Hi {name}, congratulations on your {rating}★ rating in {city}! We noticed your strong reputation and wanted to share our *{productTitle}* portfolio: {productLink}',
  audit: 'Hi {name}, I noticed your {category} presence in {city}. {vendorSiteAudit} We can help you scale bookings with *{productTitle}*. Take a look: {websiteUrl}',
  collab: 'Hi {name}, I noticed your {category} services in {city} and wanted to inquire about your availability for upcoming requirements.'
};

/**
 * Formats a message template with lead and product information.
 */
export function formatProductMessage(template, lead = {}, product = null, websiteLink = '') {
  if (!template) return '';
  const leadName = lead.name || 'Business Owner';
  const city = lead.city || lead.village || 'your city';
  const area = lead.area || lead.city || 'your area';
  const category = lead.category || 'Services';
  const rating = lead.rating ? Number(lead.rating).toFixed(1) : 'top';
  const reviews = lead.reviewsCount ? String(lead.reviewsCount) : 'verified';
  
  const pTitle = product?.title || 'our product catalog';
  const pPrice = product?.price || 'Best Market Rate';
  const pDesc = product?.description || '';
  const pLink = product?.link || websiteLink || '';
  const destinationUrl = websiteLink || product?.link || '';

  const vendorSiteAudit = lead.website
    ? `I checked your website (${lead.website}) and have recommendations.`
    : `I noticed you don't have an active website yet, missing out on local Google searches.`;

  return template
    .replace(/\{name\}/g, leadName)
    .replace(/\{city\}/g, city)
    .replace(/\{area\}/g, area)
    .replace(/\{category\}/g, category)
    .replace(/\{rating\}/g, rating)
    .replace(/\{reviews\}/g, reviews)
    .replace(/\{productTitle\}/g, pTitle)
    .replace(/\{productPrice\}/g, pPrice)
    .replace(/\{productHighlights\}/g, pDesc ? `(${pDesc})` : '')
    .replace(/\{productLink\}/g, pLink)
    .replace(/\{websiteUrl\}/g, destinationUrl)
    .replace(/\{vendorWebsite\}/g, lead.website || 'your business profile')
    .replace(/\{vendorSiteAudit\}/g, vendorSiteAudit);
}

/**
 * Silently copies an image to the user's OS clipboard via Canvas blob.
 * This allows the user to simply press Ctrl+V in WhatsApp Web to paste the image.
 */
export async function copyImageToClipboard(imageUrl) {
  if (!imageUrl || typeof window === 'undefined' || !navigator.clipboard?.write) {
    return false;
  }
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    await new Promise((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = e => reject(e);
      img.src = imageUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) return false;

    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob })
    ]);
    return true;
  } catch (err) {
    console.warn('[Clipboard Bridge] Could not write image directly to clipboard:', err.message);
    return false;
  }
}

/**
 * Generates and triggers download of a clean vCard 3.0 (.vcf) file for mobile phonebook import.
 */
export function exportLeadsToVcf(leads, filename = 'leads_contacts.vcf') {
  const valid = (Array.isArray(leads) ? leads : []).filter(l => Boolean(l.phone || l.whatsapp));
  if (!valid.length) return false;

  let vcfText = '';
  valid.forEach(lead => {
    const phone = String(lead.phone || lead.whatsapp || '').replace(/\D/g, '').slice(-10);
    if (!phone) return;
    const name = (lead.name || 'Lead Contact').replace(/[;,]/g, ' ');
    const org = (lead.category ? `${lead.name} (${lead.category})` : lead.name).replace(/[;,]/g, ' ');
    const city = lead.city || lead.village || 'India';
    const area = lead.area || '';
    const website = lead.website || '';
    const rating = lead.rating ? `Rating: ${lead.rating}★` : '';

    vcfText += 'BEGIN:VCARD\r\n';
    vcfText += 'VERSION:3.0\r\n';
    vcfText += `FN:${name}\r\n`;
    vcfText += `ORG:${org}\r\n`;
    vcfText += `TEL;TYPE=CELL,VOICE:+91${phone}\r\n`;
    if (area || city) {
      vcfText += `ADR;TYPE=WORK:;;${area};${city};;;India\r\n`;
    }
    if (website) {
      vcfText += `URL:${website}\r\n`;
    }
    vcfText += `NOTE:LeadHarvest Pro - ${rating} ${lead.address || ''}\r\n`;
    vcfText += 'END:VCARD\r\n';
  });

  const blob = new Blob([vcfText], { type: 'text/vcard;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

