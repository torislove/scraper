# Vendor Field Matrix — Complete Profile Contract v1

**Purpose:** This is the field-by-field contract for "all vendor details." It is the checklist for the scraper, the merge rules, the database, and the vendor UI. If a field is listed here, the system must either populate it with a real value or mark it `unknown` with a reason. It must never invent a value.

**Companion document:** `docs/IMPLEMENTATION_PLAN.md` (architecture, schema, phases, acceptance metrics).

---

## 1. Core rules

1. **Every non-null field has provenance.** Value + source + source URL + extraction method + confidence + first seen + last seen.
2. **Unknown is a first-class state.** Null is allowed. The UI shows why: `Not published`, `Needs login`, `Blocked`, `Not checked`, or `Conflict`.
3. **No placeholder values in data.** Never store `N/A`, `Not available`, `Requires lookup`, `Call for number`, `0000000000`, `9999999999`, `ui-avatars.com`, or a generated rating.
4. **Arrays are deduplicated and normalized.** Phones use E.164, emails lowercase, URLs canonical, social handles without `@`, languages/canonical labels.
5. **Conflicts are visible.** Two different valid addresses/phones are both kept; the higher-confidence value is primary, the other is listed under `field_conflicts`.
6. **Deep extraction is resumable.** Each profile section has a node status (`pending`, `running`, `done`, `failed`, `skipped`) with an error reason.
7. **Source order matters.** Structured data on the vendor's own site beats a directory listing. A search snippet never becomes a phone number.

---

## 2. Confidence model

Confidence is a number from `0.00` to `1.00`. It is stored per field in `field_provenance.confidence` and summarized in `vendors.confidence_json`.

| Source / method | Default confidence | Notes |
|---|---:|---|
| Manual verification by the owner | 1.00 | Records user, method, timestamp |
| Derived from validated data (E.164, geohash, normalized name) | 1.00 | Deterministic |
| JSON-LD / schema.org on the vendor's own website | 0.95 | Highest automated source |
| Google Maps place page / place ID | 0.90 | Primary discovery source |
| Vendor website visible text | 0.85 | Contact/about/services pages |
| Google Maps "About" attributes | 0.85 | Amenities, payments, accessibility |
| Other paid/curated listing (JustDial, IndiaMART, WeddingBazaar) | 0.75 | Source claim, not independently verified |
| Public social profile | 0.70 | Bio/contact info is self-reported |
| Search result snippet | 0.40 | Discovery only; never used for phone/email |
| Inferred/guessed | 0.20 | Must be labeled "inferred" in the UI |

### Merge order

1. Manual verified value.
2. Structured data (`JSON-LD`, microdata) from the vendor's own domain.
3. Google Maps place page.
4. Vendor website visible text.
5. Other listing source (JustDial, IndiaMART, wedding verticals).
6. Social profile.
7. Search snippet.

**Rules**

- A higher-confidence non-null value is never overwritten by a lower-confidence one.
- Equal confidence: the newer `last_seen_at` wins for the primary value; the older value is kept in `field_conflicts` if it differs materially.
- Arrays are unioned, not replaced: all phones, emails, socials, services, images, and reviews are retained.
- A null/low-confidence value never erases a known value.
- If a source contradicts a known value, create a conflict row; do not silently choose.

---

## 3. Field matrix

Legend:

- **Store** = SQLite table/column or JSON path.
- **Source** = primary source and fallback.
- **Conf.** = default confidence before verification.
- **UI** = where it appears in the vendor profile.
- **Unknown** = what the UI says when the value is missing.

### 3.1 Identity

