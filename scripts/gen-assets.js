/**
 * Generates:
 *   assets/icon-only.png       1024×1024  RGB   — gold bg, ivory hourglass
 *   assets/icon-foreground.png 1024×1024  RGBA  — transparent bg, ivory hourglass
 *   assets/splash.png          2732×2732  RGB   — gold bg, ivory hourglass
 *
 * Pure Node.js — no external dependencies (uses built-in zlib).
 * Design: hourglass represents time (Time Bridge brand).
 */

const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ── Colours ─────────────────────────────────────────────────────────────────
const GOLD        = { r: 184, g: 150, b: 90,  a: 255 }; // #B8965A
const IVORY       = { r: 250, g: 247, b: 242, a: 255 }; // #FAF7F2
const TRANSPARENT = { r: 0,   g: 0,   b: 0,   a: 0   };

// ── PNG helpers ──────────────────────────────────────────────────────────────
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

// colorType 2 = RGB, colorType 6 = RGBA
function makePNG(rawBuf, width, height, colorType = 2) {
  const compressed = zlib.deflateSync(rawBuf, { level: 1 });
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(width,  0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = colorType; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    PNG_SIG,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Hourglass geometry helper ────────────────────────────────────────────────
// Returns { spanL, spanR } of hourglass pixels for a given row y.
// spanL === -1 means the row is outside the hourglass entirely.
function hourglassSpan(y, cx, cy, scale, halfW, neckHW, neckHH) {
  const topY = cy - scale;
  const botY = cy + scale;

  if (y >= cy - neckHH && y <= cy + neckHH) {
    return { spanL: Math.round(cx - neckHW), spanR: Math.round(cx + neckHW) };
  }
  if (y >= topY && y <= cy) {
    const t  = (cy - y) / (cy - topY);
    const hw = halfW * t;
    return { spanL: Math.round(cx - hw), spanR: Math.round(cx + hw) };
  }
  if (y > cy && y <= botY) {
    const t  = (y - cy) / (botY - cy);
    const hw = halfW * t;
    return { spanL: Math.round(cx - hw), spanR: Math.round(cx + hw) };
  }
  return { spanL: -1, spanR: -1 };
}

// ── RGB rasteriser (icon-only + splash) ─────────────────────────────────────
// Gold background, ivory hourglass.
function rasteriseRGB(width, height) {
  const cx = width / 2, cy = height / 2;
  const scale = Math.min(width, height) * 0.80 / 2;
  const halfW = scale * 0.92;
  const neckHW = scale * 0.065;
  const neckHH = scale * 0.040;

  const rb  = width * 3 + 1;
  const buf = Buffer.allocUnsafe(rb * height);

  for (let y = 0; y < height; y++) {
    buf[y * rb] = 0;
    const { spanL, spanR } = hourglassSpan(y, cx, cy, scale, halfW, neckHW, neckHH);
    const base = y * rb + 1;
    for (let x = 0; x < width; x++) {
      const c = (x >= spanL && x <= spanR) ? IVORY : GOLD;
      buf[base + x * 3]     = c.r;
      buf[base + x * 3 + 1] = c.g;
      buf[base + x * 3 + 2] = c.b;
    }
  }
  return buf;
}

// ── RGBA rasteriser (icon-foreground) ───────────────────────────────────────
// Transparent background, ivory hourglass (fully opaque).
// The background colour (#FAF7F2) is supplied to the generator tool separately.
function rasteriseRGBA(width, height) {
  const cx = width / 2, cy = height / 2;
  const scale = Math.min(width, height) * 0.80 / 2;
  const halfW = scale * 0.92;
  const neckHW = scale * 0.065;
  const neckHH = scale * 0.040;

  const rb  = width * 4 + 1; // RGBA: 4 bytes per pixel
  const buf = Buffer.allocUnsafe(rb * height);

  for (let y = 0; y < height; y++) {
    buf[y * rb] = 0;
    const { spanL, spanR } = hourglassSpan(y, cx, cy, scale, halfW, neckHW, neckHH);
    const base = y * rb + 1;
    for (let x = 0; x < width; x++) {
      const c = (x >= spanL && x <= spanR) ? IVORY : TRANSPARENT;
      buf[base + x * 4]     = c.r;
      buf[base + x * 4 + 1] = c.g;
      buf[base + x * 4 + 2] = c.b;
      buf[base + x * 4 + 3] = c.a;
    }
  }
  return buf;
}

// ── Generate all files ───────────────────────────────────────────────────────
const assetsDir = path.join(__dirname, '..', 'assets');
fs.mkdirSync(assetsDir, { recursive: true });

console.log('Generating icon-only.png (1024×1024, RGB)…');
fs.writeFileSync(
  path.join(assetsDir, 'icon-only.png'),
  makePNG(rasteriseRGB(1024, 1024), 1024, 1024, 2)
);
console.log('✓  assets/icon-only.png');

console.log('Generating icon-foreground.png (1024×1024, RGBA)…');
fs.writeFileSync(
  path.join(assetsDir, 'icon-foreground.png'),
  makePNG(rasteriseRGBA(1024, 1024), 1024, 1024, 6)
);
console.log('✓  assets/icon-foreground.png');

console.log('Generating splash.png (2732×2732, RGB)…');
fs.writeFileSync(
  path.join(assetsDir, 'splash.png'),
  makePNG(rasteriseRGB(2732, 2732), 2732, 2732, 2)
);
console.log('✓  assets/splash.png');
