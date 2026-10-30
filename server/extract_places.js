const fs = require('fs');

const code = fs.readFileSync('index.js', 'utf8');

// Simple regex matching for functions.
// We will just do a rough extraction and fix it up if needed.
const startStr = 'async function scrapeGooglePlaces';
const startIndex = code.indexOf(startStr);

// A simple curly brace matcher to find the end of the function
let count = 0;
let endIndex = -1;
let started = false;

for (let i = startIndex; i < code.length; i++) {
    if (code[i] === '{') {
        count++;
        started = true;
    } else if (code[i] === '}') {
        count--;
    }
    if (started && count === 0) {
        endIndex = i + 1;
        break;
    }
}

const funcCode = code.substring(startIndex, endIndex);

const startStr2 = 'async function scrapeWebsiteForSocials';
const startIndex2 = code.indexOf(startStr2);
let count2 = 0;
let endIndex2 = -1;
let started2 = false;

for (let i = startIndex2; i < code.length; i++) {
    if (code[i] === '{') {
        count2++;
        started2 = true;
    } else if (code[i] === '}') {
        count2--;
    }
    if (started2 && count2 === 0) {
        endIndex2 = i + 1;
        break;
    }
}

const funcCode2 = code.substring(startIndex2, endIndex2);


const header = `
const cheerio = require('cheerio');
const axios = require('axios');
const StagingLead = require('../models/StagingLead');
const { getBrowser, chromium } = require('./browserFactory');
const { verifyWithAI } = require('../utils/aiParser');

// Global state variables passed from index.js
let globalAbortSignal = { aborted: false };
let addLog = console.log;

function setDeps({ logger, abortSignal }) {
    addLog = logger;
    globalAbortSignal = abortSignal;
}

`;

const footer = `
module.exports = { scrapeGooglePlaces, setDeps };
`;

fs.writeFileSync('src/scrapers/engine-google-places.js', header + funcCode2 + '\n\n' + funcCode + footer);
console.log('Extracted engine-google-places.js');