| Field | Store | Source & method | Conf. | UI | Unknown |
|---|---|---|---:|---|---|
| Business name | `vendors.name` | Google Maps `h1` / init state; website `<title>`/`og:site_name` | 0.90 | Overview header | Not published |
| Legal name | `vendors.legal_name` | Website about/footer, IndiaMART, GST record | 0.80 | Overview / Legal | Not published |
| Normalized name | `vendors.normalized_name` | Derived: lowercase, strip punctuation/SEO suffixes | 1.00 | Internal | — |
| Google Place ID | `vendors.google_place_id` | Place URL / init state | 1.00 | Sources (technical) | Not available |
| Google CID | `vendors.google_cid` | Place URL / init state | 0.95 | Sources (technical) | Not available |
| Branch of | `vendors.branch_of` | Google "located in", website locations page | 0.70 | Overview | Not published |
| Parent company | `vendors.parent_company` | Website about/legal, IndiaMART | 0.70 | Overview / Legal | Not published |
| Business status | `vendors.business_status` | Google Maps status | 0.95 | Overview badge | Unknown |
| Established year | `vendors.established_year` | Website about, JSON-LD `foundingDate`, IndiaMART | 0.75 | Overview | Not published |
| Owner name | `vendors.owner_name` | Website about/contact, JustDial, IndiaMART | 0.60 | Overview / Legal | Not published |
| Contact person | `vendors.contact_person` | Website contact page, JustDial, IndiaMART | 0.60 | Overview / Contacts | Not published |
| Employee count | `vendors.employee_count` | Website about, IndiaMART, LinkedIn | 0.50 | Overview | Not published |
| Description | `vendors.description` | Google "From the business", website about, JSON-LD `description` | 0.85 | Overview | Not published |
| Tagline | `vendors.tagline` | Website hero, social bio | 0.70 | Overview | Not published |
| Primary category | `vendors.primary_category` | Google Maps category | 0.95 | Overview / Filters | Unknown |
| Category path | `vendors.category_path_json` | Google category + website/IndiaMART taxonomy | 0.90 | Overview | Unknown |
| Specialties | `vendors.specialties_json` | Google About, website services | 0.80 | Overview / Offerings | Not published |
| Services | `vendors.services_json` | Google About, website services page, IndiaMART | 0.80 | Offerings | Not published |
| Products | `vendors.products_json` | Website products page, IndiaMART catalog | 0.80 | Offerings | Not published |
| Menu | `vendors.menu_json` | Website menu, Google menu link | 0.80 | Offerings | Not published |
| Catalog | `vendors.catalog_json` | IndiaMART catalog, website catalog PDF | 0.75 | Offerings / Media | Not published |
| Tags | `vendors.tags_json` | Derived from category/services/description | 0.60 | Overview / Filters | No tags |
| Price range | `vendors.price_range` | Google Maps price level, website pricing | 0.85 | Overview / Offerings | Not published |
| Packages | `vendors.packages_json` | Website packages/pricing page | 0.75 | Offerings | Not published |
| Offers | `vendors.offers_json` | Website offers, Google offer posts | 0.75 | Offerings | No current offers |
| Brands | `vendors.brands_json` | Website brands page, IndiaMART | 0.70 | Offerings | Not published |
| Affiliations | `vendors.affiliations_json` | Website about, industry bodies | 0.65 | Offerings / Legal | Not published |
| Certifications | `vendors.certifications_json` | Website about/certificates | 0.75 | Offerings / Legal | Not published |
| Awards | `vendors.awards_json` | Website about/awards | 0.70 | Offerings | Not published |
| Price list | `vendors.price_list_json` | Website price list PDF/page | 0.70 | Offerings / Media | Not published |
| Brochures | `vendors.brochures_json` | Website brochures/downloads | 0.70 | Media | Not published |
| FAQs | `vendors.faq_json` | Website FAQ, Google Q&A | 0.75 | Overview / Offerings | Not published |

### 3.2 Contacts

All contact points live in `contacts`; the vendor row keeps only the primary values for fast filtering.

| Field | Store | Source & method | Conf. | UI | Unknown |
|---|---|---|---:|---|---|
| Mobile numbers | `contacts.type='mobile'`, `contacts.normalized` (E.164) | Google phone button, website `tel:`, JustDial/IndiaMART reveal, JSON-LD `telephone` | 0.90 | Contacts (primary + all) | No mobile found |
| Landline numbers | `contacts.type='landline'` | Same sources | 0.90 | Contacts | No landline found |
| WhatsApp number | `contacts.type='whatsapp'` | Website WhatsApp link, Google chat, social bio | 0.50 claim / 1.00 verified | Contacts badge | Not confirmed |
| Email addresses | `contacts.type='email'` | Website `mailto:`, JSON-LD `email`, footer | 0.85 | Contacts | No email found |
| Email label | `contacts.label` | Context (owner, sales, support, booking) | 0.70 | Contacts | Unlabeled |
| Website | `vendors.website` | Google authority link, website canonical | 0.90 | Contacts / Overview | Not published |
| Booking URL | `vendors.booking_url` | Website book/appointment link, Google booking | 0.85 | Contacts / actions | No booking link |
| Contact page URL | `vendors.contact_url` | Website navigation/footer | 0.85 | Contacts / Sources | Not published |
| Contact form URL | `contacts.value` (type `contact_form`) or `vendor_sources.raw_json` | Website contact page | 0.75 | Contacts | Not published |
| Social profiles | `vendor_socials` | Website social links, Google social links, dork | 0.80 | Contacts / Social | Not published |
| Phone label | `contacts.label` | Context (primary, owner, sales, support, booking) | 0.70 | Contacts | Unlabeled |
| Contact verification | `contacts.verified`, `verification_method`, `verified_at` | Manual check, format validation, MX (email) | 1.00 verified | Contacts badge | Unverified |
| Raw `tel:`/`mailto:` values | `vendor_sources.raw_json` | Page DOM | 1.00 | Sources (raw) | — |

