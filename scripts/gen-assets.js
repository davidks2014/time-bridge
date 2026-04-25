/**
 * Generates assets/icon-only.png (1024×1024) and assets/splash.png (2732×2732)
 * Pure Node.js — no external dependencies (uses built-in zlib).
 *
 * Design: gold (#B8965A) background, ivory (#FAF7F2) hourglass centred.
 * The hourglass represents time (Time Bridge).
 */

const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ── Colours ────────────────────────────────────────────────────────────────
const GOLD  = { r: 184, g: 150, b: 90  }; // #B8965A
const IVORY = { r: 250, g: 247, b: 242 }; // #FAF7F2

// ── PNG helpers ─────────────────────────────────────────────────────────────
function buildCrcTable() {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
}
const CRC_TABLE = buildCrcTable();

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.allocUnsafe(4); len.writeUInt32BE(data.length);
  const td  = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.allocUnsafe(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function makePNG(rawBuf, width, height) {
  const compressed = zlib.deflateSync(rawBuf, { level: 1 });

  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(width,  0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  return Buffer.concat([
    PNG_SIG,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Image rasteriser ─────────────────────────────────────────────────────────
// Draws an ivory hourglass centred on a gold background.
// The hourglass is formed by two opposing triangles that meet at the waist.
//
//   top ────────────── (wide)
//        \            /
//          \        /
//     neck  [══════]   ← thin ivory bridge at waist
//          /        \
//        /            \
//   bot ────────────── (wide)
//
function rasterise(width, height) {
  const cx = width  / 2;
  const cy = height / 2;

  // Hourglass metrics, scaled to 80 % of the smaller dimension
  const scale  = Math.min(width, height) * 0.80 / 2; // half-height of each half
  const halfW  = scale * 0.92;   // half-width of wide base
  const topY   = cy - scale;     // y of top baseline
  const botY   = cy + scale;     // y of bottom baseline
  const neckHW = scale * 0.065;  // neck half-width  (≈ 6 % of scale)
  const neckHH = scale * 0.040;  // neck half-height (≈ 4 % of scale)

  const rb  = width * 3 + 1; // row bytes (filter + RGB)
  const buf = Buffer.allocUnsafe(rb * height);

  for (let y = 0; y < height; y++) {
    buf[y * rb] = 0; // filter byte: None

    // Compute IVORY x-span for this row (hourglass body)
    let spanL = -1, spanR = -1;

    if (y >= topY && y <= cy) {
      // Upper half of hourglass — narrow toward waist
      const t  = (cy - y) / (cy - topY); // 1 at top, 0 at waist
      const hw = halfW * t;
      spanL = Math.round(cx - hw);
      spanR = Math.round(cx + hw);
    }

    if (y > cy && y <= botY) {
      // Lower half of hourglass — widens from waist
      const t  = (y - cy) / (botY - cy); // 0 at waist, 1 at bottom
      const hw = halfW * t;
      spanL = Math.round(cx - hw);
      spanR = Math.round(cx + hw);
    }

    // Neck — thin ivory bridge connecting the two halves at the waist
    if (y >= cy - neckHH && y <= cy + neckHH) {
      spanL = Math.round(cx - neckHW);
      spanR = Math.round(cx + neckHW);
    }

    const base = y * rb + 1;
    for (let x = 0; x < width; x++) {
      const inHourglass = (x >= spanL && x <= spanR);
      const c = inHourglass ? IVORY : GOLD;
      buf[base + x * 3]     = c.r;
      buf[base + x * 3 + 1] = c.g;
      buf[base + x * 3 + 2] = c.b;
    }
  }

  return buf;
}

// ── Generate files ───────────────────────────────────────────────────────────
const assetsDir = path.join(__dirname, '..', 'assets');
fs.mkdirSync(assetsDir, { recursive: true });

console.log('Generating icon-only.png (1024×1024)…');
const iconBuf = rasterise(1024, 1024);
fs.writeFileSync(path.join(assetsDir, 'icon-only.png'), makePNG(iconBuf, 1024, 1024));
console.log('✓  assets/icon-only.png written');

console.log('Generating splash.png (2732×2732)…');
const splashBuf = rasterise(2732, 2732);
fs.writeFileSync(path.join(assetsDir, 'splash.png'), makePNG(splashBuf, 2732, 2732));
console.log('✓  assets/splash.png written');
