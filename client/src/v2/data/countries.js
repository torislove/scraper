/**
 * countries.js — flag buttons for the dashboard. Generated from the same ISO
 * list as the server, so every country the backend can search is selectable.
 */

export function flagOf(code) {
  const value = String(code || '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(value)) return '🌍';
  return String.fromCodePoint(...[...value].map(char => 127397 + char.charCodeAt(0)));
}

export const COUNTRIES = [
  {
    "code": "AC",
    "name": "Ascension Island",
    "phone": "+247",
    "currency": ""
  },
  {
    "code": "AD",
    "name": "Andorra",
    "phone": "+376",
    "currency": ""
  },
  {
    "code": "AE",
    "name": "United Arab Emirates",
    "phone": "+971",
    "currency": "AED"
  },
  {
    "code": "AF",
    "name": "Afghanistan",
    "phone": "+93",
    "currency": ""
  },
  {
    "code": "AG",
    "name": "Antigua & Barbuda",
    "phone": "+1",
    "currency": ""
  },
  {
    "code": "AI",
    "name": "Anguilla",
    "phone": "+1",
    "currency": ""
  },
  {
    "code": "AL",
    "name": "Albania",
    "phone": "+355",
    "currency": ""
  },
  {
    "code": "AM",
    "name": "Armenia",
    "phone": "+374",
    "currency": ""
  },
  {
    "code": "AO",
    "name": "Angola",
    "phone": "+244",
    "currency": ""
  },
  {
    "code": "AR",
    "name": "Argentina",
    "phone": "+54",
    "currency": "ARS"
  },
  {
    "code": "AS",
    "name": "American Samoa",
    "phone": "+1",
    "currency": ""
  },
  {
    "code": "AT",
    "name": "Austria",
    "phone": "+43",
    "currency": "EUR"
  },
  {
    "code": "AU",
    "name": "Australia",
    "phone": "+61",
    "currency": "AUD"
  },
  {
    "code": "AW",
    "name": "Aruba",
    "phone": "+297",
    "currency": ""
  },
  {
    "code": "AX",
    "name": "Åland Islands",
    "phone": "+358",
    "currency": ""
  },
  {
    "code": "AZ",
    "name": "Azerbaijan",
    "phone": "+994",
    "currency": ""
  },
  {
    "code": "BA",
    "name": "Bosnia & Herzegovina",
    "phone": "+387",
    "currency": ""
  },
  {
    "code": "BB",
    "name": "Barbados",
    "phone": "+1",
    "currency": ""
  },
  {
    "code": "BD",
    "name": "Bangladesh",
    "phone": "+880",
    "currency": "BDT"
  },
  {
    "code": "BE",
    "name": "Belgium",
    "phone": "+32",
    "currency": "EUR"
  },
  {
    "code": "BF",
    "name": "Burkina Faso",
    "phone": "+226",
    "currency": ""
  },
  {
    "code": "BG",
    "name": "Bulgaria",
    "phone": "+359",
    "currency": "BGN"
  },
  {
    "code": "BH",
    "name": "Bahrain",
    "phone": "+973",
    "currency": "BHD"
  },
  {
    "code": "BI",
    "name": "Burundi",
    "phone": "+257",
    "currency": ""
  },
  {
    "code": "BJ",
    "name": "Benin",
    "phone": "+229",
    "currency": ""
  },
  {
    "code": "BL",
    "name": "St. Barthélemy",
    "phone": "+590",
    "currency": ""
  },
  {
    "code": "BM",
    "name": "Bermuda",
    "phone": "+1",
    "currency": ""
  },
  {
    "code": "BN",
    "name": "Brunei",
    "phone": "+673",
    "currency": ""
  },
  {
    "code": "BO",
    "name": "Bolivia",
    "phone": "+591",
    "currency": ""
  },
  {
    "code": "BQ",
    "name": "Caribbean Netherlands",
    "phone": "+599",
    "currency": ""
  },
  {
    "code": "BR",
    "name": "Brazil",
    "phone": "+55",
    "currency": "BRL"
  },
  {
    "code": "BS",
    "name": "Bahamas",
    "phone": "+1",
    "currency": ""
  },
  {
    "code": "BT",
    "name": "Bhutan",
    "phone": "+975",
    "currency": ""
  },
  {
    "code": "BW",
    "name": "Botswana",
    "phone": "+267",
    "currency": ""
  },
  {
    "code": "BY",
    "name": "Belarus",
    "phone": "+375",
    "currency": ""
  },
  {
    "code": "BZ",
    "name": "Belize",
    "phone": "+501",
    "currency": ""
  },
  {
    "code": "CA",
    "name": "Canada",
    "phone": "+1",
    "currency": "CAD"
  },
  {
    "code": "CC",
    "name": "Cocos (Keeling) Islands",
    "phone": "+61",
    "currency": ""
  },
  {
    "code": "CD",
    "name": "Congo - Kinshasa",
    "phone": "+243",
    "currency": ""
  },
  {
    "code": "CF",
    "name": "Central African Republic",
    "phone": "+236",
    "currency": ""
  },
  {
    "code": "CG",
    "name": "Congo - Brazzaville",
    "phone": "+242",
    "currency": ""
  },
  {
    "code": "CH",
    "name": "Switzerland",
    "phone": "+41",
    "currency": "CHF"
  },
  {
    "code": "CI",
    "name": "Côte d’Ivoire",
    "phone": "+225",
    "currency": ""
  },
  {
    "code": "CK",
    "name": "Cook Islands",
    "phone": "+682",
    "currency": ""
  },
  {
    "code": "CL",
    "name": "Chile",
    "phone": "+56",
    "currency": "CLP"
  },
  {
    "code": "CM",
    "name": "Cameroon",
    "phone": "+237",
    "currency": ""
  },
  {
    "code": "CN",
    "name": "China",
    "phone": "+86",
    "currency": "CNY"
  },
  {
    "code": "CO",
    "name": "Colombia",
    "phone": "+57",
    "currency": "COP"
  },
  {
    "code": "CR",
    "name": "Costa Rica",
    "phone": "+506",
    "currency": ""
  },
  {
    "code": "CU",
    "name": "Cuba",
    "phone": "+53",
    "currency": ""
  },
  {
    "code": "CV",
    "name": "Cape Verde",
    "phone": "+238",
    "currency": ""
  },
  {
    "code": "CW",
    "name": "Curaçao",
    "phone": "+599",
    "currency": ""
  },
  {
    "code": "CX",
    "name": "Christmas Island",
    "phone": "+61",
    "currency": ""
  },
  {
    "code": "CY",
    "name": "Cyprus",
    "phone": "+357",
    "currency": "EUR"
  },
  {
    "code": "CZ",
    "name": "Czechia",
    "phone": "+420",
    "currency": "CZK"
  },
  {
    "code": "DE",
    "name": "Germany",
    "phone": "+49",
    "currency": "EUR"
  },
  {
    "code": "DJ",
    "name": "Djibouti",
    "phone": "+253",
    "currency": ""
  },
  {
    "code": "DK",
    "name": "Denmark",
    "phone": "+45",
    "currency": "DKK"
  },
  {
    "code": "DM",
    "name": "Dominica",
    "phone": "+1",
    "currency": ""
  },
  {
    "code": "DO",
    "name": "Dominican Republic",
    "phone": "+1",
    "currency": ""
  },
  {
    "code": "DZ",
    "name": "Algeria",
    "phone": "+213",
    "currency": ""
  },
  {
    "code": "EC",
    "name": "Ecuador",
    "phone": "+593",
    "currency": ""
  },
  {
    "code": "EE",
    "name": "Estonia",
    "phone": "+372",
    "currency": "EUR"
  },
  {
    "code": "EG",
    "name": "Egypt",
    "phone": "+20",
    "currency": "EGP"
  },
  {
    "code": "EH",
    "name": "Western Sahara",
    "phone": "+212",
    "currency": ""
  },
  {
    "code": "ER",
    "name": "Eritrea",
    "phone": "+291",
    "currency": ""
  },
  {
    "code": "ES",
    "name": "Spain",
    "phone": "+34",
    "currency": "EUR"
  },
  {
    "code": "ET",
    "name": "Ethiopia",
    "phone": "+251",
    "currency": ""
  },
  {
    "code": "FI",
    "name": "Finland",
    "phone": "+358",
    "currency": "EUR"
  },
  {
    "code": "FJ",
    "name": "Fiji",
    "phone": "+679",
    "currency": ""
  },
  {
    "code": "FK",
    "name": "Falkland Islands",
    "phone": "+500",
    "currency": ""
  },
  {
    "code": "FM",
    "name": "Micronesia",
    "phone": "+691",
    "currency": ""
  },
  {
    "code": "FO",
    "name": "Faroe Islands",
    "phone": "+298",
    "currency": ""
  },
  {
    "code": "FR",
    "name": "France",
    "phone": "+33",
    "currency": "EUR"
  },
  {
    "code": "GA",
    "name": "Gabon",
    "phone": "+241",
    "currency": ""
  },
  {
    "code": "GB",
    "name": "United Kingdom",
    "phone": "+44",
    "currency": "GBP"
  },
  {
    "code": "GD",
    "name": "Grenada",
    "phone": "+1",
    "currency": ""
  },
  {
    "code": "GE",
    "name": "Georgia",
    "phone": "+995",
    "currency": ""
  },
  {
    "code": "GF",
    "name": "French Guiana",
    "phone": "+594",
    "currency": ""
  },
  {
    "code": "GG",
    "name": "Guernsey",
    "phone": "+44",
    "currency": ""
  },
  {
    "code": "GH",
    "name": "Ghana",
    "phone": "+233",
    "currency": "GHS"
  },
  {
    "code": "GI",
    "name": "Gibraltar",
    "phone": "+350",
    "currency": ""
  },
  {
    "code": "GL",
    "name": "Greenland",
    "phone": "+299",
    "currency": ""
  },
  {
    "code": "GM",
    "name": "Gambia",
    "phone": "+220",
    "currency": ""
  },
  {
    "code": "GN",
    "name": "Guinea",
    "phone": "+224",
    "currency": ""
  },
  {
    "code": "GP",
    "name": "Guadeloupe",
    "phone": "+590",
    "currency": ""
  },
  {
    "code": "GQ",
    "name": "Equatorial Guinea",
    "phone": "+240",
    "currency": ""
  },
  {
    "code": "GR",
    "name": "Greece",
    "phone": "+30",
    "currency": "EUR"
  },
  {
    "code": "GT",
    "name": "Guatemala",
    "phone": "+502",
    "currency": ""
  },
  {
    "code": "GU",
    "name": "Guam",
    "phone": "+1",
    "currency": ""
  },
  {
    "code": "GW",
    "name": "Guinea-Bissau",
    "phone": "+245",
    "currency": ""
  },
  {
    "code": "GY",
    "name": "Guyana",
    "phone": "+592",
    "currency": ""
  },
  {
    "code": "HK",
    "name": "Hong Kong SAR China",
    "phone": "+852",
    "currency": "HKD"
  },
  {
    "code": "HN",
    "name": "Honduras",
    "phone": "+504",
    "currency": ""
  },
  {
    "code": "HR",
    "name": "Croatia",
    "phone": "+385",
    "currency": "EUR"
  },
  {
    "code": "HT",
    "name": "Haiti",
    "phone": "+509",
    "currency": ""
  },
  {
    "code": "HU",
    "name": "Hungary",
    "phone": "+36",
    "currency": "HUF"
  },
  {
    "code": "ID",
    "name": "Indonesia",
    "phone": "+62",
    "currency": "IDR"
  },
  {
    "code": "IE",
    "name": "Ireland",
    "phone": "+353",
    "currency": "EUR"
  },
  {
    "code": "IL",
    "name": "Israel",
    "phone": "+972",
    "currency": "ILS"
  },
  {
    "code": "IM",
    "name": "Isle of Man",
    "phone": "+44",
    "currency": ""
  },
  {
    "code": "IN",
    "name": "India",
    "phone": "+91",
    "currency": "INR"
  },
  {
    "code": "IO",
    "name": "British Indian Ocean Territory",
    "phone": "+246",
    "currency": ""
  },
  {
    "code": "IQ",
    "name": "Iraq",
    "phone": "+964",
    "currency": ""
  },
  {
    "code": "IR",
    "name": "Iran",
    "phone": "+98",
    "currency": ""
  },
  {
    "code": "IS",
    "name": "Iceland",
    "phone": "+354",
    "currency": "ISK"
  },
  {
    "code": "IT",
    "name": "Italy",
    "phone": "+39",
    "currency": "EUR"
  },
  {
    "code": "JE",
    "name": "Jersey",
    "phone": "+44",
    "currency": ""
  },
  {
    "code": "JM",
    "name": "Jamaica",
    "phone": "+1",
    "currency": ""
  },
  {
    "code": "JO",
    "name": "Jordan",
    "phone": "+962",
    "currency": "JOD"
  },
  {
    "code": "JP",
    "name": "Japan",
    "phone": "+81",
    "currency": "JPY"
  },
  {
    "code": "KE",
    "name": "Kenya",
    "phone": "+254",
    "currency": "KES"
  },
  {
    "code": "KG",
    "name": "Kyrgyzstan",
    "phone": "+996",
    "currency": ""
  },
  {
    "code": "KH",
    "name": "Cambodia",
    "phone": "+855",
    "currency": ""
  },
  {
    "code": "KI",
    "name": "Kiribati",
    "phone": "+686",
    "currency": ""
  },
  {
    "code": "KM",
    "name": "Comoros",
    "phone": "+269",
    "currency": ""
  },
  {
    "code": "KN",
    "name": "St. Kitts & Nevis",
    "phone": "+1",
    "currency": ""
  },
  {
    "code": "KP",
    "name": "North Korea",
    "phone": "+850",
    "currency": ""
  },
  {
    "code": "KR",
    "name": "South Korea",
    "phone": "+82",
    "currency": "KRW"
  },
  {
    "code": "KW",
    "name": "Kuwait",
    "phone": "+965",
    "currency": "KWD"
  },
  {
    "code": "KY",
    "name": "Cayman Islands",
    "phone": "+1",
    "currency": ""
  },
  {
    "code": "KZ",
    "name": "Kazakhstan",
    "phone": "+7",
    "currency": ""
  },
  {
    "code": "LA",
    "name": "Laos",
    "phone": "+856",
    "currency": ""
  },
  {
    "code": "LB",
    "name": "Lebanon",
    "phone": "+961",
    "currency": "LBP"
  },
  {
    "code": "LC",
    "name": "St. Lucia",
    "phone": "+1",
    "currency": ""
  },
  {
    "code": "LI",
    "name": "Liechtenstein",
    "phone": "+423",
    "currency": ""
  },
  {
    "code": "LK",
    "name": "Sri Lanka",
    "phone": "+94",
    "currency": "LKR"
  },
  {
    "code": "LR",
    "name": "Liberia",
    "phone": "+231",
    "currency": ""
  },
  {
    "code": "LS",
    "name": "Lesotho",
    "phone": "+266",
    "currency": ""
  },
  {
    "code": "LT",
    "name": "Lithuania",
    "phone": "+370",
    "currency": "EUR"
  },
  {
    "code": "LU",
    "name": "Luxembourg",
    "phone": "+352",
    "currency": ""
  },
  {
    "code": "LV",
    "name": "Latvia",
    "phone": "+371",
    "currency": "EUR"
  },
  {
    "code": "LY",
    "name": "Libya",
    "phone": "+218",
    "currency": ""
  },
  {
    "code": "MA",
    "name": "Morocco",
    "phone": "+212",
    "currency": "MAD"
  },
  {
    "code": "MC",
    "name": "Monaco",
    "phone": "+377",
    "currency": ""
  },
  {
    "code": "MD",
    "name": "Moldova",
    "phone": "+373",
    "currency": ""
  },
  {
    "code": "ME",
    "name": "Montenegro",
    "phone": "+382",
    "currency": ""
  },
  {
    "code": "MF",
    "name": "St. Martin",
    "phone": "+590",
    "currency": ""
  },
  {
    "code": "MG",
    "name": "Madagascar",
    "phone": "+261",
    "currency": ""
  },
  {
    "code": "MH",
    "name": "Marshall Islands",
    "phone": "+692",
    "currency": ""
  },
  {
    "code": "MK",
    "name": "North Macedonia",
    "phone": "+389",
    "currency": ""
  },
  {
    "code": "ML",
    "name": "Mali",
    "phone": "+223",
    "currency": ""
  },
  {
    "code": "MM",
    "name": "Myanmar (Burma)",
    "phone": "+95",
    "currency": ""
  },
  {
    "code": "MN",
    "name": "Mongolia",
    "phone": "+976",
    "currency": ""
  },
  {
    "code": "MO",
    "name": "Macao SAR China",
    "phone": "+853",
    "currency": ""
  },
  {
    "code": "MP",
    "name": "Northern Mariana Islands",
    "phone": "+1",
    "currency": ""
  },
  {
    "code": "MQ",
    "name": "Martinique",
    "phone": "+596",
    "currency": ""
  },
  {
    "code": "MR",
    "name": "Mauritania",
    "phone": "+222",
    "currency": ""
  },
  {
    "code": "MS",
    "name": "Montserrat",
    "phone": "+1",
    "currency": ""
  },
  {
    "code": "MT",
    "name": "Malta",
    "phone": "+356",
    "currency": "EUR"
  },
  {
    "code": "MU",
    "name": "Mauritius",
    "phone": "+230",
    "currency": ""
  },
  {
    "code": "MV",
    "name": "Maldives",
    "phone": "+960",
    "currency": ""
  },
  {
    "code": "MW",
    "name": "Malawi",
    "phone": "+265",
    "currency": ""
  },
  {
    "code": "MX",
    "name": "Mexico",
    "phone": "+52",
    "currency": "MXN"
  },
  {
    "code": "MY",
    "name": "Malaysia",
    "phone": "+60",
    "currency": "MYR"
  },
  {
    "code": "MZ",
    "name": "Mozambique",
    "phone": "+258",
    "currency": ""
  },
  {
    "code": "NA",
    "name": "Namibia",
    "phone": "+264",
    "currency": ""
  },
  {
    "code": "NC",
    "name": "New Caledonia",
    "phone": "+687",
    "currency": ""
  },
  {
    "code": "NE",
    "name": "Niger",
    "phone": "+227",
    "currency": ""
  },
  {
    "code": "NF",
    "name": "Norfolk Island",
    "phone": "+672",
    "currency": ""
  },
  {
    "code": "NG",
    "name": "Nigeria",
    "phone": "+234",
    "currency": "NGN"
  },
  {
    "code": "NI",
    "name": "Nicaragua",
    "phone": "+505",
    "currency": ""
  },
  {
    "code": "NL",
    "name": "Netherlands",
    "phone": "+31",
    "currency": "EUR"
  },
  {
    "code": "NO",
    "name": "Norway",
    "phone": "+47",
    "currency": "NOK"
  },
  {
    "code": "NP",
    "name": "Nepal",
    "phone": "+977",
    "currency": "NPR"
  },
  {
    "code": "NR",
    "name": "Nauru",
    "phone": "+674",
    "currency": ""
  },
  {
    "code": "NU",
    "name": "Niue",
    "phone": "+683",
    "currency": ""
  },
  {
    "code": "NZ",
    "name": "New Zealand",
    "phone": "+64",
    "currency": "NZD"
  },
  {
    "code": "OM",
    "name": "Oman",
    "phone": "+968",
    "currency": "OMR"
  },
  {
    "code": "PA",
    "name": "Panama",
    "phone": "+507",
    "currency": ""
  },
  {
    "code": "PE",
    "name": "Peru",
    "phone": "+51",
    "currency": "PEN"
  },
  {
    "code": "PF",
    "name": "French Polynesia",
    "phone": "+689",
    "currency": ""
  },
  {
    "code": "PG",
    "name": "Papua New Guinea",
    "phone": "+675",
    "currency": ""
  },
  {
    "code": "PH",
    "name": "Philippines",
    "phone": "+63",
    "currency": "PHP"
  },
  {
    "code": "PK",
    "name": "Pakistan",
    "phone": "+92",
    "currency": "PKR"
  },
  {
    "code": "PL",
    "name": "Poland",
    "phone": "+48",
    "currency": "PLN"
  },
  {
    "code": "PM",
    "name": "St. Pierre & Miquelon",
    "phone": "+508",
    "currency": ""
  },
  {
    "code": "PR",
    "name": "Puerto Rico",
    "phone": "+1",
    "currency": ""
  },
  {
    "code": "PS",
    "name": "Palestinian Territories",
    "phone": "+970",
    "currency": ""
  },
  {
    "code": "PT",
    "name": "Portugal",
    "phone": "+351",
    "currency": "EUR"
  },
  {
    "code": "PW",
    "name": "Palau",
    "phone": "+680",
    "currency": ""
  },
  {
    "code": "PY",
    "name": "Paraguay",
    "phone": "+595",
    "currency": ""
  },
  {
    "code": "QA",
    "name": "Qatar",
    "phone": "+974",
    "currency": "QAR"
  },
  {
    "code": "RE",
    "name": "Réunion",
    "phone": "+262",
    "currency": ""
  },
  {
    "code": "RO",
    "name": "Romania",
    "phone": "+40",
    "currency": "RON"
  },
  {
    "code": "RS",
    "name": "Serbia",
    "phone": "+381",
    "currency": "RSD"
  },
  {
    "code": "RU",
    "name": "Russia",
    "phone": "+7",
    "currency": "RUB"
  },
  {
    "code": "RW",
    "name": "Rwanda",
    "phone": "+250",
    "currency": ""
  },
  {
    "code": "SA",
    "name": "Saudi Arabia",
    "phone": "+966",
    "currency": "SAR"
  },
  {
    "code": "SB",
    "name": "Solomon Islands",
    "phone": "+677",
    "currency": ""
  },
  {
    "code": "SC",
    "name": "Seychelles",
    "phone": "+248",
    "currency": ""
  },
  {
    "code": "SD",
    "name": "Sudan",
    "phone": "+249",
    "currency": ""
  },
  {
    "code": "SE",
    "name": "Sweden",
    "phone": "+46",
    "currency": "SEK"
  },
  {
    "code": "SG",
    "name": "Singapore",
    "phone": "+65",
    "currency": "SGD"
  },
  {
    "code": "SH",
    "name": "St. Helena",
    "phone": "+290",
    "currency": ""
  },
  {
    "code": "SI",
    "name": "Slovenia",
    "phone": "+386",
    "currency": "EUR"
  },
  {
    "code": "SJ",
    "name": "Svalbard & Jan Mayen",
    "phone": "+47",
    "currency": ""
  },
  {
    "code": "SK",
    "name": "Slovakia",
    "phone": "+421",
    "currency": "EUR"
  },
  {
    "code": "SL",
    "name": "Sierra Leone",
    "phone": "+232",
    "currency": ""
  },
  {
    "code": "SM",
    "name": "San Marino",
    "phone": "+378",
    "currency": ""
  },
  {
    "code": "SN",
    "name": "Senegal",
    "phone": "+221",
    "currency": ""
  },
  {
    "code": "SO",
    "name": "Somalia",
    "phone": "+252",
    "currency": ""
  },
  {
    "code": "SR",
    "name": "Suriname",
    "phone": "+597",
    "currency": ""
  },
  {
    "code": "SS",
    "name": "South Sudan",
    "phone": "+211",
    "currency": ""
  },
  {
    "code": "ST",
    "name": "São Tomé & Príncipe",
    "phone": "+239",
    "currency": ""
  },
  {
    "code": "SV",
    "name": "El Salvador",
    "phone": "+503",
    "currency": ""
  },
  {
    "code": "SX",
    "name": "Sint Maarten",
    "phone": "+1",
    "currency": ""
  },
  {
    "code": "SY",
    "name": "Syria",
    "phone": "+963",
    "currency": ""
  },
  {
    "code": "SZ",
    "name": "Eswatini",
    "phone": "+268",
    "currency": ""
  },
  {
    "code": "TA",
    "name": "Tristan da Cunha",
    "phone": "+290",
    "currency": ""
  },
  {
    "code": "TC",
    "name": "Turks & Caicos Islands",
    "phone": "+1",
    "currency": ""
  },
  {
    "code": "TD",
    "name": "Chad",
    "phone": "+235",
    "currency": ""
  },
  {
    "code": "TG",
    "name": "Togo",
    "phone": "+228",
    "currency": ""
  },
  {
    "code": "TH",
    "name": "Thailand",
    "phone": "+66",
    "currency": "THB"
  },
  {
    "code": "TJ",
    "name": "Tajikistan",
    "phone": "+992",
    "currency": ""
  },
  {
    "code": "TK",
    "name": "Tokelau",
    "phone": "+690",
    "currency": ""
  },
  {
    "code": "TL",
    "name": "Timor-Leste",
    "phone": "+670",
    "currency": ""
  },
  {
    "code": "TM",
    "name": "Turkmenistan",
    "phone": "+993",
    "currency": ""
  },
  {
    "code": "TN",
    "name": "Tunisia",
    "phone": "+216",
    "currency": ""
  },
  {
    "code": "TO",
    "name": "Tonga",
    "phone": "+676",
    "currency": ""
  },
  {
    "code": "TR",
    "name": "Türkiye",
    "phone": "+90",
    "currency": "TRY"
  },
  {
    "code": "TT",
    "name": "Trinidad & Tobago",
    "phone": "+1",
    "currency": ""
  },
  {
    "code": "TV",
    "name": "Tuvalu",
    "phone": "+688",
    "currency": ""
  },
  {
    "code": "TW",
    "name": "Taiwan",
    "phone": "+886",
    "currency": "TWD"
  },
  {
    "code": "TZ",
    "name": "Tanzania",
    "phone": "+255",
    "currency": ""
  },
  {
    "code": "UA",
    "name": "Ukraine",
    "phone": "+380",
    "currency": "UAH"
  },
  {
    "code": "UG",
    "name": "Uganda",
    "phone": "+256",
    "currency": ""
  },
  {
    "code": "US",
    "name": "United States",
    "phone": "+1",
    "currency": "USD"
  },
  {
    "code": "UY",
    "name": "Uruguay",
    "phone": "+598",
    "currency": ""
  },
  {
    "code": "UZ",
    "name": "Uzbekistan",
    "phone": "+998",
    "currency": ""
  },
  {
    "code": "VA",
    "name": "Vatican City",
    "phone": "+39",
    "currency": ""
  },
  {
    "code": "VC",
    "name": "St. Vincent & Grenadines",
    "phone": "+1",
    "currency": ""
  },
  {
    "code": "VE",
    "name": "Venezuela",
    "phone": "+58",
    "currency": ""
  },
  {
    "code": "VG",
    "name": "British Virgin Islands",
    "phone": "+1",
    "currency": ""
  },
  {
    "code": "VI",
    "name": "U.S. Virgin Islands",
    "phone": "+1",
    "currency": ""
  },
  {
    "code": "VN",
    "name": "Vietnam",
    "phone": "+84",
    "currency": "VND"
  },
  {
    "code": "VU",
    "name": "Vanuatu",
    "phone": "+678",
    "currency": ""
  },
  {
    "code": "WF",
    "name": "Wallis & Futuna",
    "phone": "+681",
    "currency": ""
  },
  {
    "code": "WS",
    "name": "Samoa",
    "phone": "+685",
    "currency": ""
  },
  {
    "code": "XK",
    "name": "Kosovo",
    "phone": "+383",
    "currency": ""
  },
  {
    "code": "YE",
    "name": "Yemen",
    "phone": "+967",
    "currency": ""
  },
  {
    "code": "YT",
    "name": "Mayotte",
    "phone": "+262",
    "currency": ""
  },
  {
    "code": "ZA",
    "name": "South Africa",
    "phone": "+27",
    "currency": "ZAR"
  },
  {
    "code": "ZM",
    "name": "Zambia",
    "phone": "+260",
    "currency": ""
  },
  {
    "code": "ZW",
    "name": "Zimbabwe",
    "phone": "+263",
    "currency": ""
  }
];

// The eleven markets the product ships with. India is Home; the other ten are
// the featured revenue markets with their own local directories and phone
// rules. The backend can still search every ISO country, but the UI offers
// exactly these eleven.
export const POPULAR_CODES = ['IN', 'US', 'GB', 'CA', 'AU', 'AE', 'SG', 'NZ', 'ZA', 'IE', 'DE'];
export const MONETIZATION_CODES = POPULAR_CODES;
export const FEATURED_CODES = POPULAR_CODES;

export const POPULAR_COUNTRIES = POPULAR_CODES
  .map(code => COUNTRIES.find(country => country.code === code))
  .filter(Boolean);

export function findCountry(code) {
  const value = String(code || '').toUpperCase();
  return COUNTRIES.find(country => country.code === value) || null;
}