**Phone validation rules**

- Normalize to E.164 (`+91XXXXXXXXXX`).
- Accept Indian mobile numbers matching `+91[6-9]\d{9}`; classify as `mobile`.
- Accept valid Indian landlines with area code; classify as `landline`.
- Reject 6-digit pincodes, GSTIN fragments, order IDs, and 10-digit substrings of longer digit runs.
- Reject repeated-digit placeholders (`0000000000`, `9999999999`) and numbers with invalid prefixes.
- Deduplicate by national significant number, not raw string.
- Keep every valid number; mark the first valid mobile as primary.

### 3.3 Address and geography

| Field | Store | Source & method | Conf. | UI | Unknown |
|---|---|---|---:|---|---|
| Full address | `vendors.address_text` | Google Maps address block; website contact | 0.90 | Location | Not published |
| House / building | `vendors.address_json.house` | Google address components; website | 0.85 | Location | Not published |
| Street | `vendors.address_json.street` | Google address components | 0.85 | Location | Not published |
| Locality | `vendors.address_json.locality` | Google address components | 0.85 | Location | Not published |
| Landmark | `vendors.address_json.landmark` | Google/website address | 0.80 | Location | Not published |
| City / town | `vendors.city` | Google address components; local hierarchy | 0.90 | Location / Filters | Unknown |
| Mandal / tehsil | `vendors.mandal` | Local India hierarchy + address | 0.80 | Location / Folders | Unknown |
| District | `vendors.district` | Local India hierarchy + address | 0.90 | Location / Folders | Unknown |
| State | `vendors.state` | Local India hierarchy + address | 0.90 | Location / Filters | Unknown |
| PIN code | `vendors.pincode` | Google address components; website | 0.90 | Location | Not published |
| PIN validity | `vendors.pincode_valid` | Derived against 6-digit Indian PIN rules/local list | 1.00 | Location check | Unverified |
| Village | `vendors.village` | Local hierarchy; Google address | 0.70 | Location | Unknown |
| Country | `vendors.address_json.country` | Google/website; default India only when confirmed | 1.00 | Location | Unknown |
| Plus code | `vendors.plus_code` | Google Maps | 0.90 | Location | Not published |
| Service areas | `vendors.service_areas_json` | Google service area, website | 0.75 | Location / Offerings | Not published |
| Latitude | `vendors.latitude` | Google Maps coordinates | 0.95 | Map | Location unknown |
| Longitude | `vendors.longitude` | Google Maps coordinates | 0.95 | Map | Location unknown |
| Coordinate accuracy | `vendors.geo_accuracy_m` | Google/geocoder metadata | 0.90 | Location (technical) | Unknown |
| Coordinate source | `vendors.geo_source` | `google_maps`, `geocoder`, `manual` | 1.00 | Sources | — |
| Geohash | `vendors.geohash` | Derived from lat/lng | 1.00 | Internal / map clustering | — |
| Boundary membership | `vendors.boundaries_json` | Local India hierarchy (state/district/mandal/city ids) | 0.90 | Folders | Unknown |
| Map URL | `vendors.map_url` | Derived from place ID/coordinates | 1.00 | Location action | — |

**PIN code validation**

- Exactly 6 digits; first digit `1–9`; leading zero invalid.
- Validate against the local Indian PIN list when available.
- Only accept a PIN from an address component or address context, never from a bare 6-digit substring of a phone/order number.
- Store the source and validity, not just the number.

### 3.4 Hours and operations

