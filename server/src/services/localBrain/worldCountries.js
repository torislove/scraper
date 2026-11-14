/**
 * worldCountries.js — every ISO 3166-1 country, offline.
 *
 * The keyless engines (OpenStreetMap, public Maps results, web discovery) work
 * anywhere. This file makes the rest of the app agree: country detection, the
 * country picker and the coverage report all understand the full world, not
 * only the sixteen countries with hand-written profiles.
 *
 * Generated data; keep it in sync with libphonenumber's country list. The
 * curated profiles in countries.js still win for India and the other major
 * markets because they carry real region names.
 */

const WORLD_COUNTRIES = [
  {
    "code": "AC",
    "name": "Ascension Island",
    "currency": "",
    "phone": "+247",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "AD",
    "name": "Andorra",
    "currency": "",
    "phone": "+376",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "AE",
    "name": "United Arab Emirates",
    "currency": "AED",
    "phone": "+971",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "AF",
    "name": "Afghanistan",
    "currency": "",
    "phone": "+93",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "AG",
    "name": "Antigua & Barbuda",
    "currency": "",
    "phone": "+1",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "AI",
    "name": "Anguilla",
    "currency": "",
    "phone": "+1",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "AL",
    "name": "Albania",
    "currency": "",
    "phone": "+355",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "AM",
    "name": "Armenia",
    "currency": "",
    "phone": "+374",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "AO",
    "name": "Angola",
    "currency": "",
    "phone": "+244",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "AR",
    "name": "Argentina",
    "currency": "ARS",
    "phone": "+54",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "AS",
    "name": "American Samoa",
    "currency": "",
    "phone": "+1",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "AT",
    "name": "Austria",
    "currency": "EUR",
    "phone": "+43",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "AU",
    "name": "Australia",
    "currency": "AUD",
    "phone": "+61",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "AW",
    "name": "Aruba",
    "currency": "",
    "phone": "+297",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "AX",
    "name": "Åland Islands",
    "currency": "",
    "phone": "+358",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "AZ",
    "name": "Azerbaijan",
    "currency": "",
    "phone": "+994",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "BA",
    "name": "Bosnia & Herzegovina",
    "currency": "",
    "phone": "+387",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "BB",
    "name": "Barbados",
    "currency": "",
    "phone": "+1",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "BD",
    "name": "Bangladesh",
    "currency": "BDT",
    "phone": "+880",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "BE",
    "name": "Belgium",
    "currency": "EUR",
    "phone": "+32",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "BF",
    "name": "Burkina Faso",
    "currency": "",
    "phone": "+226",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "BG",
    "name": "Bulgaria",
    "currency": "BGN",
    "phone": "+359",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "BH",
    "name": "Bahrain",
    "currency": "BHD",
    "phone": "+973",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "BI",
    "name": "Burundi",
    "currency": "",
    "phone": "+257",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "BJ",
    "name": "Benin",
    "currency": "",
    "phone": "+229",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "BL",
    "name": "St. Barthélemy",
    "currency": "",
    "phone": "+590",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "BM",
    "name": "Bermuda",
    "currency": "",
    "phone": "+1",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "BN",
    "name": "Brunei",
    "currency": "",
    "phone": "+673",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "BO",
    "name": "Bolivia",
    "currency": "",
    "phone": "+591",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "BQ",
    "name": "Caribbean Netherlands",
    "currency": "",
    "phone": "+599",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "BR",
    "name": "Brazil",
    "currency": "BRL",
    "phone": "+55",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "BS",
    "name": "Bahamas",
    "currency": "",
    "phone": "+1",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "BT",
    "name": "Bhutan",
    "currency": "",
    "phone": "+975",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "BW",
    "name": "Botswana",
    "currency": "",
    "phone": "+267",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "BY",
    "name": "Belarus",
    "currency": "",
    "phone": "+375",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "BZ",
    "name": "Belize",
    "currency": "",
    "phone": "+501",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "CA",
    "name": "Canada",
    "currency": "CAD",
    "phone": "+1",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "CC",
    "name": "Cocos (Keeling) Islands",
    "currency": "",
    "phone": "+61",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "CD",
    "name": "Congo - Kinshasa",
    "currency": "",
    "phone": "+243",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "CF",
    "name": "Central African Republic",
    "currency": "",
    "phone": "+236",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "CG",
    "name": "Congo - Brazzaville",
    "currency": "",
    "phone": "+242",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "CH",
    "name": "Switzerland",
    "currency": "CHF",
    "phone": "+41",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "CI",
    "name": "Côte d’Ivoire",
    "currency": "",
    "phone": "+225",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "CK",
    "name": "Cook Islands",
    "currency": "",
    "phone": "+682",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "CL",
    "name": "Chile",
    "currency": "CLP",
    "phone": "+56",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "CM",
    "name": "Cameroon",
    "currency": "",
    "phone": "+237",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "CN",
    "name": "China",
    "currency": "CNY",
    "phone": "+86",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "CO",
    "name": "Colombia",
    "currency": "COP",
    "phone": "+57",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "CR",
    "name": "Costa Rica",
    "currency": "",
    "phone": "+506",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "CU",
    "name": "Cuba",
    "currency": "",
    "phone": "+53",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "CV",
    "name": "Cape Verde",
    "currency": "",
    "phone": "+238",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "CW",
    "name": "Curaçao",
    "currency": "",
    "phone": "+599",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "CX",
    "name": "Christmas Island",
    "currency": "",
    "phone": "+61",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "CY",
    "name": "Cyprus",
    "currency": "EUR",
    "phone": "+357",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "CZ",
    "name": "Czechia",
    "currency": "CZK",
    "phone": "+420",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "DE",
    "name": "Germany",
    "currency": "EUR",
    "phone": "+49",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "DJ",
    "name": "Djibouti",
    "currency": "",
    "phone": "+253",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "DK",
    "name": "Denmark",
    "currency": "DKK",
    "phone": "+45",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "DM",
    "name": "Dominica",
    "currency": "",
    "phone": "+1",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "DO",
    "name": "Dominican Republic",
    "currency": "",
    "phone": "+1",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "DZ",
    "name": "Algeria",
    "currency": "",
    "phone": "+213",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "EC",
    "name": "Ecuador",
    "currency": "",
    "phone": "+593",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "EE",
    "name": "Estonia",
    "currency": "EUR",
    "phone": "+372",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "EG",
    "name": "Egypt",
    "currency": "EGP",
    "phone": "+20",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "EH",
    "name": "Western Sahara",
    "currency": "",
    "phone": "+212",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "ER",
    "name": "Eritrea",
    "currency": "",
    "phone": "+291",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "ES",
    "name": "Spain",
    "currency": "EUR",
    "phone": "+34",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "ET",
    "name": "Ethiopia",
    "currency": "",
    "phone": "+251",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "FI",
    "name": "Finland",
    "currency": "EUR",
    "phone": "+358",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "FJ",
    "name": "Fiji",
    "currency": "",
    "phone": "+679",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "FK",
    "name": "Falkland Islands",
    "currency": "",
    "phone": "+500",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "FM",
    "name": "Micronesia",
    "currency": "",
    "phone": "+691",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "FO",
    "name": "Faroe Islands",
    "currency": "",
    "phone": "+298",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "FR",
    "name": "France",
    "currency": "EUR",
    "phone": "+33",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "GA",
    "name": "Gabon",
    "currency": "",
    "phone": "+241",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "GB",
    "name": "United Kingdom",
    "currency": "GBP",
    "phone": "+44",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "GD",
    "name": "Grenada",
    "currency": "",
    "phone": "+1",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "GE",
    "name": "Georgia",
    "currency": "",
    "phone": "+995",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "GF",
    "name": "French Guiana",
    "currency": "",
    "phone": "+594",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "GG",
    "name": "Guernsey",
    "currency": "",
    "phone": "+44",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "GH",
    "name": "Ghana",
    "currency": "GHS",
    "phone": "+233",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "GI",
    "name": "Gibraltar",
    "currency": "",
    "phone": "+350",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "GL",
    "name": "Greenland",
    "currency": "",
    "phone": "+299",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "GM",
    "name": "Gambia",
    "currency": "",
    "phone": "+220",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "GN",
    "name": "Guinea",
    "currency": "",
    "phone": "+224",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "GP",
    "name": "Guadeloupe",
    "currency": "",
    "phone": "+590",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "GQ",
    "name": "Equatorial Guinea",
    "currency": "",
    "phone": "+240",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "GR",
    "name": "Greece",
    "currency": "EUR",
    "phone": "+30",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "GT",
    "name": "Guatemala",
    "currency": "",
    "phone": "+502",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "GU",
    "name": "Guam",
    "currency": "",
    "phone": "+1",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "GW",
    "name": "Guinea-Bissau",
    "currency": "",
    "phone": "+245",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "GY",
    "name": "Guyana",
    "currency": "",
    "phone": "+592",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "HK",
    "name": "Hong Kong SAR China",
    "currency": "HKD",
    "phone": "+852",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "HN",
    "name": "Honduras",
    "currency": "",
    "phone": "+504",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "HR",
    "name": "Croatia",
    "currency": "EUR",
    "phone": "+385",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "HT",
    "name": "Haiti",
    "currency": "",
    "phone": "+509",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "HU",
    "name": "Hungary",
    "currency": "HUF",
    "phone": "+36",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "ID",
    "name": "Indonesia",
    "currency": "IDR",
    "phone": "+62",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "IE",
    "name": "Ireland",
    "currency": "EUR",
    "phone": "+353",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "IL",
    "name": "Israel",
    "currency": "ILS",
    "phone": "+972",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "IM",
    "name": "Isle of Man",
    "currency": "",
    "phone": "+44",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "IN",
    "name": "India",
    "currency": "INR",
    "phone": "+91",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "IO",
    "name": "British Indian Ocean Territory",
    "currency": "",
    "phone": "+246",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "IQ",
    "name": "Iraq",
    "currency": "",
    "phone": "+964",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "IR",
    "name": "Iran",
    "currency": "",
    "phone": "+98",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "IS",
    "name": "Iceland",
    "currency": "ISK",
    "phone": "+354",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "IT",
    "name": "Italy",
    "currency": "EUR",
    "phone": "+39",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "JE",
    "name": "Jersey",
    "currency": "",
    "phone": "+44",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "JM",
    "name": "Jamaica",
    "currency": "",
    "phone": "+1",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "JO",
    "name": "Jordan",
    "currency": "JOD",
    "phone": "+962",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "JP",
    "name": "Japan",
    "currency": "JPY",
    "phone": "+81",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "KE",
    "name": "Kenya",
    "currency": "KES",
    "phone": "+254",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "KG",
    "name": "Kyrgyzstan",
    "currency": "",
    "phone": "+996",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "KH",
    "name": "Cambodia",
    "currency": "",
    "phone": "+855",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "KI",
    "name": "Kiribati",
    "currency": "",
    "phone": "+686",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "KM",
    "name": "Comoros",
    "currency": "",
    "phone": "+269",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "KN",
    "name": "St. Kitts & Nevis",
    "currency": "",
    "phone": "+1",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "KP",
    "name": "North Korea",
    "currency": "",
    "phone": "+850",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "KR",
    "name": "South Korea",
    "currency": "KRW",
    "phone": "+82",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "KW",
    "name": "Kuwait",
    "currency": "KWD",
    "phone": "+965",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "KY",
    "name": "Cayman Islands",
    "currency": "",
    "phone": "+1",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "KZ",
    "name": "Kazakhstan",
    "currency": "",
    "phone": "+7",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "LA",
    "name": "Laos",
    "currency": "",
    "phone": "+856",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "LB",
    "name": "Lebanon",
    "currency": "LBP",
    "phone": "+961",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "LC",
    "name": "St. Lucia",
    "currency": "",
    "phone": "+1",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "LI",
    "name": "Liechtenstein",
    "currency": "",
    "phone": "+423",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "LK",
    "name": "Sri Lanka",
    "currency": "LKR",
    "phone": "+94",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "LR",
    "name": "Liberia",
    "currency": "",
    "phone": "+231",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "LS",
    "name": "Lesotho",
    "currency": "",
    "phone": "+266",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "LT",
    "name": "Lithuania",
    "currency": "EUR",
    "phone": "+370",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "LU",
    "name": "Luxembourg",
    "currency": "",
    "phone": "+352",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "LV",
    "name": "Latvia",
    "currency": "EUR",
    "phone": "+371",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "LY",
    "name": "Libya",
    "currency": "",
    "phone": "+218",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "MA",
    "name": "Morocco",
    "currency": "MAD",
    "phone": "+212",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "MC",
    "name": "Monaco",
    "currency": "",
    "phone": "+377",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "MD",
    "name": "Moldova",
    "currency": "",
    "phone": "+373",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "ME",
    "name": "Montenegro",
    "currency": "",
    "phone": "+382",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "MF",
    "name": "St. Martin",
    "currency": "",
    "phone": "+590",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "MG",
    "name": "Madagascar",
    "currency": "",
    "phone": "+261",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "MH",
    "name": "Marshall Islands",
    "currency": "",
    "phone": "+692",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "MK",
    "name": "North Macedonia",
    "currency": "",
    "phone": "+389",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "ML",
    "name": "Mali",
    "currency": "",
    "phone": "+223",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "MM",
    "name": "Myanmar (Burma)",
    "currency": "",
    "phone": "+95",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "MN",
    "name": "Mongolia",
    "currency": "",
    "phone": "+976",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "MO",
    "name": "Macao SAR China",
    "currency": "",
    "phone": "+853",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "MP",
    "name": "Northern Mariana Islands",
    "currency": "",
    "phone": "+1",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "MQ",
    "name": "Martinique",
    "currency": "",
    "phone": "+596",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "MR",
    "name": "Mauritania",
    "currency": "",
    "phone": "+222",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "MS",
    "name": "Montserrat",
    "currency": "",
    "phone": "+1",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "MT",
    "name": "Malta",
    "currency": "EUR",
    "phone": "+356",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "MU",
    "name": "Mauritius",
    "currency": "",
    "phone": "+230",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "MV",
    "name": "Maldives",
    "currency": "",
    "phone": "+960",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "MW",
    "name": "Malawi",
    "currency": "",
    "phone": "+265",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "MX",
    "name": "Mexico",
    "currency": "MXN",
    "phone": "+52",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "MY",
    "name": "Malaysia",
    "currency": "MYR",
    "phone": "+60",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "MZ",
    "name": "Mozambique",
    "currency": "",
    "phone": "+258",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "NA",
    "name": "Namibia",
    "currency": "",
    "phone": "+264",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "NC",
    "name": "New Caledonia",
    "currency": "",
    "phone": "+687",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "NE",
    "name": "Niger",
    "currency": "",
    "phone": "+227",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "NF",
    "name": "Norfolk Island",
    "currency": "",
    "phone": "+672",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "NG",
    "name": "Nigeria",
    "currency": "NGN",
    "phone": "+234",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "NI",
    "name": "Nicaragua",
    "currency": "",
    "phone": "+505",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "NL",
    "name": "Netherlands",
    "currency": "EUR",
    "phone": "+31",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "NO",
    "name": "Norway",
    "currency": "NOK",
    "phone": "+47",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "NP",
    "name": "Nepal",
    "currency": "NPR",
    "phone": "+977",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "NR",
    "name": "Nauru",
    "currency": "",
    "phone": "+674",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "NU",
    "name": "Niue",
    "currency": "",
    "phone": "+683",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "NZ",
    "name": "New Zealand",
    "currency": "NZD",
    "phone": "+64",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "OM",
    "name": "Oman",
    "currency": "OMR",
    "phone": "+968",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "PA",
    "name": "Panama",
    "currency": "",
    "phone": "+507",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "PE",
    "name": "Peru",
    "currency": "PEN",
    "phone": "+51",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "PF",
    "name": "French Polynesia",
    "currency": "",
    "phone": "+689",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "PG",
    "name": "Papua New Guinea",
    "currency": "",
    "phone": "+675",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "PH",
    "name": "Philippines",
    "currency": "PHP",
    "phone": "+63",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "PK",
    "name": "Pakistan",
    "currency": "PKR",
    "phone": "+92",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "PL",
    "name": "Poland",
    "currency": "PLN",
    "phone": "+48",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "PM",
    "name": "St. Pierre & Miquelon",
    "currency": "",
    "phone": "+508",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "PR",
    "name": "Puerto Rico",
    "currency": "",
    "phone": "+1",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "PS",
    "name": "Palestinian Territories",
    "currency": "",
    "phone": "+970",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "PT",
    "name": "Portugal",
    "currency": "EUR",
    "phone": "+351",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "PW",
    "name": "Palau",
    "currency": "",
    "phone": "+680",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "PY",
    "name": "Paraguay",
    "currency": "",
    "phone": "+595",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "QA",
    "name": "Qatar",
    "currency": "QAR",
    "phone": "+974",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "RE",
    "name": "Réunion",
    "currency": "",
    "phone": "+262",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "RO",
    "name": "Romania",
    "currency": "RON",
    "phone": "+40",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "RS",
    "name": "Serbia",
    "currency": "RSD",
    "phone": "+381",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "RU",
    "name": "Russia",
    "currency": "RUB",
    "phone": "+7",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "RW",
    "name": "Rwanda",
    "currency": "",
    "phone": "+250",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "SA",
    "name": "Saudi Arabia",
    "currency": "SAR",
    "phone": "+966",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "SB",
    "name": "Solomon Islands",
    "currency": "",
    "phone": "+677",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "SC",
    "name": "Seychelles",
    "currency": "",
    "phone": "+248",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "SD",
    "name": "Sudan",
    "currency": "",
    "phone": "+249",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "SE",
    "name": "Sweden",
    "currency": "SEK",
    "phone": "+46",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "SG",
    "name": "Singapore",
    "currency": "SGD",
    "phone": "+65",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "SH",
    "name": "St. Helena",
    "currency": "",
    "phone": "+290",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "SI",
    "name": "Slovenia",
    "currency": "EUR",
    "phone": "+386",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "SJ",
    "name": "Svalbard & Jan Mayen",
    "currency": "",
    "phone": "+47",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "SK",
    "name": "Slovakia",
    "currency": "EUR",
    "phone": "+421",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "SL",
    "name": "Sierra Leone",
    "currency": "",
    "phone": "+232",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "SM",
    "name": "San Marino",
    "currency": "",
    "phone": "+378",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "SN",
    "name": "Senegal",
    "currency": "",
    "phone": "+221",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "SO",
    "name": "Somalia",
    "currency": "",
    "phone": "+252",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "SR",
    "name": "Suriname",
    "currency": "",
    "phone": "+597",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "SS",
    "name": "South Sudan",
    "currency": "",
    "phone": "+211",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "ST",
    "name": "São Tomé & Príncipe",
    "currency": "",
    "phone": "+239",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "SV",
    "name": "El Salvador",
    "currency": "",
    "phone": "+503",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "SX",
    "name": "Sint Maarten",
    "currency": "",
    "phone": "+1",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "SY",
    "name": "Syria",
    "currency": "",
    "phone": "+963",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "SZ",
    "name": "Eswatini",
    "currency": "",
    "phone": "+268",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "TA",
    "name": "Tristan da Cunha",
    "currency": "",
    "phone": "+290",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "TC",
    "name": "Turks & Caicos Islands",
    "currency": "",
    "phone": "+1",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "TD",
    "name": "Chad",
    "currency": "",
    "phone": "+235",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "TG",
    "name": "Togo",
    "currency": "",
    "phone": "+228",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "TH",
    "name": "Thailand",
    "currency": "THB",
    "phone": "+66",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "TJ",
    "name": "Tajikistan",
    "currency": "",
    "phone": "+992",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "TK",
    "name": "Tokelau",
    "currency": "",
    "phone": "+690",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "TL",
    "name": "Timor-Leste",
    "currency": "",
    "phone": "+670",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "TM",
    "name": "Turkmenistan",
    "currency": "",
    "phone": "+993",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "TN",
    "name": "Tunisia",
    "currency": "",
    "phone": "+216",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "TO",
    "name": "Tonga",
    "currency": "",
    "phone": "+676",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "TR",
    "name": "Türkiye",
    "currency": "TRY",
    "phone": "+90",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "TT",
    "name": "Trinidad & Tobago",
    "currency": "",
    "phone": "+1",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "TV",
    "name": "Tuvalu",
    "currency": "",
    "phone": "+688",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "TW",
    "name": "Taiwan",
    "currency": "TWD",
    "phone": "+886",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "TZ",
    "name": "Tanzania",
    "currency": "",
    "phone": "+255",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "UA",
    "name": "Ukraine",
    "currency": "UAH",
    "phone": "+380",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "UG",
    "name": "Uganda",
    "currency": "",
    "phone": "+256",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "US",
    "name": "United States",
    "currency": "USD",
    "phone": "+1",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "UY",
    "name": "Uruguay",
    "currency": "",
    "phone": "+598",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "UZ",
    "name": "Uzbekistan",
    "currency": "",
    "phone": "+998",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "VA",
    "name": "Vatican City",
    "currency": "",
    "phone": "+39",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "VC",
    "name": "St. Vincent & Grenadines",
    "currency": "",
    "phone": "+1",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "VE",
    "name": "Venezuela",
    "currency": "",
    "phone": "+58",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "VG",
    "name": "British Virgin Islands",
    "currency": "",
    "phone": "+1",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "VI",
    "name": "U.S. Virgin Islands",
    "currency": "",
    "phone": "+1",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "VN",
    "name": "Vietnam",
    "currency": "VND",
    "phone": "+84",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "VU",
    "name": "Vanuatu",
    "currency": "",
    "phone": "+678",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "WF",
    "name": "Wallis & Futuna",
    "currency": "",
    "phone": "+681",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "WS",
    "name": "Samoa",
    "currency": "",
    "phone": "+685",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "XK",
    "name": "Kosovo",
    "currency": "",
    "phone": "+383",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "YE",
    "name": "Yemen",
    "currency": "",
    "phone": "+967",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "YT",
    "name": "Mayotte",
    "currency": "",
    "phone": "+262",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "ZA",
    "name": "South Africa",
    "currency": "ZAR",
    "phone": "+27",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "ZM",
    "name": "Zambia",
    "currency": "",
    "phone": "+260",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  },
  {
    "code": "ZW",
    "name": "Zimbabwe",
    "currency": "",
    "phone": "+263",
    "topTerm": "Region",
    "secondTerm": "District",
    "localTerm": "City",
    "subdivisionTerm": "Districts"
  }
];

module.exports = { WORLD_COUNTRIES };
