'use strict';

/**
 * taxonomy/international/fr.js
 * Sovereign business taxonomy for France (FR).
 */

module.exports = {
  name: 'France',
  code: 'FR',
  sectors: {
    'Éducation & Écoles': {
      schools: [
        'Lycées & Collèges',
        'Écoles Primaires & Maternelles',
        'Écoles Privées Sous Contrat',
        'Crèches & Halte-Garderies'
      ],
      colleges: [
        'Grandes Écoles & Universités',
        'IUT & Écoles d\'Ingénieurs'
      ]
    },
    'Santé & Médical': {
      dental: [
        'Chirurgiens Dentistes & Soins Dentaires',
        'Orthodontistes & Implantologie',
        'Centres Dentaires Mutualistes'
      ],
      doctors: [
        'Médecins Généralistes & Cabinets Médicaux',
        'Cabinets de Kinésithérapie & Ostéopathie',
        'Pharmacies d\'Officine & de Garde'
      ]
    },
    'Bâtiment & Artisans': {
      plumbing: [
        'Plombiers Chauffagistes Qualifiés',
        'Dépannage Plomberie Urgence'
      ],
      electricians: [
        'Électriciens Qualifiés RGE',
        'Rénovation Électrique & Domotique'
      ],
      roofing: [
        'Artisans Couvreurs Zingueurs',
        'Étanchéité Toiture & Rénovation'
      ],
      contractors: [
        'Entreprises Générales de Bâtiment',
        'Maçons & Rénovation Intérieure'
      ]
    },
    'Juridique & Conseil': {
      lawyers: [
        'Avocats au Barreau & Cabinets d\'Avocats',
        'Notaires & Conseils Juridiques'
      ],
      accountants: [
        'Experts-Comptables & Commissaires aux Comptes',
        'Gestion Comptable & Fiscale'
      ],
      realtor: [
        'Agences Immobilières & Gestion Locative',
        'Chasseurs Immobiliers'
      ]
    }
  }
};