| Field | Store | Source & method | Conf. | UI | Unknown |
|---|---|---|---:|---|---|
| Weekly hours | `vendors.hours_json.days` | Google Maps hours table; website/JSON-LD `OpeningHoursSpecification` | 0.90 | Hours | Not published |
| Open now | `vendors.hours_json.open_now` | Computed from hours + Asia/Kolkata; Google status | 0.90 | Hours badge | Unknown |
| Timezone | `vendors.hours_json.timezone` | Default `Asia/Kolkata`; source if provided | 1.00 | Hours | — |
| Holiday / special hours | `vendors.holiday_hours_json` | Google special hours; website notice | 0.80 | Hours | Not published |
| Popular times | `vendors.popular_times_json` | Google popular times | 0.85 | Hours chart | Not published |
| Temporarily closed notice | `vendors.business_status` + `hours_json.notice` | Google Maps | 0.95 | Overview / Hours | — |
| Payment methods | `vendors.payments_json` | Google About; website FAQ | 0.85 | Operations | Not published |
| Accessibility | `vendors.accessibility_json` | Google About | 0.85 | Operations | Not published |
| Amenities | `vendors.amenities_json` | Google About; website | 0.85 | Operations | Not published |
| Parking | `vendors.parking_json` | Google About | 0.85 | Operations | Not published |
| Service options | `vendors.service_options_json` | Google About; website | 0.85 | Operations | Not published |
| Languages spoken | `vendors.languages_json` | Google About; website | 0.85 | Operations | Not published |
| Service areas | `vendors.service_areas_json` | Website/Google service area | 0.75 | Operations / Location | Not published |
| Booking link | `vendors.booking_url` | Website booking/appointment link | 0.85 | Operations action | No booking link |

### 3.5 Reputation

| Field | Store | Source & method | Conf. | UI | Unknown |
|---|---|---|---:|---|---|
| Rating | `vendors.rating` | Google Maps rating | 0.95 | Overview / Reputation | No rating |
| Review count | `vendors.reviews_count` | Google Maps review count | 0.95 | Overview / Reputation | No reviews |
| Rating distribution | `vendors.rating_distribution_json` | Google reviews histogram | 0.90 | Reputation chart | Not published |
| Reviews | `reviews` + `vendors.reviews_json` snapshot | Google reviews tab; website testimonials | 0.90 | Reputation | No reviews found |
| Review author | `reviews.author` | Google review card | 0.90 | Reputation | Anonymous |
| Review rating | `reviews.rating` | Google review card | 0.90 | Reputation | — |
| Review text | `reviews.text` | Google review card; website testimonial | 0.90 | Reputation | No text |
| Review date | `reviews.published_at`, `relative_date` | Google review card | 0.90 | Reputation | Unknown date |
| Review source URL | `reviews.raw_json`, `vendor_sources.source_url` | Google/website | 0.90 | Sources | — |
| Owner response | `reviews.owner_response`, `owner_response_at` | Google review card | 0.90 | Reputation | No response |
| Review highlights | `vendors.review_meta_json.highlights` | Google review summary | 0.75 | Reputation | Not published |
| "From the business" | `vendors.review_meta_json.from_business` | Google Maps | 0.85 | Reputation / Overview | Not published |
| Recent review dates | `vendors.review_meta_json.recent_dates` | Derived from reviews | 0.90 | Reputation | Not published |
| External ratings | `vendor_sources.raw_json` | JustDial/IndiaMART ratings | 0.75 | Reputation (per source) | Not published |

**Review rules**

- Store at least 10 and up to 20 reviews per vendor in deep mode.
- Preserve the original text; do not paraphrase or summarize it as if it were the reviewer's words.
- Never fabricate a review, author, rating, or owner response.
- Review snippets must link to a source URL.

### 3.6 Media

| Field | Store | Source & method | Conf. | UI | Unknown |
|---|---|---|---:|---|---|
| Logo | `vendors.logo_url` + `vendor_media.type='logo'` | Website logo/`og:logo` | 0.80 | Header / Media | Not published |
| Hero image | `vendors.hero_image_url` + `vendor_media.type='hero'` | Google cover photo, website `og:image` | 0.85 | Header / Media | Not published |
| Gallery | `vendor_media.type='gallery'` | Google photos tab, website gallery | 0.90 | Media | No photos |
| Videos | `vendor_media.type='video'` | YouTube links, website video | 0.80 | Media | No videos |
| 360 / virtual tour | `vendor_media.type='360'` | Google/website | 0.80 | Media | Not published |
| Image dimensions | `vendor_media.width`, `height` | Image metadata | 0.90 | Internal | Unknown |
| Attribution | `vendor_media.attribution` | Google/website | 0.90 | Media caption | Unknown |
| Licence / source | `vendor_media.licence`, `source` | Source metadata | 0.80 | Media caption | Unknown |

**Media rules**

- Store image URLs, not downloaded copies, unless the user explicitly exports or archives.
- Never substitute a generated avatar for a missing logo.
- Keep attribution; do not strip watermarks.

### 3.7 Social profiles

