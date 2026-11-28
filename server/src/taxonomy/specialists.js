'use strict';

/**
 * server/src/taxonomy/specialists.js
 * All 16 Medical Doctor & Allied Specialist Definitions across 11 Nations
 * with strict non-bleed domain anchors & localized synonyms.
 */

const DOCTOR_16_BY_COUNTRY = {
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
  IN: [
    'General Physicians & Family Doctors', 'Orthopedic Doctors & Bone Specialists', 'Cardiologists & Heart Specialists',
    'Dermatologists & Skin Specialists', 'Gynecologists & Maternity Doctors', 'Pediatricians & Child Specialists',
    'Neurologists & Brain Specialists', 'Ophthalmologists & Eye Doctors', 'ENT Specialists (Ear Nose Throat)',
    'Gastroenterologists & Liver Specialists', 'Urologists & Kidney Doctors', 'Oncologists & Cancer Specialists',
    'Diabetologists & Endocrinologists', 'Pulmonologists & Chest Specialists', 'Nephrologists & Dialysis Doctors',
    'Psychiatrists & Mental Health Doctors'
  ],
  US: [
    'Primary Care & Family Medicine Physicians', 'Orthopedic Surgeons & Sports Medicine', 'Cardiologists & Heart Doctors',
    'Dermatologists & Skin Care Specialists', 'OB-GYN & Women\'s Health Doctors', 'Pediatricians & Adolescent Medicine',
    'Neurologists & Neurosurgeons', 'Ophthalmologists & Eye Specialists', 'Otolaryngologists & ENT Doctors',
    'Gastroenterologists & Digestive Health', 'Urologists & Kidney Specialists', 'Oncologists & Hematologists',
    'Endocrinologists & Diabetes Doctors', 'Pulmonologists & Lung Specialists', 'Nephrologists & Renal Care',
    'Psychiatrists & Mental Health Specialists'
  ],
  AE: [
    'General Practitioners & Family Medicine', 'Orthopedic Specialists & Surgeons', 'Cardiologists & Heart Centers',
    'Dermatologists & Aesthetic Specialists', 'Obstetrics & Gynecology Specialists', 'Pediatricians & Child Health',
    'Neurologists & Brain Specialists', 'Ophthalmologists & Eye Specialists', 'ENT Specialists & Sinus Centers',
    'Gastroenterologists & Liver Specialists', 'Urologists & Andrologists', 'Oncologists & Cancer Specialists',
    'Endocrinologists & Diabetologists', 'Pulmonologists & Respiratory Care', 'Nephrologists & Kidney Care',
    'Psychiatrists & Behavioral Health'
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

const SPECIALIST_NICHES = [
  {
    key: 'orthopedic_doctors',
    patterns: [/\b(orthop[aeä]d\w*(?:\s*(?:doctors?|surgeons?|specialists?|clinics?|hospitals?))?|bone\s*(?:and\s*|\&\s*)?joint|joint\s*replacement|fracture\s*clinics?|unfallchirurg\w*)\b/i],
    categoryFamily: 'ortho',
    label: 'Orthopedic Doctors & Bone Surgeons',
    strictFilterRe: /(ortho|orthop[aäe]d|bone|joint|spine|arthroscop|knee|shoulder|fracture|unfallchirurg|gelenk)/i,
    rejectRe: /(dental|dentist|teeth|eye\s*hospital|optician|lenskart|maternity|fertility|gynec|pediatric|dermatolog|cardiolog|neurosurg|oncolog|canteen|cafeteria|veterinary)/i,
    synonyms: {
      DE: ['Orthopäden', 'Orthopädische Praxis', 'Facharzt für Orthopädie & Unfallchirurgie', 'Gelenkzentrum & Endoprothetik', 'Wirbelsäulenzentrum'],
      FR: ['Chirurgiens Orthopédistes', 'Orthopédistes', 'Clinique Orthopédique', 'Traumatologie & Articulations'],
      GB: ['Orthopaedic Surgeons', 'Private Orthopaedic Consultants', 'Bone & Joint Clinics', 'Knee & Hip Replacement Specialists'],
      default: ['Orthopedic Doctors', 'Orthopedic Surgeons', 'Bone & Joint Clinics', 'Joint Replacement Centers', 'Spine & Arthritis Specialists', 'Orthopedic Hospitals']
    }
  },
  {
    key: 'dermatologists',
    patterns: [/\b(dermatolog\w*|skin\s*(?:doctors?|specialists?|clinics?|care)|haut[aä]rzt\w*)\b/i],
    categoryFamily: 'dermatology',
    label: 'Dermatologists & Skin Clinics',
    strictFilterRe: /(dermatolog|skin|cosmetolog|tricholog|laser\s*skin|hautarzt|peau|allergolog)/i,
    rejectRe: /(dental|dentist|orthopedic|eye\s*hospital|optician|veterinary|beauty\s*parlour\s*men)/i,
    synonyms: {
      DE: ['Hautärzte', 'Dermatologische Praxis', 'Laser- & Hautzentrum'],
      FR: ['Dermatologues', 'Cabinet de Dermatologie'],
      default: ['Dermatologists', 'Skin Specialist Doctors', 'Laser & Dermatology Clinics', 'Trichology & Skin Care Centers']
    }
  },
  {
    key: 'neurologists',
    patterns: [/\b(neurolog\w*|neurosurgeo\w*|brain\s*(?:doctors?|specialists?|clinics?)|neurochirurg\w*)\b/i],
    categoryFamily: 'neurology',
    label: 'Neurologists & Neurosurgeons',
    strictFilterRe: /(neuro|brain|spine|epilepsy|stroke|nervenarzt)/i,
    rejectRe: /(dental|dentist|eye\s*hospital|maternity|dermatolog|veterinary)/i,
    synonyms: {
      DE: ['Neurologen & Nervenärzte', 'Neurochirurgie Praxis', 'Wirbelsäule & Schlaganfall'],
      FR: ['Neurologues', 'Neurochirurgiens'],
      default: ['Neurologists', 'Neurosurgeons', 'Brain & Spine Clinics', 'Neuro Care Hospitals']
    }
  },
  {
    key: 'gastroenterologists',
    patterns: [/\b(gastroenterolog\w*|gastro\s*(?:doctors?|specialists?|clinics?|hospitals?)|hepatolog\w*|liver\s*(?:doctors?|specialists?))\b/i],
    categoryFamily: 'gastro',
    label: 'Gastroenterologists & Liver Doctors',
    strictFilterRe: /(gastro|hepatolog|liver|endoscop|digestive|bariatric|stomach)/i,
    rejectRe: /(dental|dentist|eye\s*hospital|orthopedic|dermatolog|veterinary)/i,
    synonyms: { default: ['Gastroenterologists', 'Surgical Gastroenterology Clinics', 'Endoscopy & Liver Centers', 'Gastro Hospitals'] }
  },
  {
    key: 'urologists',
    patterns: [/\b(urolog\w*|androlog\w*|nephrolog\w*|kidney\s*(?:doctors?|specialists?|clinics?)|dialysis)\b/i],
    categoryFamily: 'urology',
    label: 'Urologists & Nephrologists',
    strictFilterRe: /(urolog|androlog|nephrolog|kidney|renal|dialysis|prostate|stone)/i,
    rejectRe: /(dental|dentist|eye\s*hospital|orthopedic|dermatolog|veterinary)/i,
    synonyms: { default: ['Urologists & Andrologists', 'Kidney Stone & Urology Clinics', 'Nephrologists & Dialysis Centers', 'Urology Hospitals'] }
  },
  {
    key: 'diabetologists',
    patterns: [/\b(diabetolog\w*|endocrinolog\w*|thyroid\s*(?:doctors?|clinics?)|diabetes\s*(?:doctors?|clinics?|cent(?:er|re)s?))\b/i],
    categoryFamily: 'diabetes',
    label: 'Diabetologists & Endocrinologists',
    strictFilterRe: /(diabet|endocrin|thyroid|hormone|metabolic)/i,
    rejectRe: /(dental|dentist|eye\s*hospital|orthopedic|veterinary)/i,
    synonyms: { default: ['Diabetologists', 'Endocrinologists & Thyroid Clinics', 'Diabetes Care Centers'] }
  },
  {
    key: 'pulmonologists',
    patterns: [/\b(pulmonolog\w*|chest\s*(?:doctors?|physicians?|specialists?)|respiratory\s*(?:doctors?|clinics?)|asthma\s*clinics?|pneumolog\w*)\b/i],
    categoryFamily: 'pulmonology',
    label: 'Pulmonologists & Chest Physicians',
    strictFilterRe: /(pulmon|chest|respirat|asthma|lung|pneumolog|sleep\s*apnea)/i,
    rejectRe: /(dental|dentist|eye\s*hospital|orthopedic|veterinary)/i,
    synonyms: { default: ['Pulmonologists', 'Chest & Respiratory Physicians', 'Asthma & Lung Clinics'] }
  },
  {
    key: 'psychiatrists',
    patterns: [/\b(psychiatr\w*|psycholog\w*|mental\s*health\s*(?:doctors?|clinics?)|neuropsychiatr\w*)\b/i],
    categoryFamily: 'psychiatry',
    label: 'Psychiatrists & Mental Health',
    strictFilterRe: /(psychiatr|psycholog|mental\s*health|counsel|behavioral|therapy|deaddiction)/i,
    rejectRe: /(dental|dentist|orthopedic|eye\s*hospital|veterinary)/i,
    synonyms: { default: ['Psychiatrists', 'Neuropsychiatry Clinics', 'Clinical Psychologists & Counseling Centers'] }
  },
  {
    key: 'physiotherapists',
    patterns: [/\b(physiotherap\w*|physical\s*therap\w*|chiropract\w*|osteopath\w*|kin[eé]sith[eé]rapeute\w*)\b/i],
    categoryFamily: 'physio',
    label: 'Physiotherapists & Rehab Centers',
    strictFilterRe: /(physio|physical\s*therap|rehab|chiropract|osteopath|kin[eé]|krankengymnastik|sports\s*injury)/i,
    rejectRe: /(dental|eye\s*hospital|veterinary|beauty\s*salon)/i,
    synonyms: {
      DE: ['Physiotherapie Praxen', 'Krankengymnastik & Reha', 'Osteopathie'],
      FR: ['Kinésithérapeutes', 'Ostéopathes & Rééducation'],
      default: ['Physiotherapy Clinics', 'Sports Rehab & Pain Centers', 'Chiropractors & Physical Therapy']
    }
  }
];

function getDoctorSubsByCountry(countryCode = 'IN') {
  const cc = String(countryCode || 'IN').toUpperCase();
  return DOCTOR_16_BY_COUNTRY[cc] || DOCTOR_16_BY_COUNTRY.default;
}

module.exports = { DOCTOR_16_BY_COUNTRY, SPECIALIST_NICHES, getDoctorSubsByCountry };
