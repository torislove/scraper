/**
 * shared/data/specialistExpansions.js
 * All 16 Medical Doctor & Allied Specialist Niche Expansions across 11 Sovereign Nations
 * (IN, US, GB, AU, CA, DE, FR, AE, SG, NZ, IE). Strictly <= 250 lines.
 */

export const DOCTOR_16_BY_COUNTRY = {
  DE: [
    'Allgemeinmedizin & Hausärzte', 'Orthopäden & Unfallchirurgie', 'Kardiologen & Herzpraxen',
    'Hautärzte & Dermatologie', 'Frauenärzte & Gynäkologie', 'Kinderärzte & Pädiatrie',
    'Neurologen & Neurochirurgie', 'Augenärzte & Augenheilkunde', 'HNO-Ärzte',
    'Gastroenterologie & Innere Medizin', 'Urologen', 'Onkologie & Krebszentren',
    'Diabetologie & Endokrinologie', 'Lungenärzte & Pneumologie', 'Nephrologie & Dialyse',
    'Psychiatrie & Psychotherapie'
  ],
  FR: [
    'Médecins Généralistes', 'Chirurgiens Orthopédistes', 'Cardiologues',
    'Dermatologues', 'Gynécologues Obstétriciens', 'Pédiatres',
    'Neurologues', 'Ophtalmologues', 'Médecins ORL',
    'Gastro-Entérologues', 'Urologues', 'Oncologues',
    'Diabétologues & Endocrinologues', 'Pneumologues', 'Néphrologues',
    'Psychiatres & Psychothérapeutes'
  ],
  GB: [
    'General Practitioners & Private GPs', 'Orthopaedic Surgeons & Bone Clinics', 'Cardiologists & Heart Clinics',
    'Dermatologists & Skin Specialists', 'Gynaecologists & Women Health', 'Paediatricians',
    'Neurologists', 'Ophthalmologists & Eye Specialists', 'ENT Consultants',
    'Gastroenterologists', 'Urologists', 'Oncologists',
    'Endocrinologists & Diabetes Clinics', 'Respiratory & Chest Consultants', 'Nephrologists',
    'Psychiatrists & Mental Health Clinics'
  ],
  default: [
    'General Physicians & Family Doctors', 'Orthopedic Doctors & Bone Surgeons', 'Cardiologists & Heart Specialists',
    'Dermatologists & Skin Clinics', 'Gynecologists & Maternity Doctors', 'Pediatricians & Child Specialists',
    'Neurologists & Brain Spine Doctors', 'Ophthalmologists & Eye Doctors', 'ENT Specialists (Ear Nose Throat)',
    'Gastroenterologists & Liver Doctors', 'Urologists & Kidney Doctors', 'Oncologists & Cancer Specialists',
    'Diabetologists & Endocrinologists', 'Pulmonologists & Chest Physicians', 'Nephrologists & Dialysis Doctors',
    'Psychiatrists & Mental Health Doctors'
  ]
};
DOCTOR_16_BY_COUNTRY.IE = DOCTOR_16_BY_COUNTRY.GB;
DOCTOR_16_BY_COUNTRY.AU = DOCTOR_16_BY_COUNTRY.GB;
DOCTOR_16_BY_COUNTRY.NZ = DOCTOR_16_BY_COUNTRY.GB;

