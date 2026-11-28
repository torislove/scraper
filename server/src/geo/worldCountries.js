'use strict';

/**
 * worldCountries.js — authoritative 195+ ISO 3166-1 country registry.
 */

const WORLD_COUNTRIES = {
  "AC": {
    "code": "AC",
    "name": "Ascension Island",
    "nativeName": "Ascension Island",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "247",
    "currency": "USD"
  },
  "AD": {
    "code": "AD",
    "name": "Andorra",
    "nativeName": "Andorra",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "376",
    "currency": "USD"
  },
  "AE": {
    "code": "AE",
    "name": "United Arab Emirates",
    "nativeName": "United Arab Emirates",
    "centroid": {
      "lat": 23.4241,
      "lng": 53.8478
    },
    "defaultLang": "ar",
    "callingCode": "971",
    "currency": "AED"
  },
  "AF": {
    "code": "AF",
    "name": "Afghanistan",
    "nativeName": "Afghanistan",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "93",
    "currency": "USD"
  },
  "AG": {
    "code": "AG",
    "name": "Antigua & Barbuda",
    "nativeName": "Antigua & Barbuda",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "1",
    "currency": "USD"
  },
  "AI": {
    "code": "AI",
    "name": "Anguilla",
    "nativeName": "Anguilla",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "1",
    "currency": "USD"
  },
  "AL": {
    "code": "AL",
    "name": "Albania",
    "nativeName": "Albania",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "355",
    "currency": "USD"
  },
  "AM": {
    "code": "AM",
    "name": "Armenia",
    "nativeName": "Armenia",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "374",
    "currency": "USD"
  },
  "AO": {
    "code": "AO",
    "name": "Angola",
    "nativeName": "Angola",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "244",
    "currency": "USD"
  },
  "AR": {
    "code": "AR",
    "name": "Argentina",
    "nativeName": "Argentina",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "54",
    "currency": "ARS"
  },
  "AS": {
    "code": "AS",
    "name": "American Samoa",
    "nativeName": "American Samoa",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "1",
    "currency": "USD"
  },
  "AT": {
    "code": "AT",
    "name": "Austria",
    "nativeName": "Austria",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "43",
    "currency": "EUR"
  },
  "AU": {
    "code": "AU",
    "name": "Australia",
    "nativeName": "Australia",
    "centroid": {
      "lat": -25.2744,
      "lng": 133.7751
    },
    "defaultLang": "en",
    "callingCode": "61",
    "currency": "AUD"
  },
  "AW": {
    "code": "AW",
    "name": "Aruba",
    "nativeName": "Aruba",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "297",
    "currency": "USD"
  },
  "AX": {
    "code": "AX",
    "name": "Åland Islands",
    "nativeName": "Åland Islands",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "358",
    "currency": "USD"
  },
  "AZ": {
    "code": "AZ",
    "name": "Azerbaijan",
    "nativeName": "Azerbaijan",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "994",
    "currency": "USD"
  },
  "BA": {
    "code": "BA",
    "name": "Bosnia & Herzegovina",
    "nativeName": "Bosnia & Herzegovina",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "387",
    "currency": "USD"
  },
  "BB": {
    "code": "BB",
    "name": "Barbados",
    "nativeName": "Barbados",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "1",
    "currency": "USD"
  },
  "BD": {
    "code": "BD",
    "name": "Bangladesh",
    "nativeName": "Bangladesh",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "880",
    "currency": "BDT"
  },
  "BE": {
    "code": "BE",
    "name": "Belgium",
    "nativeName": "Belgium",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "32",
    "currency": "EUR"
  },
  "BF": {
    "code": "BF",
    "name": "Burkina Faso",
    "nativeName": "Burkina Faso",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "226",
    "currency": "USD"
  },
  "BG": {
    "code": "BG",
    "name": "Bulgaria",
    "nativeName": "Bulgaria",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "359",
    "currency": "BGN"
  },
  "BH": {
    "code": "BH",
    "name": "Bahrain",
    "nativeName": "Bahrain",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "973",
    "currency": "BHD"
  },
  "BI": {
    "code": "BI",
    "name": "Burundi",
    "nativeName": "Burundi",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "257",
    "currency": "USD"
  },
  "BJ": {
    "code": "BJ",
    "name": "Benin",
    "nativeName": "Benin",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "229",
    "currency": "USD"
  },
  "BL": {
    "code": "BL",
    "name": "St. Barthélemy",
    "nativeName": "St. Barthélemy",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "590",
    "currency": "USD"
  },
  "BM": {
    "code": "BM",
    "name": "Bermuda",
    "nativeName": "Bermuda",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "1",
    "currency": "USD"
  },
  "BN": {
    "code": "BN",
    "name": "Brunei",
    "nativeName": "Brunei",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "673",
    "currency": "USD"
  },
  "BO": {
    "code": "BO",
    "name": "Bolivia",
    "nativeName": "Bolivia",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "591",
    "currency": "USD"
  },
  "BQ": {
    "code": "BQ",
    "name": "Caribbean Netherlands",
    "nativeName": "Caribbean Netherlands",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "599",
    "currency": "USD"
  },
  "BR": {
    "code": "BR",
    "name": "Brazil",
    "nativeName": "Brazil",
    "centroid": {
      "lat": -14.235,
      "lng": -51.9253
    },
    "defaultLang": "en",
    "callingCode": "55",
    "currency": "BRL"
  },
  "BS": {
    "code": "BS",
    "name": "Bahamas",
    "nativeName": "Bahamas",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "1",
    "currency": "USD"
  },
  "BT": {
    "code": "BT",
    "name": "Bhutan",
    "nativeName": "Bhutan",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "975",
    "currency": "USD"
  },
  "BW": {
    "code": "BW",
    "name": "Botswana",
    "nativeName": "Botswana",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "267",
    "currency": "USD"
  },
  "BY": {
    "code": "BY",
    "name": "Belarus",
    "nativeName": "Belarus",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "375",
    "currency": "USD"
  },
  "BZ": {
    "code": "BZ",
    "name": "Belize",
    "nativeName": "Belize",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "501",
    "currency": "USD"
  },
  "CA": {
    "code": "CA",
    "name": "Canada",
    "nativeName": "Canada",
    "centroid": {
      "lat": 56.1304,
      "lng": -106.3468
    },
    "defaultLang": "en",
    "callingCode": "1",
    "currency": "CAD"
  },
  "CC": {
    "code": "CC",
    "name": "Cocos (Keeling) Islands",
    "nativeName": "Cocos (Keeling) Islands",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "61",
    "currency": "USD"
  },
  "CD": {
    "code": "CD",
    "name": "Congo - Kinshasa",
    "nativeName": "Congo - Kinshasa",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "243",
    "currency": "USD"
  },
  "CF": {
    "code": "CF",
    "name": "Central African Republic",
    "nativeName": "Central African Republic",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "236",
    "currency": "USD"
  },
  "CG": {
    "code": "CG",
    "name": "Congo - Brazzaville",
    "nativeName": "Congo - Brazzaville",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "242",
    "currency": "USD"
  },
  "CH": {
    "code": "CH",
    "name": "Switzerland",
    "nativeName": "Switzerland",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "41",
    "currency": "CHF"
  },
  "CI": {
    "code": "CI",
    "name": "Côte d’Ivoire",
    "nativeName": "Côte d’Ivoire",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "225",
    "currency": "USD"
  },
  "CK": {
    "code": "CK",
    "name": "Cook Islands",
    "nativeName": "Cook Islands",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "682",
    "currency": "USD"
  },
  "CL": {
    "code": "CL",
    "name": "Chile",
    "nativeName": "Chile",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "56",
    "currency": "CLP"
  },
  "CM": {
    "code": "CM",
    "name": "Cameroon",
    "nativeName": "Cameroon",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "237",
    "currency": "USD"
  },
  "CN": {
    "code": "CN",
    "name": "China",
    "nativeName": "China",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "86",
    "currency": "CNY"
  },
  "CO": {
    "code": "CO",
    "name": "Colombia",
    "nativeName": "Colombia",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "57",
    "currency": "COP"
  },
  "CR": {
    "code": "CR",
    "name": "Costa Rica",
    "nativeName": "Costa Rica",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "506",
    "currency": "USD"
  },
  "CU": {
    "code": "CU",
    "name": "Cuba",
    "nativeName": "Cuba",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "53",
    "currency": "USD"
  },
  "CV": {
    "code": "CV",
    "name": "Cape Verde",
    "nativeName": "Cape Verde",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "238",
    "currency": "USD"
  },
  "CW": {
    "code": "CW",
    "name": "Curaçao",
    "nativeName": "Curaçao",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "599",
    "currency": "USD"
  },
  "CX": {
    "code": "CX",
    "name": "Christmas Island",
    "nativeName": "Christmas Island",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "61",
    "currency": "USD"
  },
  "CY": {
    "code": "CY",
    "name": "Cyprus",
    "nativeName": "Cyprus",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "357",
    "currency": "EUR"
  },
  "CZ": {
    "code": "CZ",
    "name": "Czechia",
    "nativeName": "Czechia",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "420",
    "currency": "CZK"
  },
  "DE": {
    "code": "DE",
    "name": "Germany",
    "nativeName": "Germany",
    "centroid": {
      "lat": 51.1657,
      "lng": 10.4515
    },
    "defaultLang": "de",
    "callingCode": "49",
    "currency": "EUR"
  },
  "DJ": {
    "code": "DJ",
    "name": "Djibouti",
    "nativeName": "Djibouti",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "253",
    "currency": "USD"
  },
  "DK": {
    "code": "DK",
    "name": "Denmark",
    "nativeName": "Denmark",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "45",
    "currency": "DKK"
  },
  "DM": {
    "code": "DM",
    "name": "Dominica",
    "nativeName": "Dominica",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "1",
    "currency": "USD"
  },
  "DO": {
    "code": "DO",
    "name": "Dominican Republic",
    "nativeName": "Dominican Republic",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "1",
    "currency": "USD"
  },
  "DZ": {
    "code": "DZ",
    "name": "Algeria",
    "nativeName": "Algeria",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "213",
    "currency": "USD"
  },
  "EC": {
    "code": "EC",
    "name": "Ecuador",
    "nativeName": "Ecuador",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "593",
    "currency": "USD"
  },
  "EE": {
    "code": "EE",
    "name": "Estonia",
    "nativeName": "Estonia",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "372",
    "currency": "EUR"
  },
  "EG": {
    "code": "EG",
    "name": "Egypt",
    "nativeName": "Egypt",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "ar",
    "callingCode": "20",
    "currency": "EGP"
  },
  "EH": {
    "code": "EH",
    "name": "Western Sahara",
    "nativeName": "Western Sahara",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "212",
    "currency": "USD"
  },
  "ER": {
    "code": "ER",
    "name": "Eritrea",
    "nativeName": "Eritrea",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "291",
    "currency": "USD"
  },
  "ES": {
    "code": "ES",
    "name": "Spain",
    "nativeName": "Spain",
    "centroid": {
      "lat": 40.4637,
      "lng": -3.7492
    },
    "defaultLang": "es",
    "callingCode": "34",
    "currency": "EUR"
  },
  "ET": {
    "code": "ET",
    "name": "Ethiopia",
    "nativeName": "Ethiopia",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "251",
    "currency": "USD"
  },
  "FI": {
    "code": "FI",
    "name": "Finland",
    "nativeName": "Finland",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "358",
    "currency": "EUR"
  },
  "FJ": {
    "code": "FJ",
    "name": "Fiji",
    "nativeName": "Fiji",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "679",
    "currency": "USD"
  },
  "FK": {
    "code": "FK",
    "name": "Falkland Islands",
    "nativeName": "Falkland Islands",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "500",
    "currency": "USD"
  },
  "FM": {
    "code": "FM",
    "name": "Micronesia",
    "nativeName": "Micronesia",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "691",
    "currency": "USD"
  },
  "FO": {
    "code": "FO",
    "name": "Faroe Islands",
    "nativeName": "Faroe Islands",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "298",
    "currency": "USD"
  },
  "FR": {
    "code": "FR",
    "name": "France",
    "nativeName": "France",
    "centroid": {
      "lat": 46.2276,
      "lng": 2.2137
    },
    "defaultLang": "fr",
    "callingCode": "33",
    "currency": "EUR"
  },
  "GA": {
    "code": "GA",
    "name": "Gabon",
    "nativeName": "Gabon",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "241",
    "currency": "USD"
  },
  "GB": {
    "code": "GB",
    "name": "United Kingdom",
    "nativeName": "United Kingdom",
    "centroid": {
      "lat": 55.3781,
      "lng": -3.436
    },
    "defaultLang": "en",
    "callingCode": "44",
    "currency": "GBP"
  },
  "GD": {
    "code": "GD",
    "name": "Grenada",
    "nativeName": "Grenada",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "1",
    "currency": "USD"
  },
  "GE": {
    "code": "GE",
    "name": "Georgia",
    "nativeName": "Georgia",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "995",
    "currency": "USD"
  },
  "GF": {
    "code": "GF",
    "name": "French Guiana",
    "nativeName": "French Guiana",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "594",
    "currency": "USD"
  },
  "GG": {
    "code": "GG",
    "name": "Guernsey",
    "nativeName": "Guernsey",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "44",
    "currency": "USD"
  },
  "GH": {
    "code": "GH",
    "name": "Ghana",
    "nativeName": "Ghana",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "233",
    "currency": "GHS"
  },
  "GI": {
    "code": "GI",
    "name": "Gibraltar",
    "nativeName": "Gibraltar",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "350",
    "currency": "USD"
  },
  "GL": {
    "code": "GL",
    "name": "Greenland",
    "nativeName": "Greenland",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "299",
    "currency": "USD"
  },
  "GM": {
    "code": "GM",
    "name": "Gambia",
    "nativeName": "Gambia",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "220",
    "currency": "USD"
  },
  "GN": {
    "code": "GN",
    "name": "Guinea",
    "nativeName": "Guinea",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "224",
    "currency": "USD"
  },
  "GP": {
    "code": "GP",
    "name": "Guadeloupe",
    "nativeName": "Guadeloupe",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "590",
    "currency": "USD"
  },
  "GQ": {
    "code": "GQ",
    "name": "Equatorial Guinea",
    "nativeName": "Equatorial Guinea",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "240",
    "currency": "USD"
  },
  "GR": {
    "code": "GR",
    "name": "Greece",
    "nativeName": "Greece",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "30",
    "currency": "EUR"
  },
  "GT": {
    "code": "GT",
    "name": "Guatemala",
    "nativeName": "Guatemala",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "502",
    "currency": "USD"
  },
  "GU": {
    "code": "GU",
    "name": "Guam",
    "nativeName": "Guam",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "1",
    "currency": "USD"
  },
  "GW": {
    "code": "GW",
    "name": "Guinea-Bissau",
    "nativeName": "Guinea-Bissau",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "245",
    "currency": "USD"
  },
  "GY": {
    "code": "GY",
    "name": "Guyana",
    "nativeName": "Guyana",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "592",
    "currency": "USD"
  },
  "HK": {
    "code": "HK",
    "name": "Hong Kong SAR China",
    "nativeName": "Hong Kong SAR China",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "852",
    "currency": "HKD"
  },
  "HN": {
    "code": "HN",
    "name": "Honduras",
    "nativeName": "Honduras",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "504",
    "currency": "USD"
  },
  "HR": {
    "code": "HR",
    "name": "Croatia",
    "nativeName": "Croatia",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "385",
    "currency": "EUR"
  },
  "HT": {
    "code": "HT",
    "name": "Haiti",
    "nativeName": "Haiti",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "509",
    "currency": "USD"
  },
  "HU": {
    "code": "HU",
    "name": "Hungary",
    "nativeName": "Hungary",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "36",
    "currency": "HUF"
  },
  "ID": {
    "code": "ID",
    "name": "Indonesia",
    "nativeName": "Indonesia",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "62",
    "currency": "IDR"
  },
  "IE": {
    "code": "IE",
    "name": "Ireland",
    "nativeName": "Ireland",
    "centroid": {
      "lat": 53.1424,
      "lng": -7.6921
    },
    "defaultLang": "en",
    "callingCode": "353",
    "currency": "EUR"
  },
  "IL": {
    "code": "IL",
    "name": "Israel",
    "nativeName": "Israel",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "972",
    "currency": "ILS"
  },
  "IM": {
    "code": "IM",
    "name": "Isle of Man",
    "nativeName": "Isle of Man",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "44",
    "currency": "USD"
  },
  "IN": {
    "code": "IN",
    "name": "India",
    "nativeName": "India",
    "centroid": {
      "lat": 20.5937,
      "lng": 78.9629
    },
    "defaultLang": "en",
    "callingCode": "91",
    "currency": "INR"
  },
  "IO": {
    "code": "IO",
    "name": "British Indian Ocean Territory",
    "nativeName": "British Indian Ocean Territory",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "246",
    "currency": "USD"
  },
  "IQ": {
    "code": "IQ",
    "name": "Iraq",
    "nativeName": "Iraq",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "964",
    "currency": "USD"
  },
  "IR": {
    "code": "IR",
    "name": "Iran",
    "nativeName": "Iran",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "98",
    "currency": "USD"
  },
  "IS": {
    "code": "IS",
    "name": "Iceland",
    "nativeName": "Iceland",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "354",
    "currency": "ISK"
  },
  "IT": {
    "code": "IT",
    "name": "Italy",
    "nativeName": "Italy",
    "centroid": {
      "lat": 41.8719,
      "lng": 12.5674
    },
    "defaultLang": "it",
    "callingCode": "39",
    "currency": "EUR"
  },
  "JE": {
    "code": "JE",
    "name": "Jersey",
    "nativeName": "Jersey",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "44",
    "currency": "USD"
  },
  "JM": {
    "code": "JM",
    "name": "Jamaica",
    "nativeName": "Jamaica",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "1",
    "currency": "USD"
  },
  "JO": {
    "code": "JO",
    "name": "Jordan",
    "nativeName": "Jordan",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "962",
    "currency": "JOD"
  },
  "JP": {
    "code": "JP",
    "name": "Japan",
    "nativeName": "Japan",
    "centroid": {
      "lat": 36.2048,
      "lng": 138.2529
    },
    "defaultLang": "en",
    "callingCode": "81",
    "currency": "JPY"
  },
  "KE": {
    "code": "KE",
    "name": "Kenya",
    "nativeName": "Kenya",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "254",
    "currency": "KES"
  },
  "KG": {
    "code": "KG",
    "name": "Kyrgyzstan",
    "nativeName": "Kyrgyzstan",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "996",
    "currency": "USD"
  },
  "KH": {
    "code": "KH",
    "name": "Cambodia",
    "nativeName": "Cambodia",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "855",
    "currency": "USD"
  },
  "KI": {
    "code": "KI",
    "name": "Kiribati",
    "nativeName": "Kiribati",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "686",
    "currency": "USD"
  },
  "KM": {
    "code": "KM",
    "name": "Comoros",
    "nativeName": "Comoros",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "269",
    "currency": "USD"
  },
  "KN": {
    "code": "KN",
    "name": "St. Kitts & Nevis",
    "nativeName": "St. Kitts & Nevis",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "1",
    "currency": "USD"
  },
  "KP": {
    "code": "KP",
    "name": "North Korea",
    "nativeName": "North Korea",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "850",
    "currency": "USD"
  },
  "KR": {
    "code": "KR",
    "name": "South Korea",
    "nativeName": "South Korea",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "82",
    "currency": "KRW"
  },
  "KW": {
    "code": "KW",
    "name": "Kuwait",
    "nativeName": "Kuwait",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "965",
    "currency": "KWD"
  },
  "KY": {
    "code": "KY",
    "name": "Cayman Islands",
    "nativeName": "Cayman Islands",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "1",
    "currency": "USD"
  },
  "KZ": {
    "code": "KZ",
    "name": "Kazakhstan",
    "nativeName": "Kazakhstan",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "7",
    "currency": "USD"
  },
  "LA": {
    "code": "LA",
    "name": "Laos",
    "nativeName": "Laos",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "856",
    "currency": "USD"
  },
  "LB": {
    "code": "LB",
    "name": "Lebanon",
    "nativeName": "Lebanon",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "961",
    "currency": "LBP"
  },
  "LC": {
    "code": "LC",
    "name": "St. Lucia",
    "nativeName": "St. Lucia",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "1",
    "currency": "USD"
  },
  "LI": {
    "code": "LI",
    "name": "Liechtenstein",
    "nativeName": "Liechtenstein",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "423",
    "currency": "USD"
  },
  "LK": {
    "code": "LK",
    "name": "Sri Lanka",
    "nativeName": "Sri Lanka",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "94",
    "currency": "LKR"
  },
  "LR": {
    "code": "LR",
    "name": "Liberia",
    "nativeName": "Liberia",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "231",
    "currency": "USD"
  },
  "LS": {
    "code": "LS",
    "name": "Lesotho",
    "nativeName": "Lesotho",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "266",
    "currency": "USD"
  },
  "LT": {
    "code": "LT",
    "name": "Lithuania",
    "nativeName": "Lithuania",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "370",
    "currency": "EUR"
  },
  "LU": {
    "code": "LU",
    "name": "Luxembourg",
    "nativeName": "Luxembourg",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "352",
    "currency": "USD"
  },
  "LV": {
    "code": "LV",
    "name": "Latvia",
    "nativeName": "Latvia",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "371",
    "currency": "EUR"
  },
  "LY": {
    "code": "LY",
    "name": "Libya",
    "nativeName": "Libya",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "218",
    "currency": "USD"
  },
  "MA": {
    "code": "MA",
    "name": "Morocco",
    "nativeName": "Morocco",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "212",
    "currency": "MAD"
  },
  "MC": {
    "code": "MC",
    "name": "Monaco",
    "nativeName": "Monaco",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "377",
    "currency": "USD"
  },
  "MD": {
    "code": "MD",
    "name": "Moldova",
    "nativeName": "Moldova",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "373",
    "currency": "USD"
  },
  "ME": {
    "code": "ME",
    "name": "Montenegro",
    "nativeName": "Montenegro",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "382",
    "currency": "USD"
  },
  "MF": {
    "code": "MF",
    "name": "St. Martin",
    "nativeName": "St. Martin",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "590",
    "currency": "USD"
  },
  "MG": {
    "code": "MG",
    "name": "Madagascar",
    "nativeName": "Madagascar",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "261",
    "currency": "USD"
  },
  "MH": {
    "code": "MH",
    "name": "Marshall Islands",
    "nativeName": "Marshall Islands",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "692",
    "currency": "USD"
  },
  "MK": {
    "code": "MK",
    "name": "North Macedonia",
    "nativeName": "North Macedonia",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "389",
    "currency": "USD"
  },
  "ML": {
    "code": "ML",
    "name": "Mali",
    "nativeName": "Mali",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "223",
    "currency": "USD"
  },
  "MM": {
    "code": "MM",
    "name": "Myanmar (Burma)",
    "nativeName": "Myanmar (Burma)",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "95",
    "currency": "USD"
  },
  "MN": {
    "code": "MN",
    "name": "Mongolia",
    "nativeName": "Mongolia",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "976",
    "currency": "USD"
  },
  "MO": {
    "code": "MO",
    "name": "Macao SAR China",
    "nativeName": "Macao SAR China",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "853",
    "currency": "USD"
  },
  "MP": {
    "code": "MP",
    "name": "Northern Mariana Islands",
    "nativeName": "Northern Mariana Islands",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "1",
    "currency": "USD"
  },
  "MQ": {
    "code": "MQ",
    "name": "Martinique",
    "nativeName": "Martinique",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "596",
    "currency": "USD"
  },
  "MR": {
    "code": "MR",
    "name": "Mauritania",
    "nativeName": "Mauritania",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "222",
    "currency": "USD"
  },
  "MS": {
    "code": "MS",
    "name": "Montserrat",
    "nativeName": "Montserrat",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "1",
    "currency": "USD"
  },
  "MT": {
    "code": "MT",
    "name": "Malta",
    "nativeName": "Malta",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "356",
    "currency": "EUR"
  },
  "MU": {
    "code": "MU",
    "name": "Mauritius",
    "nativeName": "Mauritius",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "230",
    "currency": "USD"
  },
  "MV": {
    "code": "MV",
    "name": "Maldives",
    "nativeName": "Maldives",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "960",
    "currency": "USD"
  },
  "MW": {
    "code": "MW",
    "name": "Malawi",
    "nativeName": "Malawi",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "265",
    "currency": "USD"
  },
  "MX": {
    "code": "MX",
    "name": "Mexico",
    "nativeName": "Mexico",
    "centroid": {
      "lat": 23.6345,
      "lng": -102.5528
    },
    "defaultLang": "en",
    "callingCode": "52",
    "currency": "MXN"
  },
  "MY": {
    "code": "MY",
    "name": "Malaysia",
    "nativeName": "Malaysia",
    "centroid": {
      "lat": 4.2105,
      "lng": 101.9758
    },
    "defaultLang": "en",
    "callingCode": "60",
    "currency": "MYR"
  },
  "MZ": {
    "code": "MZ",
    "name": "Mozambique",
    "nativeName": "Mozambique",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "258",
    "currency": "USD"
  },
  "NA": {
    "code": "NA",
    "name": "Namibia",
    "nativeName": "Namibia",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "264",
    "currency": "USD"
  },
  "NC": {
    "code": "NC",
    "name": "New Caledonia",
    "nativeName": "New Caledonia",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "687",
    "currency": "USD"
  },
  "NE": {
    "code": "NE",
    "name": "Niger",
    "nativeName": "Niger",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "227",
    "currency": "USD"
  },
  "NF": {
    "code": "NF",
    "name": "Norfolk Island",
    "nativeName": "Norfolk Island",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "672",
    "currency": "USD"
  },
  "NG": {
    "code": "NG",
    "name": "Nigeria",
    "nativeName": "Nigeria",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "234",
    "currency": "NGN"
  },
  "NI": {
    "code": "NI",
    "name": "Nicaragua",
    "nativeName": "Nicaragua",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "505",
    "currency": "USD"
  },
  "NL": {
    "code": "NL",
    "name": "Netherlands",
    "nativeName": "Netherlands",
    "centroid": {
      "lat": 52.1326,
      "lng": 5.2913
    },
    "defaultLang": "en",
    "callingCode": "31",
    "currency": "EUR"
  },
  "NO": {
    "code": "NO",
    "name": "Norway",
    "nativeName": "Norway",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "47",
    "currency": "NOK"
  },
  "NP": {
    "code": "NP",
    "name": "Nepal",
    "nativeName": "Nepal",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "977",
    "currency": "NPR"
  },
  "NR": {
    "code": "NR",
    "name": "Nauru",
    "nativeName": "Nauru",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "674",
    "currency": "USD"
  },
  "NU": {
    "code": "NU",
    "name": "Niue",
    "nativeName": "Niue",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "683",
    "currency": "USD"
  },
  "NZ": {
    "code": "NZ",
    "name": "New Zealand",
    "nativeName": "New Zealand",
    "centroid": {
      "lat": -40.9006,
      "lng": 174.886
    },
    "defaultLang": "en",
    "callingCode": "64",
    "currency": "NZD"
  },
  "OM": {
    "code": "OM",
    "name": "Oman",
    "nativeName": "Oman",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "968",
    "currency": "OMR"
  },
  "PA": {
    "code": "PA",
    "name": "Panama",
    "nativeName": "Panama",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "507",
    "currency": "USD"
  },
  "PE": {
    "code": "PE",
    "name": "Peru",
    "nativeName": "Peru",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "51",
    "currency": "PEN"
  },
  "PF": {
    "code": "PF",
    "name": "French Polynesia",
    "nativeName": "French Polynesia",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "689",
    "currency": "USD"
  },
  "PG": {
    "code": "PG",
    "name": "Papua New Guinea",
    "nativeName": "Papua New Guinea",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "675",
    "currency": "USD"
  },
  "PH": {
    "code": "PH",
    "name": "Philippines",
    "nativeName": "Philippines",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "63",
    "currency": "PHP"
  },
  "PK": {
    "code": "PK",
    "name": "Pakistan",
    "nativeName": "Pakistan",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "92",
    "currency": "PKR"
  },
  "PL": {
    "code": "PL",
    "name": "Poland",
    "nativeName": "Poland",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "48",
    "currency": "PLN"
  },
  "PM": {
    "code": "PM",
    "name": "St. Pierre & Miquelon",
    "nativeName": "St. Pierre & Miquelon",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "508",
    "currency": "USD"
  },
  "PR": {
    "code": "PR",
    "name": "Puerto Rico",
    "nativeName": "Puerto Rico",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "1",
    "currency": "USD"
  },
  "PS": {
    "code": "PS",
    "name": "Palestinian Territories",
    "nativeName": "Palestinian Territories",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "970",
    "currency": "USD"
  },
  "PT": {
    "code": "PT",
    "name": "Portugal",
    "nativeName": "Portugal",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "351",
    "currency": "EUR"
  },
  "PW": {
    "code": "PW",
    "name": "Palau",
    "nativeName": "Palau",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "680",
    "currency": "USD"
  },
  "PY": {
    "code": "PY",
    "name": "Paraguay",
    "nativeName": "Paraguay",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "595",
    "currency": "USD"
  },
  "QA": {
    "code": "QA",
    "name": "Qatar",
    "nativeName": "Qatar",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "974",
    "currency": "QAR"
  },
  "RE": {
    "code": "RE",
    "name": "Réunion",
    "nativeName": "Réunion",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "262",
    "currency": "USD"
  },
  "RO": {
    "code": "RO",
    "name": "Romania",
    "nativeName": "Romania",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "40",
    "currency": "RON"
  },
  "RS": {
    "code": "RS",
    "name": "Serbia",
    "nativeName": "Serbia",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "381",
    "currency": "RSD"
  },
  "RU": {
    "code": "RU",
    "name": "Russia",
    "nativeName": "Russia",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "7",
    "currency": "RUB"
  },
  "RW": {
    "code": "RW",
    "name": "Rwanda",
    "nativeName": "Rwanda",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "250",
    "currency": "USD"
  },
  "SA": {
    "code": "SA",
    "name": "Saudi Arabia",
    "nativeName": "Saudi Arabia",
    "centroid": {
      "lat": 23.8859,
      "lng": 45.0792
    },
    "defaultLang": "ar",
    "callingCode": "966",
    "currency": "SAR"
  },
  "SB": {
    "code": "SB",
    "name": "Solomon Islands",
    "nativeName": "Solomon Islands",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "677",
    "currency": "USD"
  },
  "SC": {
    "code": "SC",
    "name": "Seychelles",
    "nativeName": "Seychelles",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "248",
    "currency": "USD"
  },
  "SD": {
    "code": "SD",
    "name": "Sudan",
    "nativeName": "Sudan",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "249",
    "currency": "USD"
  },
  "SE": {
    "code": "SE",
    "name": "Sweden",
    "nativeName": "Sweden",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "46",
    "currency": "SEK"
  },
  "SG": {
    "code": "SG",
    "name": "Singapore",
    "nativeName": "Singapore",
    "centroid": {
      "lat": 1.3521,
      "lng": 103.8198
    },
    "defaultLang": "en",
    "callingCode": "65",
    "currency": "SGD"
  },
  "SH": {
    "code": "SH",
    "name": "St. Helena",
    "nativeName": "St. Helena",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "290",
    "currency": "USD"
  },
  "SI": {
    "code": "SI",
    "name": "Slovenia",
    "nativeName": "Slovenia",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "386",
    "currency": "EUR"
  },
  "SJ": {
    "code": "SJ",
    "name": "Svalbard & Jan Mayen",
    "nativeName": "Svalbard & Jan Mayen",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "47",
    "currency": "USD"
  },
  "SK": {
    "code": "SK",
    "name": "Slovakia",
    "nativeName": "Slovakia",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "421",
    "currency": "EUR"
  },
  "SL": {
    "code": "SL",
    "name": "Sierra Leone",
    "nativeName": "Sierra Leone",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "232",
    "currency": "USD"
  },
  "SM": {
    "code": "SM",
    "name": "San Marino",
    "nativeName": "San Marino",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "378",
    "currency": "USD"
  },
  "SN": {
    "code": "SN",
    "name": "Senegal",
    "nativeName": "Senegal",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "221",
    "currency": "USD"
  },
  "SO": {
    "code": "SO",
    "name": "Somalia",
    "nativeName": "Somalia",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "252",
    "currency": "USD"
  },
  "SR": {
    "code": "SR",
    "name": "Suriname",
    "nativeName": "Suriname",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "597",
    "currency": "USD"
  },
  "SS": {
    "code": "SS",
    "name": "South Sudan",
    "nativeName": "South Sudan",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "211",
    "currency": "USD"
  },
  "ST": {
    "code": "ST",
    "name": "São Tomé & Príncipe",
    "nativeName": "São Tomé & Príncipe",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "239",
    "currency": "USD"
  },
  "SV": {
    "code": "SV",
    "name": "El Salvador",
    "nativeName": "El Salvador",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "503",
    "currency": "USD"
  },
  "SX": {
    "code": "SX",
    "name": "Sint Maarten",
    "nativeName": "Sint Maarten",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "1",
    "currency": "USD"
  },
  "SY": {
    "code": "SY",
    "name": "Syria",
    "nativeName": "Syria",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "963",
    "currency": "USD"
  },
  "SZ": {
    "code": "SZ",
    "name": "Eswatini",
    "nativeName": "Eswatini",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "268",
    "currency": "USD"
  },
  "TA": {
    "code": "TA",
    "name": "Tristan da Cunha",
    "nativeName": "Tristan da Cunha",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "290",
    "currency": "USD"
  },
  "TC": {
    "code": "TC",
    "name": "Turks & Caicos Islands",
    "nativeName": "Turks & Caicos Islands",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "1",
    "currency": "USD"
  },
  "TD": {
    "code": "TD",
    "name": "Chad",
    "nativeName": "Chad",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "235",
    "currency": "USD"
  },
  "TG": {
    "code": "TG",
    "name": "Togo",
    "nativeName": "Togo",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "228",
    "currency": "USD"
  },
  "TH": {
    "code": "TH",
    "name": "Thailand",
    "nativeName": "Thailand",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "66",
    "currency": "THB"
  },
  "TJ": {
    "code": "TJ",
    "name": "Tajikistan",
    "nativeName": "Tajikistan",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "992",
    "currency": "USD"
  },
  "TK": {
    "code": "TK",
    "name": "Tokelau",
    "nativeName": "Tokelau",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "690",
    "currency": "USD"
  },
  "TL": {
    "code": "TL",
    "name": "Timor-Leste",
    "nativeName": "Timor-Leste",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "670",
    "currency": "USD"
  },
  "TM": {
    "code": "TM",
    "name": "Turkmenistan",
    "nativeName": "Turkmenistan",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "993",
    "currency": "USD"
  },
  "TN": {
    "code": "TN",
    "name": "Tunisia",
    "nativeName": "Tunisia",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "216",
    "currency": "USD"
  },
  "TO": {
    "code": "TO",
    "name": "Tonga",
    "nativeName": "Tonga",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "676",
    "currency": "USD"
  },
  "TR": {
    "code": "TR",
    "name": "Türkiye",
    "nativeName": "Türkiye",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "90",
    "currency": "TRY"
  },
  "TT": {
    "code": "TT",
    "name": "Trinidad & Tobago",
    "nativeName": "Trinidad & Tobago",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "1",
    "currency": "USD"
  },
  "TV": {
    "code": "TV",
    "name": "Tuvalu",
    "nativeName": "Tuvalu",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "688",
    "currency": "USD"
  },
  "TW": {
    "code": "TW",
    "name": "Taiwan",
    "nativeName": "Taiwan",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "886",
    "currency": "TWD"
  },
  "TZ": {
    "code": "TZ",
    "name": "Tanzania",
    "nativeName": "Tanzania",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "255",
    "currency": "USD"
  },
  "UA": {
    "code": "UA",
    "name": "Ukraine",
    "nativeName": "Ukraine",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "380",
    "currency": "UAH"
  },
  "UG": {
    "code": "UG",
    "name": "Uganda",
    "nativeName": "Uganda",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "256",
    "currency": "USD"
  },
  "US": {
    "code": "US",
    "name": "United States",
    "nativeName": "United States",
    "centroid": {
      "lat": 37.0902,
      "lng": -95.7129
    },
    "defaultLang": "en",
    "callingCode": "1",
    "currency": "USD"
  },
  "UY": {
    "code": "UY",
    "name": "Uruguay",
    "nativeName": "Uruguay",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "598",
    "currency": "USD"
  },
  "UZ": {
    "code": "UZ",
    "name": "Uzbekistan",
    "nativeName": "Uzbekistan",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "998",
    "currency": "USD"
  },
  "VA": {
    "code": "VA",
    "name": "Vatican City",
    "nativeName": "Vatican City",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "39",
    "currency": "USD"
  },
  "VC": {
    "code": "VC",
    "name": "St. Vincent & Grenadines",
    "nativeName": "St. Vincent & Grenadines",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "1",
    "currency": "USD"
  },
  "VE": {
    "code": "VE",
    "name": "Venezuela",
    "nativeName": "Venezuela",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "58",
    "currency": "USD"
  },
  "VG": {
    "code": "VG",
    "name": "British Virgin Islands",
    "nativeName": "British Virgin Islands",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "1",
    "currency": "USD"
  },
  "VI": {
    "code": "VI",
    "name": "U.S. Virgin Islands",
    "nativeName": "U.S. Virgin Islands",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "1",
    "currency": "USD"
  },
  "VN": {
    "code": "VN",
    "name": "Vietnam",
    "nativeName": "Vietnam",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "84",
    "currency": "VND"
  },
  "VU": {
    "code": "VU",
    "name": "Vanuatu",
    "nativeName": "Vanuatu",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "678",
    "currency": "USD"
  },
  "WF": {
    "code": "WF",
    "name": "Wallis & Futuna",
    "nativeName": "Wallis & Futuna",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "681",
    "currency": "USD"
  },
  "WS": {
    "code": "WS",
    "name": "Samoa",
    "nativeName": "Samoa",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "685",
    "currency": "USD"
  },
  "XK": {
    "code": "XK",
    "name": "Kosovo",
    "nativeName": "Kosovo",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "383",
    "currency": "USD"
  },
  "YE": {
    "code": "YE",
    "name": "Yemen",
    "nativeName": "Yemen",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "967",
    "currency": "USD"
  },
  "YT": {
    "code": "YT",
    "name": "Mayotte",
    "nativeName": "Mayotte",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "262",
    "currency": "USD"
  },
  "ZA": {
    "code": "ZA",
    "name": "South Africa",
    "nativeName": "South Africa",
    "centroid": {
      "lat": -30.5595,
      "lng": 22.9375
    },
    "defaultLang": "en",
    "callingCode": "27",
    "currency": "ZAR"
  },
  "ZM": {
    "code": "ZM",
    "name": "Zambia",
    "nativeName": "Zambia",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "260",
    "currency": "USD"
  },
  "ZW": {
    "code": "ZW",
    "name": "Zimbabwe",
    "nativeName": "Zimbabwe",
    "centroid": {
      "lat": 0,
      "lng": 0
    },
    "defaultLang": "en",
    "callingCode": "263",
    "currency": "USD"
  }
};

