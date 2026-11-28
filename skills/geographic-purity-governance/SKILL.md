---
name: geographic-purity-governance
description: Strict governance for municipal boundary purity, ward centroid coordinates, and preventing cross-city lead pollution.
---

# Geographic Purity & Municipal Boundary Governance

## 1. Zero Cross-City Contamination Mandate
- When sweeping a target city, **ZERO leads from outside that municipality are permitted**.
- Example: A search for *"Bakeries in Guntur"* must **never** return leads from Mumbai, Maharashtra, Hyderabad, Vijayawada, Tenali, or Mangalagiri.

---

## 2. Two-Tier Verification Check

Every harvested lead must pass two layers of boundary checks before being saved or broadcast to the user:

### Tier 1: Text-Based Rejection Words
Check `lead.name`, `lead.address`, and `lead.city` against the target city's exclusion list.
- For **Guntur City (`guntur`)**:
  - Exclude: `mumbai`, `maharashtra`, `mangalagiri`, `tenali`, `vijayawada`, `hyderabad`, `bengaluru`, `chennai`, `pune`, `delhi`.
- For **Dallas (`dallas`)**:
  - Exclude: `houston`, `austin`, `san antonio`, `new york`, `chicago`.
- For **Paris (`paris`)**:
  - Exclude: `lyon`, `marseille`, `toulouse`, `nice`, `bordeaux`.

### Tier 2: Bounding Box Coordinate Validation
If the lead carries latitude and longitude coordinates:
- The coordinates must fall strictly within the municipal bounding box defined in `server/src/geo.js`.
- For **Guntur Municipal Corporation (GMC)**:
  - Lat Range: `16.22°N` to `16.38°N`
  - Lng Range: `80.36°E` to `80.52°E`
- Any lead falling outside these bounds is rejected immediately.

---

## 3. Ward & Locality Centroid Resolution
- Instead of issuing a single generic city query, queries must be partitioned across verified wards and zones:
  - **Guntur (15 Core Zones)**: Brodipet, Arundelpet, Lakshmipuram, Kothapet, Collectorate, Gujjanagundla, Pattabhipuram, Amaravathi Road, Old Guntur, Nallapadu, Auto Nagar, Vidya Nagar, Syamala Nagar, Koritepadu, Naaz Centre.
  - **Bangalore (5 Core Zones)**: Koramangala, Indiranagar, HSR Layout, Whitefield, Jayanagar.
  - **Dallas (5 Core Zones)**: Downtown, Uptown, Deep Ellum, Oak Lawn, Preston Hollow.
  - **London (5 Core Zones)**: City of London, Westminster, Camden, Islington, Kensington.
  - **Paris (5 Core Zones)**: Paris Centre (1er - 4e), Le Marais, Montmartre, Saint-Germain-des-Prés, Champs-Élysées.
- Radius per zone: `1.5 km` to `3.5 km` to prevent overlapping redundant requests.