export const SPECIALIST_NICHE_EXPANSIONS = [
  {
    key: 'orthopedic_doctors',
    label: 'Orthopedic Doctors & Bone Surgeons',
    matchRe: /\b(orthop[aeä]d\w*(?:\s*(?:doctors?|surgeons?|specialists?|clinics?|hospitals?))?|bone\s*(?:and\s*|\&\s*)?joint\s*(?:doctors?|clinics?|specialists?)|joint\s*replacement|fracture\s*clinics?)\b/i,
    byCountry: {
      DE: ['Orthopäden', 'Orthopädische Praxis', 'Facharzt für Orthopädie & Unfallchirurgie', 'Gelenkzentrum & Endoprothetik', 'Wirbelsäulenzentrum', 'Sportorthopädie'],
      FR: ['Chirurgiens Orthopédistes', 'Orthopédistes', 'Clinique Orthopédique', 'Spécialistes du Genou et Rachis', 'Traumatologie & Articulations'],
      GB: ['Orthopaedic Surgeons', 'Private Orthopaedic Consultants', 'Bone & Joint Clinics', 'Knee & Hip Replacement Specialists', 'Spine & Fracture Clinics'],
      default: ['Orthopedic Doctors', 'Orthopedic Surgeons', 'Bone & Joint Clinics', 'Joint Replacement Centers', 'Spine & Arthritis Specialists', 'Orthopedic Hospitals']
    }
  },
  {
    key: 'cardiologists',
    label: 'Cardiologists & Heart Specialists',
    matchRe: /\b(cardiolog\w*|heart\s*(?:doctors?|specialists?|clinics?|hospitals?)|kardiolog\w*|cardiologues?)\b/i,
    byCountry: {
      DE: ['Kardiologen', 'Kardiologische Praxis', 'Herzzentrum', 'Facharzt für Kardiologie', 'Angiologie & Gefäßmedizin'],
      FR: ['Cardiologues', 'Cabinet de Cardiologie', 'Institut Cardiologique', 'Rythmologie & Vasculaire'],
      default: ['Cardiologists', 'Heart Specialist Doctors', 'Interventional Cardiology Clinics', 'Echo & ECG Heart Centers', 'Cardiac Hospitals']
    }
  },
  {
    key: 'dermatologists',
    label: 'Dermatologists & Skin Clinics',
    matchRe: /\b(dermatolog\w*|skin\s*(?:doctors?|specialists?|clinics?|care)|haut[aä]rzt\w*)\b/i,
    byCountry: {
      DE: ['Hautärzte', 'Dermatologische Praxis', 'Laser- & Hautzentrum', 'Allergologie & Hautklinik'],
      FR: ['Dermatologues', 'Cabinet de Dermatologie', 'Médecine Esthétique & Peau'],
      default: ['Dermatologists', 'Skin Specialist Doctors', 'Laser & Dermatology Clinics', 'Trichology & Hair Doctors', 'Cosmetic Dermatology Centers']
    }
  },
  {
    key: 'gynecologists',
    label: 'Gynecologists & Maternity Specialists',
    matchRe: /\b(gyn[ae]colog\w*|obstetric\w*|ob[\s-]*gyn|maternity\s*(?:doctors?|clinics?|hospitals?)|women\s*(?:doctors?|clinics?)|frauen[aä]rzt\w*)\b/i,
    byCountry: {
      DE: ['Frauenärzte & Gynäkologen', 'Gynäkologische Praxis', 'Geburtsklinik & Kinderwunschzentrum'],
      FR: ['Gynécologues Obstétriciens', 'Cabinets de Gynécologie', 'Maternité & Fertilité'],
      default: ['Gynecologists & Obstetricians', 'Women Health Doctors', 'Maternity & Antenatal Clinics', 'IVF & Fertility Specialists', 'Laparoscopic Gynecology Centers']
    }
  },
  {
    key: 'pediatricians',
    label: 'Pediatricians & Child Specialists',
    matchRe: /\b(p[ae]diatr\w*|child\s*(?:doctors?|specialists?|clinics?)|children\s*(?:doctors?|hospitals?)|kinder[aä]rzt\w*|p[eé]diatres?)\b/i,
    byCountry: {
      DE: ['Kinderärzte & Jugendmedizin', 'Kinderklinik & Pädiatrie', 'Neonatologie Zentrum'],
      FR: ['Pédiatres', 'Cabinets de Pédiatrie', 'Clinique Pédiatrique'],
      default: ['Pediatricians', 'Child Specialist Doctors', 'Newborn & Neonatology Clinics', 'Vaccination & Child Care Centers', 'Children Hospitals']
    }
  },
  {
    key: 'neurologists',
    label: 'Neurologists & Brain Spine Specialists',
    matchRe: /\b(neurolog\w*|neurosurgeo\w*|brain\s*(?:doctors?|specialists?|clinics?)|spine\s*(?:doctors?|specialists?)|neurochirurg\w*)\b/i,
    byCountry: {
      DE: ['Neurologen & Nervenärzte', 'Neurochirurgie Praxis', 'Schlaganfall & Wirbelsäulezentrum'],
      FR: ['Neurologues', 'Neurochirurgiens', 'Institut du Cerveau & Rachis'],
      default: ['Neurologists', 'Neurosurgeons', 'Brain & Spine Clinics', 'Migraine & Epilepsy Specialists', 'Stroke & Neuro Hospitals']
    }
  },
  {
    key: 'ophthalmologists',
    label: 'Ophthalmologists & Eye Specialists',
    matchRe: /\b(ophthalmolog\w*|eye\s*(?:doctors?|specialists?|surgeons?|clinics?|hospitals?)|netralaya\w*|lasik|cataract|augen[aä]rzt\w*|ophtalmolog\w*)\b/i,
    byCountry: {
      DE: ['Augenärzte', 'Augenklinik & Laserzentrum', 'Katarakt & Netzhaut Spezialisten'],
      FR: ['Ophtalmologues', 'Clinique Ophtalmologique', 'Chirurgie Réfractive & Cataracte'],
      default: ['Ophthalmologists', 'Eye Specialist Doctors', 'Cataract & LASIK Surgeons', 'Retina & Glaucoma Clinics', 'Eye Hospitals & Netralaya']
    }
  },
  {
    key: 'ent_specialists',
    label: 'ENT Doctors (Ear, Nose & Throat)',
    matchRe: /\b(\bent\b(?:\s*(?:doctors?|specialists?|surgeons?|clinics?|hospitals?))?|ear\s*nose\s*throat|otolaryngolog\w*|hno[\s-]*[aä]rzt\w*|orl)\b/i,
    byCountry: {
      DE: ['HNO-Ärzte', 'Hals-Nasen-Ohren Praxis', 'HNO-Klinik'],
      FR: ['Médecins ORL', 'Clinique ORL & Audition'],
      default: ['ENT Specialists', 'Ear Nose Throat Doctors', 'Sinus & Endoscopic ENT Surgeons', 'Audiology & Vertigo Clinics', 'ENT Hospitals']
    }
  },
  {
    key: 'gastroenterologists',
    label: 'Gastroenterologists & Liver Doctors',
    matchRe: /\b(gastroenterolog\w*|gastro\s*(?:doctors?|specialists?|clinics?|hospitals?)|hepatolog\w*|liver\s*(?:doctors?|specialists?))\b/i,
    defaultSubs: ['Gastroenterologists', 'Surgical Gastroenterology Clinics', 'Endoscopy & Colonoscopy Centers', 'Liver & Hepatology Doctors', 'Gastro Hospitals']
  },
  {
    key: 'urologists',
    label: 'Urologists & Kidney Specialists',
    matchRe: /\b(urolog\w*|kidney\s*stone\s*(?:doctors?|clinics?)|androlog\w*|nephrolog\w*|dialysis)\b/i,
    defaultSubs: ['Urologists & Andrologists', 'Kidney Stone Laser Centers', 'Prostate & Urology Clinics', 'Nephrologists & Dialysis Centers', 'Urology Hospitals']
  },
  {
    key: 'oncologists',
    label: 'Oncologists & Cancer Specialists',
    matchRe: /\b(oncolog\w*|cancer\s*(?:doctors?|specialists?|clinics?|hospitals?|cent(?:er|re)s?))\b/i,
    defaultSubs: ['Medical Oncologists', 'Surgical Oncology Specialists', 'Radiation Oncology Centers', 'Chemotherapy & Cancer Hospitals']
  },
  {
    key: 'diabetologists',
    label: 'Diabetologists & Endocrinologists',
    matchRe: /\b(diabetolog\w*|endocrinolog\w*|thyroid\s*(?:doctors?|clinics?)|diabetes\s*(?:doctors?|clinics?|cent(?:er|re)s?))\b/i,
    defaultSubs: ['Diabetologists', 'Endocrinologists & Thyroid Clinics', 'Diabetes Care Centers', 'Metabolic & Hormone Specialists']
  },
  {
    key: 'pulmonologists',
    label: 'Pulmonologists & Chest Physicians',
    matchRe: /\b(pulmonolog\w*|chest\s*(?:doctors?|physicians?|specialists?)|respiratory\s*(?:doctors?|clinics?)|asthma\s*clinics?)\b/i,
    defaultSubs: ['Pulmonologists', 'Chest & Respiratory Physicians', 'Asthma & Allergy Clinics', 'Sleep Apnea & Bronchoscopy Centers']
  },
  {
    key: 'psychiatrists',
    label: 'Psychiatrists & Mental Health Clinics',
    matchRe: /\b(psychiatr\w*|psycholog\w*|mental\s*health\s*(?:doctors?|clinics?)|neuropsychiatr\w*)\b/i,
    defaultSubs: ['Psychiatrists', 'Neuropsychiatry Clinics', 'Clinical Psychologists & Counseling', 'De-addiction & Wellness Centers']
  },
  {
    key: 'physiotherapists',
    label: 'Physiotherapists & Rehab Centers',
    matchRe: /\b(physiotherap\w*|physical\s*therap\w*|chiropract\w*|rehab\w*)\b/i,
    byCountry: {
      DE: ['Physiotherapie Praxen', 'Krankengymnastik & Reha', 'Chiropraktik & Osteopathie'],
      FR: ['Kinésithérapeutes', 'Ostéopathes & Rééducation'],
      default: ['Physiotherapy Clinics', 'Sports Injury & Rehab Centers', 'Spine & Orthopedic Physiotherapy', 'Chiropractors & Manual Therapy']
    }
  }
];

export function resolveSpecialistExpansion(rawQuery = '', countryCode = 'IN') {
  const clean = String(rawQuery || '').trim();
  const cc = String(countryCode || 'IN').toUpperCase();
  if (!clean) return null;
  for (const item of SPECIALIST_NICHE_EXPANSIONS) {
    if (item.matchRe.test(clean)) {
      const byC = item.byCountry;
      const subs = (byC && (byC[cc] || ((cc === 'IE' || cc === 'AU' || cc === 'NZ') && byC.GB) || byC.default))
        || item.defaultSubs
        || [];
      return { key: item.key, label: item.label, subcategories: subs };
    }
  }
  return null;
}

export function getDoctorSubsForCountry(countryCode = 'IN') {
  const cc = String(countryCode || 'IN').toUpperCase();
  return DOCTOR_16_BY_COUNTRY[cc] || DOCTOR_16_BY_COUNTRY.default;
}