| Field | Store | Source & method | Conf. | UI | Unknown |
|---|---|---|---:|---|---|
| Platform | `vendor_socials.platform` | Website/social links | 0.85 | Social | Not published |
| Profile URL | `vendor_socials.url` | Website/social links | 0.85 | Social | Not found |
| Handle | `vendor_socials.handle` | Normalized from URL/API | 0.85 | Social | Unknown |
| Followers | `vendor_socials.followers` | Public profile metadata | 0.70 | Social | Not public |
| Verified flag | `vendor_socials.verified` | Public profile badge | 0.90 | Social | Unknown |
| Bio | `vendor_socials.bio` | Public profile | 0.70 | Social | Not public |
| Last post date | `vendor_socials.last_post_at` | Public profile | 0.70 | Social | Unknown |
| Requires login | `vendor_socials.requires_login` | Detection | 1.00 | Social | — |

**Social rules**

- Never scrape private data or bypass a login wall.
- If login is required, keep the URL and set `requires_login = 1`.
- Do not fabricate follower counts, verification badges, or bios.
- Normalize handles per platform and deduplicate.

### 3.8 Legal and tax

| Field | Store | Source & method | Conf. | UI | Unknown |
|---|---|---|---:|---|---|
| GSTIN | `vendors.legal_json.gstin` | Website footer/contact, IndiaMART, GST record if public | 0.90 with checksum / 0.70 pattern | Legal | Not published |
| PAN | `vendors.legal_json.pan` | Website/footer, public record | 0.80 | Legal | Not published |
| CIN | `vendors.legal_json.cin` | Website/footer, MCA data | 0.80 | Legal | Not published |
| Legal entity | `vendors.legal_json.legal_entity`, `vendors.legal_name` | Website/legal pages | 0.80 | Legal | Not published |
| Registration | `vendors.legal_json.registration` | Website/legal pages | 0.70 | Legal | Not published |
| Tax ID | `vendors.legal_json.tax_id` | Website/legal pages | 0.70 | Legal | Not published |

**Legal rules**

- Only store legal identifiers that the source publishes. Never infer a GSTIN/PAN/CIN from a phone number or address.
- Validate patterns and checksums where possible; mark `pattern_only` when checksum is unavailable.
- Do not present a legal identifier as verified unless it was checked against an authoritative source.

### 3.9 Provenance and quality

| Field | Store | Source & method | Conf. | UI | Unknown |
|---|---|---|---:|---|---|
| Field source | `field_provenance.source` | Extraction node | 1.00 | Sources | — |
| Field source URL | `field_provenance.source_url` | Page URL | 1.00 | Sources | — |
| Extraction method | `field_provenance.method` | `json_ld`, `dom`, `text`, `api`, `manual` | 1.00 | Sources | — |
| Field confidence | `field_provenance.confidence` | Confidence model | 1.00 | Data quality | — |
| First seen | `field_provenance.first_seen_at` | Run timestamp | 1.00 | Data quality | — |
| Last seen | `field_provenance.last_seen_at` | Run timestamp | 1.00 | Freshness | — |
| Field verified | `field_provenance.verified` | Manual/real check | 1.00 | Data quality | Unverified |
| Verification method | `field_provenance.verification_method` | `manual`, `format_valid`, `mx_check`, `api` | 1.00 | Data quality | — |
| Field status | `vendors.field_status_json` | `known`, `unknown`, `pending`, `failed`, `conflict` | 1.00 | Data quality | — |
| Conflicts | `field_conflicts` | Merge engine | 1.00 | Data quality | No conflicts |
| Completeness | `vendors.completeness` | Weighted formula | 1.00 | Header / Data quality | — |
| Quality score | `vendors.quality_score` | Transparent scoring formula | 1.00 | Header / Data quality | — |
| Quality reasons | `vendors.quality_reasons_json` | Scoring formula | 1.00 | Data quality | — |
| Deep status | `vendors.deep_status` | Enrichment jobs | 1.00 | Profile badge | Not started |
| Enrichment nodes | `vendor_enrichment` | Per-node job state | 1.00 | Data quality | Pending |

### 3.10 CRM

| Field | Store | Source & method | Conf. | UI | Unknown |
|---|---|---|---:|---|---|
| Stage | `crm.stage` | Manual/automation | 1.00 | CRM board | New |
| Owner | `crm.owner_id` | Manual | 1.00 | CRM | Unassigned |
| Tags | `crm.tags_json` | Manual | 1.00 | CRM / filters | No tags |
| Notes | `crm.notes_json` | Manual | 1.00 | CRM timeline | No notes |
| Tasks | `crm.tasks_json` | Manual | 1.00 | CRM | No tasks |
| Last contact | `crm.last_contact_at` | Manual/activity | 1.00 | CRM | Never contacted |
| Next follow-up | `crm.next_follow_up_at` | Manual | 1.00 | CRM | Not scheduled |
| Activity | `crm_activity` | Manual/system | 1.00 | CRM timeline | No activity |

