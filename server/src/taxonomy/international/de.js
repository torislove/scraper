'use strict';

/**
 * taxonomy/international/de.js
 * Sovereign business taxonomy for Germany (DE).
 */

module.exports = {
  name: 'Germany',
  code: 'DE',
  sectors: {
    'Bildung & Schulen': {
      schools: [
        'Gymnasien & Realschulen',
        'Grundschulen & Ganztagsschulen',
        'Internationale Schulen & Privatschulen',
        'Kindertagesstätten (Kitas) & Krippen'
      ],
      colleges: [
        'Universitäten & Technische Hochschulen',
        'Fachhochschulen & Berufskollegs'
      ]
    },
    'Gesundheit & Zahnmedizin': {
      dental: [
        'Zahnärzte & Kieferorthopäden',
        'Zahnarztpraxen & Implantologie',
        'Kinderzahnheilkunde Zentren'
      ],
      doctors: [
        'Hausärzte & Allgemeinmediziner',
        'Fachärzte & Medizinische Versorgungszentren (MVZ)',
        'Physiotherapie & Krankengymnastik Praxen'
      ]
    },
    'Handwerk & Bau': {
      plumbing: [
        'Sanitär & Heizungsbau Meisterbetriebe',
        'Rohrreinigung & Notdienst Sanitär'
      ],
      electricians: [
        'Elektroinstallation Meisterbetriebe',
        'Photovoltaik & Gebäudetechnik'
      ],
      roofing: [
        'Dachdecker Meisterbetriebe',
        'Bauklempnerei & Flachdachabdichtung'
      ],
      contractors: [
        'Bauunternehmen & Renovierung',
        'Maler & Innenausbau Betriebe'
      ]
    },
    'Recht & Finanzen': {
      lawyers: [
        'Rechtsanwälte & Fachanwälte',
        'Kanzleien für Arbeitsrecht & Verkehrsrecht',
        'Notare & Wirtschaftskanzleien'
      ],
      accountants: [
        'Steuerberater & Wirtschaftsprüfer',
        'Lohnbuchhaltung & Finanzberatung'
      ],
      realtor: [
        'Immobilienmakler & Hausverwaltungen',
        'Gewerbeimmobilien Makler'
      ]
    }
  }
};
