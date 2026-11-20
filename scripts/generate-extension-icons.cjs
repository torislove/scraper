'use strict';

/**
 * generate-extension-icons.cjs
 *
 * Produces extension/icons/icon{16,32,48,128}.png with no dependencies.
 *
 * The mark is the same one used in the web app: an emerald rounded square with
 * a white location pin. It is drawn with signed-distance maths so it stays
 * crisp at 16 px, where a letterform would turn to mud.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT_DIR = path.resolve(__dirname, '..', 'extension', 'icons');

/* ---- PNG encoding ------------------------------------------------------- */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // colour type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

/* ---- drawing ------------------------------------------------------------ */

function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t)
  ];
}

function coverage(distance, feather) {
  // distance < 0 inside the shape
  return Math.max(0, Math.min(1, 0.5 - distance / feather));
}

function drawIcon(size) {
  const px = Buffer.alloc(size * size * 4);
  const S = size;

  const radius = S * 0.22;
  const inset = S * 0.02;

  // Pin geometry
  const pinR = S * 0.20;
  const pinCx = S * 0.5;
  const pinCy = S * 0.42;
  const holeR = pinR * 0.40;

  const emerald = [5, 150, 105];
  const teal = [13, 148, 136];

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const cx = x + 0.5;
      const cy = y + 0.5;

      // Rounded-square signed distance
      const halfW = S / 2 - inset;
      const qx = Math.abs(cx - S / 2) - (halfW - radius);
      const qy = Math.abs(cy - S / 2) - (halfW - radius);
      const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
      const inside = Math.min(Math.max(qx, qy), 0);
      const squareDist = outside + inside - radius;

      const bgAlpha = coverage(squareDist, Math.max(1, S * 0.04));
      if (bgAlpha <= 0) continue;

      // Vertical emerald → teal gradient
      const t = y / Math.max(1, S - 1);
      const bg = mix(emerald, teal, t);

      // Pin: circle head + a cone whose apex points down, merged cleanly.
      const headDist = Math.hypot(cx - pinCx, cy - pinCy) - pinR;

      const tipY = pinCy + pinR * 2.0;
      let tailDist = 1e9;
      if (cy >= pinCy && cy <= tipY) {
        const shrink = 1 - (cy - pinCy) / Math.max(1, tipY - pinCy);
        tailDist = Math.abs(cx - pinCx) - pinR * shrink;
      }

      const pinDist = Math.min(headDist, tailDist);
      const pinAlpha = coverage(pinDist, Math.max(1, S * 0.05));

      // Punch the hole
      const holeDist = Math.hypot(cx - pinCx, cy - pinCy) - holeR;
      const holeAlpha = coverage(holeDist, Math.max(1, S * 0.05));

      const pinFill = pinAlpha * (1 - holeAlpha);

      const r = Math.round(bg[0] * (1 - pinFill) + 255 * pinFill);
      const g = Math.round(bg[1] * (1 - pinFill) + 255 * pinFill);
      const b = Math.round(bg[2] * (1 - pinFill) + 255 * pinFill);

      const i = (y * S + x) * 4;
      px[i] = r;
      px[i + 1] = g;
      px[i + 2] = b;
      px[i + 3] = Math.round(255 * bgAlpha);
    }
  }

  return px;
}

/* ---- main --------------------------------------------------------------- */

fs.mkdirSync(OUT_DIR, { recursive: true });

const sizes = [16, 32, 48, 128];
for (const size of sizes) {
  const rgba = drawIcon(size);
  const png = encodePng(size, size, rgba);
  const file = path.join(OUT_DIR, `icon${size}.png`);
  fs.writeFileSync(file, png);
  console.log(`[icons] ${path.relative(process.cwd(), file)}  ${png.length} bytes`);
}

console.log('[icons] done');