### 3.11 Run snapshot

| Field | Store | Source & method | Conf. | UI | Unknown |
|---|---|---|---:|---|---|
| Run ID | `run_leads.run_id` | Run creation | 1.00 | Freshness badge | — |
| Query | `runs.query` | User input | 1.00 | Run header | — |
| Zone | `runs.scope_json`, `run_events.payload_json` | Planner | 1.00 | Run console | — |
| Rank | `run_leads.rank` | Run result order | 1.00 | Results | — |
| Snapshot | `run_leads.snapshot_json` | Exact data seen in the run | 1.00 | Sources / diff | — |
| Has mobile | `run_leads.has_mobile` | Derived from contacts | 1.00 | Filters | — |
| Has WhatsApp | `run_leads.has_whatsapp` | Derived from contacts | 1.00 | Filters | — |
| Completeness | `run_leads.completeness` | Snapshot scoring | 1.00 | Results | — |
| First seen | `run_leads.first_seen_at` | Run timestamp | 1.00 | Freshness | — |
| Events | `run_events` | Worker | 1.00 | Run console | — |

---

## 4. UI section mapping

| UI section | Fields shown |
|---|---|
| **Overview** | Name, legal name, category path, business status, description, tagline, established year, owner/contact person, employee count, price range, completeness, quality score, deep status, freshness |
| **Contacts** | Every mobile, landline, WhatsApp, email, website, booking link, contact page, social profile, label, source, confidence, verification |
| **Location** | Full address, all address components, city/mandal/district/state, PIN + validity, village, country, plus code, service areas, lat/lng, accuracy, geohash, boundaries, map link |
| **Hours & operations** | Weekly hours, open now, holiday hours, popular times, temporarily closed notice, price range, packages, offers, payments, parking, accessibility, amenities, service options, languages, service areas, booking |
| **Reputation** | Rating, review count, distribution, reviews (author/rating/text/date/owner response), highlights, "from the business", external ratings |
| **Media** | Logo, hero, gallery, videos, 360, dimensions, attribution, licence |
| **Legal** | Legal name, GSTIN, PAN, CIN, legal entity, registration, tax ID, certifications |
| **Offerings** | Category, specialties, services, products, menu, catalog, tags, packages, offers, brands, affiliations, certifications, awards, price list, brochures, FAQs |
| **Social** | Platform, URL, handle, followers, verified, bio, last post, login-required state |
| **Sources** | Every `vendor_sources` row, every `field_provenance` row, raw snapshot, fetched timestamp |
| **CRM** | Stage, owner, tags, notes, tasks, last contact, next follow-up, activity timeline |
| **Data quality** | Completeness, quality reasons, missing fields, conflicts, per-field status, enrichment nodes |

Every section has a visible state:

- **Known** — real value with source.
- **Unknown** — `Not published by the source` + `Deep extract` action.
- **Pending** — `Queued for deep extraction`.
- **Failed** — `Could not extract: <reason>` + retry.
- **Conflict** — both values shown with sources, primary marked.

---

## 5. Completeness scoring

`vendors.completeness` is a weighted percentage. It is not a marketing grade.

| Dimension | Weight | Rule |
|---|---:|---|
| Identity | 15% | Name + category + status present |
| Mobile contact | 20% | At least one valid mobile |
| Address | 15% | Full address + valid PIN |
| Web presence | 10% | Website or at least one social profile |
| Reputation | 10% | Rating + review count |
| Hours | 5% | At least one weekly hours entry |
| Media | 5% | At least one image |
| Offerings | 10% | Category path + services/products/description |
| Legal/business | 5% | Legal name or a valid legal identifier |
| Verified contact | 5% | At least one manually/actually verified contact |
| **Total** | **100%** | |

The UI shows `Complete 72% · 28 fields · 3 sources` and lists the missing dimensions. Deep extraction raises completeness only by adding real data.

---

## 6. Validation rules

### Phones

- Use `libphonenumber-js` with region `IN`.
- Canonical form: E.164.
- Mobile: valid Indian mobile (`+91[6-9]\d{9}`), type `MOBILE`.
- Landline: valid fixed-line with area code.
- Reject:
  - 6-digit pincodes and PIN-like values
  - numbers embedded in GSTIN, order IDs, CIN, or longer digit strings
  - repeated-digit placeholders
  - invalid prefixes/lengths
