'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');

const BINARY_PATH = path.resolve(__dirname, '../server/bin/google_maps_scraper.exe');
console.log('Binary exists?', fs.existsSync(BINARY_PATH));

const tmpDir = os.tmpdir();
const inputPath = path.join(tmpDir, 'test_input.txt');
const outputPath = path.join(tmpDir, 'test_output.json');

fs.writeFileSync(inputPath, 'Dentists in Brodipet, Guntur', 'utf8');

const args = [
  '-input', inputPath,
  '-results', outputPath,
  '-json',
  '-fast-mode',
  '-geo', '16.3075,80.4350',
  '-radius', '1500',
  '-depth', '1'
];

console.log('Running Gosom:', BINARY_PATH, args.join(' '));
const proc = spawn(BINARY_PATH, args, { windowsHide: true });

let stdout = '';
let stderr = '';
proc.stdout.on('data', d => { stdout += d; });
proc.stderr.on('data', d => { stderr += d; });

proc.on('close', code => {
  console.log('Gosom exit code:', code);
  console.log('Stderr:', stderr.slice(0, 500));
  console.log('Stdout:', stdout.slice(0, 500));
  if (fs.existsSync(outputPath)) {
    const data = fs.readFileSync(outputPath, 'utf8');
    console.log('Output file length:', data.length);
    console.log('Output preview:', data.slice(0, 500));
  } else {
    console.log('Output file does NOT exist!');
  }
});