const ALL_COUNTRY_CODES = Object.keys(WORLD_COUNTRIES);
const COUNTRY_CENTROIDS = {
  "AC": {
    "lat": 0,
    "lng": 0
  },
  "AD": {
    "lat": 0,
    "lng": 0
  },
  "AE": {
    "lat": 23.4241,
    "lng": 53.8478
  },
  "AF": {
    "lat": 0,
    "lng": 0
  },
  "AG": {
    "lat": 0,
    "lng": 0
  },
  "AI": {
    "lat": 0,
    "lng": 0
  },
  "AL": {
    "lat": 0,
    "lng": 0
  },
  "AM": {
    "lat": 0,
    "lng": 0
  },
  "AO": {
    "lat": 0,
    "lng": 0
  },
  "AR": {
    "lat": 0,
    "lng": 0
  },
  "AS": {
    "lat": 0,
    "lng": 0
  },
  "AT": {
    "lat": 0,
    "lng": 0
  },
  "AU": {
    "lat": -25.2744,
    "lng": 133.7751
  },
  "AW": {
    "lat": 0,
    "lng": 0
  },
  "AX": {
    "lat": 0,
    "lng": 0
  },
  "AZ": {
    "lat": 0,
    "lng": 0
  },
  "BA": {
    "lat": 0,
    "lng": 0
  },
  "BB": {
    "lat": 0,
    "lng": 0
  },
  "BD": {
    "lat": 0,
    "lng": 0
  },
  "BE": {
    "lat": 0,
    "lng": 0
  },
  "BF": {
    "lat": 0,
    "lng": 0
  },
  "BG": {
    "lat": 0,
    "lng": 0
  },
  "BH": {
    "lat": 0,
    "lng": 0
  },
  "BI": {
    "lat": 0,
    "lng": 0
  },
  "BJ": {
    "lat": 0,
    "lng": 0
  },
  "BL": {
    "lat": 0,
    "lng": 0
  },
  "BM": {
    "lat": 0,
    "lng": 0
  },
  "BN": {
    "lat": 0,
    "lng": 0
  },
  "BO": {
    "lat": 0,
    "lng": 0
  },
  "BQ": {
    "lat": 0,
    "lng": 0
  },
  "BR": {
    "lat": -14.235,
    "lng": -51.9253
  },
  "BS": {
    "lat": 0,
    "lng": 0
  },
  "BT": {
    "lat": 0,
    "lng": 0
  },
  "BW": {
    "lat": 0,
    "lng": 0
  },
  "BY": {
    "lat": 0,
    "lng": 0
  },
  "BZ": {
    "lat": 0,
    "lng": 0
  },
  "CA": {
    "lat": 56.1304,
    "lng": -106.3468
  },
  "CC": {
    "lat": 0,
    "lng": 0
  },
  "CD": {
    "lat": 0,
    "lng": 0
  },
  "CF": {
    "lat": 0,
    "lng": 0
  },
  "CG": {
    "lat": 0,
    "lng": 0
  },
  "CH": {
    "lat": 0,
    "lng": 0
  },
  "CI": {
    "lat": 0,
    "lng": 0
  },
  "CK": {
    "lat": 0,
    "lng": 0
  },
  "CL": {
    "lat": 0,
    "lng": 0
  },
  "CM": {
    "lat": 0,
    "lng": 0
  },
  "CN": {
    "lat": 0,
    "lng": 0
  },
  "CO": {
    "lat": 0,
    "lng": 0
  },
  "CR": {
    "lat": 0,
    "lng": 0
  },
  "CU": {
    "lat": 0,
    "lng": 0
  },
  "CV": {
    "lat": 0,
    "lng": 0
  },
  "CW": {
    "lat": 0,
    "lng": 0
  },
  "CX": {
    "lat": 0,
    "lng": 0
  },
  "CY": {
    "lat": 0,
    "lng": 0
  },
  "CZ": {
    "lat": 0,
    "lng": 0
  },
  "DE": {
    "lat": 51.1657,
    "lng": 10.4515
  },
  "DJ": {
    "lat": 0,
    "lng": 0
  },
  "DK": {
    "lat": 0,
    "lng": 0
  },
  "DM": {
    "lat": 0,
    "lng": 0
  },
  "DO": {
    "lat": 0,
    "lng": 0
  },
  "DZ": {
    "lat": 0,
    "lng": 0
  },
  "EC": {
    "lat": 0,
    "lng": 0
  },
  "EE": {
    "lat": 0,
    "lng": 0
  },
  "EG": {
    "lat": 0,
    "lng": 0
  },
  "EH": {
    "lat": 0,
    "lng": 0
  },
  "ER": {
    "lat": 0,
    "lng": 0
  },
  "ES": {
    "lat": 40.4637,
    "lng": -3.7492
  },
  "ET": {
    "lat": 0,
    "lng": 0
  },
  "FI": {
    "lat": 0,
    "lng": 0
  },
  "FJ": {
    "lat": 0,
    "lng": 0
  },
  "FK": {
    "lat": 0,
    "lng": 0
  },
  "FM": {
    "lat": 0,
    "lng": 0
  },
  "FO": {
    "lat": 0,
    "lng": 0
  },
  "FR": {
    "lat": 46.2276,
    "lng": 2.2137
  },
  "GA": {
    "lat": 0,
    "lng": 0
  },
  "GB": {
    "lat": 55.3781,
    "lng": -3.436
  },
  "GD": {
    "lat": 0,
    "lng": 0
  },
  "GE": {
    "lat": 0,
    "lng": 0
  },
  "GF": {
    "lat": 0,
    "lng": 0
  },
  "GG": {
    "lat": 0,
    "lng": 0
  },
  "GH": {
    "lat": 0,
    "lng": 0
  },
  "GI": {
    "lat": 0,
    "lng": 0
  },
  "GL": {
    "lat": 0,
    "lng": 0
  },
  "GM": {
    "lat": 0,
    "lng": 0
  },
  "GN": {
    "lat": 0,
    "lng": 0
  },
  "GP": {
    "lat": 0,
    "lng": 0
  },
  "GQ": {
    "lat": 0,
    "lng": 0
  },
  "GR": {
    "lat": 0,
    "lng": 0
  },
  "GT": {
    "lat": 0,
    "lng": 0
  },
  "GU": {
    "lat": 0,
    "lng": 0
  },
  "GW": {
    "lat": 0,
    "lng": 0
  },
  "GY": {
    "lat": 0,
    "lng": 0
  },
  "HK": {
    "lat": 0,
    "lng": 0
  },
  "HN": {
    "lat": 0,
    "lng": 0
  },
  "HR": {
    "lat": 0,
    "lng": 0
  },
  "HT": {
    "lat": 0,
    "lng": 0
  },
  "HU": {
    "lat": 0,
    "lng": 0
  },
  "ID": {
    "lat": 0,
    "lng": 0
  },
  "IE": {
    "lat": 53.1424,
    "lng": -7.6921
  },
  "IL": {
    "lat": 0,
    "lng": 0
  },
  "IM": {
    "lat": 0,
    "lng": 0
  },
  "IN": {
    "lat": 20.5937,
    "lng": 78.9629
  },
  "IO": {
    "lat": 0,
    "lng": 0
  },
  "IQ": {
    "lat": 0,
    "lng": 0
  },
  "IR": {
    "lat": 0,
    "lng": 0
  },
  "IS": {
    "lat": 0,
    "lng": 0
  },
  "IT": {
    "lat": 41.8719,
    "lng": 12.5674
  },
  "JE": {
    "lat": 0,
    "lng": 0
  },
  "JM": {
    "lat": 0,
    "lng": 0
  },
  "JO": {
    "lat": 0,
    "lng": 0
  },
  "JP": {
    "lat": 36.2048,
    "lng": 138.2529
  },
  "KE": {
    "lat": 0,
    "lng": 0
  },
  "KG": {
    "lat": 0,
    "lng": 0
  },
  "KH": {
    "lat": 0,
    "lng": 0
  },
  "KI": {
    "lat": 0,
    "lng": 0
  },
  "KM": {
    "lat": 0,
    "lng": 0
  },
  "KN": {
    "lat": 0,
    "lng": 0
  },
  "KP": {
    "lat": 0,
    "lng": 0
  },
  "KR": {
    "lat": 0,
    "lng": 0
  },
  "KW": {
    "lat": 0,
    "lng": 0
  },
  "KY": {
    "lat": 0,
    "lng": 0
  },
  "KZ": {
    "lat": 0,
    "lng": 0
  },
  "LA": {
    "lat": 0,
    "lng": 0
  },
  "LB": {
    "lat": 0,
    "lng": 0
  },
  "LC": {
    "lat": 0,
    "lng": 0
  },
  "LI": {
    "lat": 0,
    "lng": 0
  },
  "LK": {
    "lat": 0,
    "lng": 0
  },
  "LR": {
    "lat": 0,
    "lng": 0
  },
  "LS": {
    "lat": 0,
    "lng": 0
  },
  "LT": {
    "lat": 0,
    "lng": 0
  },
  "LU": {
    "lat": 0,
    "lng": 0
  },
  "LV": {
    "lat": 0,
    "lng": 0
  },
  "LY": {
    "lat": 0,
    "lng": 0
  },
  "MA": {
    "lat": 0,
    "lng": 0
  },
  "MC": {
    "lat": 0,
    "lng": 0
  },
  "MD": {
    "lat": 0,
    "lng": 0
  },
  "ME": {
    "lat": 0,
    "lng": 0
  },
  "MF": {
    "lat": 0,
    "lng": 0
  },
  "MG": {
    "lat": 0,
    "lng": 0
  },
  "MH": {
    "lat": 0,
    "lng": 0
  },
  "MK": {
    "lat": 0,
    "lng": 0
  },
  "ML": {
    "lat": 0,
    "lng": 0
  },
  "MM": {
    "lat": 0,
    "lng": 0
  },
  "MN": {
    "lat": 0,
    "lng": 0
  },
  "MO": {
    "lat": 0,
    "lng": 0
  },
  "MP": {
    "lat": 0,
    "lng": 0
  },
  "MQ": {
    "lat": 0,
    "lng": 0
  },
  "MR": {
    "lat": 0,
    "lng": 0
  },
  "MS": {
    "lat": 0,
    "lng": 0
  },
  "MT": {
    "lat": 0,
    "lng": 0
  },
  "MU": {
    "lat": 0,
    "lng": 0
  },
  "MV": {
    "lat": 0,
    "lng": 0
  },
  "MW": {
    "lat": 0,
    "lng": 0
  },
  "MX": {
    "lat": 23.6345,
    "lng": -102.5528
  },
  "MY": {
    "lat": 4.2105,
    "lng": 101.9758
  },
  "MZ": {
    "lat": 0,
    "lng": 0
  },
  "NA": {
    "lat": 0,
    "lng": 0
  },
  "NC": {
    "lat": 0,
    "lng": 0
  },
  "NE": {
    "lat": 0,
    "lng": 0
  },
  "NF": {
    "lat": 0,
    "lng": 0
  },
  "NG": {
    "lat": 0,
    "lng": 0
  },
  "NI": {
    "lat": 0,
    "lng": 0
  },
  "NL": {
    "lat": 52.1326,
    "lng": 5.2913
  },
  "NO": {
    "lat": 0,
    "lng": 0
  },
  "NP": {
    "lat": 0,
    "lng": 0
  },
  "NR": {
    "lat": 0,
    "lng": 0
  },
  "NU": {
    "lat": 0,
    "lng": 0
  },
  "NZ": {
    "lat": -40.9006,
    "lng": 174.886
  },
  "OM": {
    "lat": 0,
    "lng": 0
  },
  "PA": {
    "lat": 0,
    "lng": 0
  },
  "PE": {
    "lat": 0,
    "lng": 0
  },
  "PF": {
    "lat": 0,
    "lng": 0
  },
  "PG": {
    "lat": 0,
    "lng": 0
  },
  "PH": {
    "lat": 0,
    "lng": 0
  },
  "PK": {
    "lat": 0,
    "lng": 0
  },
  "PL": {
    "lat": 0,
    "lng": 0
  },
  "PM": {
    "lat": 0,
    "lng": 0
  },
  "PR": {
    "lat": 0,
    "lng": 0
  },
  "PS": {
    "lat": 0,
    "lng": 0
  },
  "PT": {
    "lat": 0,
    "lng": 0
  },
  "PW": {
    "lat": 0,
    "lng": 0
  },
  "PY": {
    "lat": 0,
    "lng": 0
  },
  "QA": {
    "lat": 0,
    "lng": 0
  },
  "RE": {
    "lat": 0,
    "lng": 0
  },
  "RO": {
    "lat": 0,
    "lng": 0
  },
  "RS": {
    "lat": 0,
    "lng": 0
  },
  "RU": {
    "lat": 0,
    "lng": 0
  },
  "RW": {
    "lat": 0,
    "lng": 0
  },
  "SA": {
    "lat": 23.8859,
    "lng": 45.0792
  },
  "SB": {
    "lat": 0,
    "lng": 0
  },
  "SC": {
    "lat": 0,
    "lng": 0
  },
  "SD": {
    "lat": 0,
    "lng": 0
  },
  "SE": {
    "lat": 0,
    "lng": 0
  },
  "SG": {
    "lat": 1.3521,
    "lng": 103.8198
  },
  "SH": {
    "lat": 0,
    "lng": 0
  },
  "SI": {
    "lat": 0,
    "lng": 0
  },
  "SJ": {
    "lat": 0,
    "lng": 0
  },
  "SK": {
    "lat": 0,
    "lng": 0
  },
  "SL": {
    "lat": 0,
    "lng": 0
  },
  "SM": {
    "lat": 0,
    "lng": 0
  },
  "SN": {
    "lat": 0,
    "lng": 0
  },
  "SO": {
    "lat": 0,
    "lng": 0
  },
  "SR": {
    "lat": 0,
    "lng": 0
  },
  "SS": {
    "lat": 0,
    "lng": 0
  },
  "ST": {
    "lat": 0,
    "lng": 0
  },
  "SV": {
    "lat": 0,
    "lng": 0
  },
  "SX": {
    "lat": 0,
    "lng": 0
  },
  "SY": {
    "lat": 0,
    "lng": 0
  },
  "SZ": {
    "lat": 0,
    "lng": 0
  },
  "TA": {
    "lat": 0,
    "lng": 0
  },
  "TC": {
    "lat": 0,
    "lng": 0
  },
  "TD": {
    "lat": 0,
    "lng": 0
  },
  "TG": {
    "lat": 0,
    "lng": 0
  },
  "TH": {
    "lat": 0,
    "lng": 0
  },
  "TJ": {
    "lat": 0,
    "lng": 0
  },
  "TK": {
    "lat": 0,
    "lng": 0
  },
  "TL": {
    "lat": 0,
    "lng": 0
  },
  "TM": {
    "lat": 0,
    "lng": 0
  },
  "TN": {
    "lat": 0,
    "lng": 0
  },
  "TO": {
    "lat": 0,
    "lng": 0
  },
  "TR": {
    "lat": 0,
    "lng": 0
  },
  "TT": {
    "lat": 0,
    "lng": 0
  },
  "TV": {
    "lat": 0,
    "lng": 0
  },
  "TW": {
    "lat": 0,
    "lng": 0
  },
  "TZ": {
    "lat": 0,
    "lng": 0
  },
  "UA": {
    "lat": 0,
    "lng": 0
  },
  "UG": {
    "lat": 0,
    "lng": 0
  },
  "US": {
    "lat": 37.0902,
    "lng": -95.7129
  },
  "UY": {
    "lat": 0,
    "lng": 0
  },
  "UZ": {
    "lat": 0,
    "lng": 0
  },
  "VA": {
    "lat": 0,
    "lng": 0
  },
  "VC": {
    "lat": 0,
    "lng": 0
  },
  "VE": {
    "lat": 0,
    "lng": 0
  },
  "VG": {
    "lat": 0,
    "lng": 0
  },
  "VI": {
    "lat": 0,
    "lng": 0
  },
  "VN": {
    "lat": 0,
    "lng": 0
  },
  "VU": {
    "lat": 0,
    "lng": 0
  },
  "WF": {
    "lat": 0,
    "lng": 0
  },
  "WS": {
    "lat": 0,
    "lng": 0
  },
  "XK": {
    "lat": 0,
    "lng": 0
  },
  "YE": {
    "lat": 0,
    "lng": 0
  },
  "YT": {
    "lat": 0,
    "lng": 0
  },
  "ZA": {
    "lat": -30.5595,
    "lng": 22.9375
  },
  "ZM": {
    "lat": 0,
    "lng": 0
  },
  "ZW": {
    "lat": 0,
    "lng": 0
  }
};

function getCountry(code) {
  return WORLD_COUNTRIES[String(code || '').toUpperCase()] || null;
}

module.exports = {
  WORLD_COUNTRIES,
  ALL_COUNTRY_CODES,
  COUNTRY_CENTROIDS,
  getCountry
};