- Deduplicate by national significant number.
- Store all valid numbers; do not collapse to one.

### Emails

- Lowercase and trim.
- Basic RFC syntax plus domain check.
- Optional MX lookup in deep mode.
- Label by context: `owner`, `sales`, `support`, `booking`, `general`.
- Never infer an email from a name/domain.

### PIN codes

- 6 digits, first digit `1–9`.
- Validate against local PIN list when available.
- Accept only from address components or address context.
- Store validity and source.

### Legal identifiers

- GSTIN: 15 characters, state code + PAN + entity + `Z` + checksum; validate checksum when possible.
- PAN: `[A-Z]{5}[0-9]{4}[A-Z]`.
- CIN: 21-character pattern.
- Mark `pattern_only` when only the shape is validated.
- Never derive from phone/address digits.

### Ratings and counts

- Rating: `0.0–5.0`, one decimal.
- Review count: integer `>= 0`.
- Distribution counts must sum to the review count when all five buckets are present; otherwise mark partial.

### URLs

- Prefer HTTPS; keep the original if only HTTP.
- Strip tracking parameters (`utm_*`, `fbclid`, `gclid`) for canonical storage; keep raw in provenance.
- Normalize social handles per platform.
- Reject `javascript:`, `data:`, and localhost URLs from scraped content.

### Dates and times

- Store ISO-8601 UTC timestamps.
- Review dates can be date-only when the source only provides a date.
- Hours use 24-hour local time with `Asia/Kolkata`.
- `open_now` is computed, not scraped as a static truth.

### Text

- Preserve Unicode (Devanagari, Telugu, Tamil, etc.).
- Trim and collapse whitespace.
- Do not translate or paraphrase source descriptions.
- Store the original language and a normalized search form.

---

## 7. Unknown and conflict policy

### Unknown reasons

| Code | UI text | When |
|---|---|---|
| `not_published` | Not published by the source | Source has no such field |
| `not_found` | Not found | Deep extraction ran, nothing found |
| `requires_login` | Needs login | Social/listing requires authentication |
| `blocked` | Blocked by the source | CAPTCHA/anti-bot |
| `not_attempted` | Not checked | Node not run yet |
| `unsupported` | Not supported for this source | Field does not exist on source |
| `invalid` | Failed validation | Extracted value rejected |
| `conflict` | Sources disagree | Multiple values, unresolved |
| `timeout` | Timed out | Request exceeded budget |

### Conflict handling

- Keep all distinct values in `field_conflicts.values_json` with source, confidence, and timestamp.
- Choose the highest-confidence value as primary.
- If confidence is equal and values differ materially, keep the existing value as primary and flag `needs_review`.
- The UI shows a conflict badge and a side-by-side comparison.
- A user can resolve a conflict; the resolution is recorded in `field_provenance`.

### Banned values

The following must never appear as stored data:

- `N/A`, `NA`, `Not available`, `Not applicable`
- `Requires lookup`, `Call for number`, `Number hidden`
- `0000000000`, `9999999999`, `1234567890`
- `ui-avatars.com` URLs
- Generated ratings/reviews
- Placeholder emails like `test@example.com`
- Guessed GSTIN/PAN/CIN

If a source displays one of these, store `unknown` with `not_published` or `requires_login` instead.

---

## 8. Deep extraction node ownership

| Node | Owns | Runs |
|---|---|---|
| `L0 listing` | Name, place ID, phone if shown, rating, review count, address snippet, coords, category, thumbnail | Search feed |
| `L1 place_details` | Canonical name, place ID/CID, full address + components, all phones, website, category path, hours, price range, plus code, business status, coords, description | Per vendor |
| `L2 reviews` | Rating distribution, top reviews, authors, ratings, text, dates, owner responses, recent dates | Per vendor, parallel |
| `L2 photos` | Hero, gallery, video/360 links, dimensions, attribution | Per vendor, parallel |
| `L2 about` | Amenities, payments, accessibility, parking, service options, languages, planning, from-the-business | Per vendor, parallel |
| `L2 popular_times` | Popular times by day/hour | Per vendor, optional |
| `L3 website` | Emails, phones, socials, address, GSTIN/PAN/CIN, services, products, description, hours, booking, logo, OG, FAQs, offers, certifications, awards, brands, affiliations, menu, catalog, price list, brochures, packages | Per vendor with website |
| `L4 socials` | Platform, URL, handle, followers, verified, bio, contact, address, hours, last post, login-required | After website links |
| `L5 structured_data` | JSON-LD/microdata/OG fields, `sameAs`, `taxID`, `vatID`, `foundingDate`, `priceRange`, `paymentAccepted`, `areaServed` | Per website |
| `L6 verification` | Phone/email validity, MX, manual verification | Deep/optional |

**Merge order:** structured data > official source page > website > social > search snippet (with the confidence table above).

**Node status:** `pending → running → done | failed | skipped`, with `attempts`, `last_error`, `started_at`, `finished_at`. A failed node never blocks the rest of the profile.

---

## 9. Source-specific extraction notes

### Google Maps

- Prefer `APP_INITIALIZATION_STATE` over DOM selectors.
- DOM fallbacks: `h1`, `[data-item-id="address"]`, `button[data-item-id^="phone:tel:"]`, `a[data-item-id="authority"]`, category button, `div.F7nice`, hours table, business status.
- Reviews tab: rating histogram + top reviews + owner responses.
- Photos tab: hero + gallery + attribution.
- About tab: service options, amenities, payments, accessibility, parking, languages, planning.
- Never treat a pincode or a card fragment as a phone.
- Never create a pin at a zone center when the vendor coordinate is unknown.

### Vendor website

- Fetch homepage + `/contact`, `/about`, `/services`, `/products`, `/menu`, `/gallery`, `/booking`, bounded to 8 pages, 6s each.
- Parse `mailto:`, `tel:`, JSON-LD, microdata, Open Graph, footer, contact page.
- Respect `robots.txt` for deeper pages; record why a page was skipped.
- Never disable TLS verification.
- Cache per domain for 7 days; a forced deep extraction bypasses the cache.
- No login bypass, no paywall bypass.

### JustDial

- Use Playwright Firefox for Akamai compatibility.
- Search + paginate; open detail pages.
- Click "Show Number" when present; wait for the real number; fall back to website enrichment.
- If blocked, mark the engine degraded and surface the reason.

### IndiaMART

- Search `dir.indiamart.com/search.mp?ss=<query>`.
- Parse company name, address, listing URL, category.
- Open detail page; click "View Mobile Number" when available.
- Capture catalog/products where public.
- Record `phone_unavailable_reason` instead of an empty success.

### Wedding verticals

- WeddingBazaar, WeddingWire, Mandap.
- Parse listing cards and public detail pages.
- If phone requires login/OTP, store the URL and `requires_login`; do not insert a placeholder.

### Social profiles

- Public metadata only.
- Capture handle, URL, followers, verified, bio, contact button, address, hours, last post.
- If login-required, stop and record it.
- Never fabricate followers or verification.

### Search snippets

- Use only for discovery (finding a website/social URL).
- Confidence `0.40`.
- Never extract a phone/email/legal ID from a snippet and present it as fact.

---

## 10. Acceptance checklist

A vendor profile is complete when:

- [ ] Every non-null field has a `field_provenance` row with source, method, confidence, and timestamps.
- [ ] Every null field that was attempted has an `unknown_reason`.
- [ ] No banned placeholder values exist.
- [ ] All phones are E.164 and validated; mobiles and landlines are classified correctly.
- [ ] Zero pincode-as-phone errors on the fixture set.
- [ ] Address components and PIN validity are populated when Google exposes them.
- [ ] Rating, review count, and rating distribution agree.
- [ ] Deep mode has at least 3 review snippets and 3 images where the source publishes them.
- [ ] Social handles are normalized and login-required profiles are flagged, not faked.
- [ ] Legal identifiers are pattern/checksum validated and never inferred.
- [ ] Conflicts are stored and visible, not silently overwritten.
- [ ] Completeness and quality scores match their formulas.
- [ ] The UI shows `Unknown` for missing data and offers `Deep extract`.
- [ ] The profile is reproducible from `vendor_sources.raw_json` + `field_provenance`.

---

## 11. Field count target

The profile has **11 groups** and **130+ tracked fields/attributes**. A sparse but honest profile is acceptable; a complete-looking fake profile is not.

| Group | Fields/attributes |
|---|---:|
| Identity | 15 |
| Categories & offerings | 19 |
| Contacts | 14 |
| Address & geo | 20 |
| Hours & operations | 14 |
| Reputation | 14 |
| Media | 8 |
| Social | 8 |
| Legal/tax | 6 |
| Provenance & quality | 14 |
| CRM | 8 |
| Run snapshot | 10 |

The exact count can grow as sources expose new attributes; the rule does not change: **real value or explicit unknown, never a guess.**
