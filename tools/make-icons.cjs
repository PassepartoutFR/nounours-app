// Génère les icônes de l'extension (16/32/48/128 px) sans dépendance :
// un nounours dessiné en cercles sur fond miel arrondi, encodé en PNG via zlib.
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (~c) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
function encodePNG(w, h, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit, RGBA
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0; // filtre 0
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

function rrCoverage(x, y, sz, rad) {
  const px = x + 0.5 - sz / 2, py = y + 0.5 - sz / 2, half = sz / 2;
  const qx = Math.abs(px) - (half - rad), qy = Math.abs(py) - (half - rad);
  const out = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
  const ins = Math.min(Math.max(qx, qy), 0);
  const sdf = out + ins - rad;
  return Math.max(0, Math.min(1, 0.5 - sdf));
}

function make(sz) {
  const px = Buffer.alloc(sz * sz * 4);
  const set = (x, y, r, g, b, a) => {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= sz || y >= sz || a <= 0) return;
    const i = (y * sz + x) * 4, ea = px[i + 3] / 255, na = a / 255;
    const oa = na + ea * (1 - na);
    if (oa <= 0) return;
    px[i]     = Math.round((r * na + px[i]     * ea * (1 - na)) / oa);
    px[i + 1] = Math.round((g * na + px[i + 1] * ea * (1 - na)) / oa);
    px[i + 2] = Math.round((b * na + px[i + 2] * ea * (1 - na)) / oa);
    px[i + 3] = Math.round(oa * 255);
  };
  const disc = (cx, cy, r, col) => {
    for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++)
      for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        const cov = Math.max(0, Math.min(1, r - d + 0.5));
        if (cov > 0) set(x, y, col[0], col[1], col[2], 255 * cov);
      }
  };
  // fond miel arrondi
  const rad = sz * 0.22;
  for (let y = 0; y < sz; y++)
    for (let x = 0; x < sz; x++) {
      const c = rrCoverage(x, y, sz, rad);
      if (c > 0) set(x, y, 0xf4, 0xa9, 0x3b, 255 * c);
    }
  const S = (v) => v * sz;
  const BROWN = [0xa8, 0x6a, 0x35], DARK = [0x3a, 0x2a, 0x1e], CREAM = [0xff, 0xf1, 0xd6], INNER = [0xc9, 0x8a, 0x4b];
  disc(S(0.30), S(0.30), S(0.145), BROWN); disc(S(0.70), S(0.30), S(0.145), BROWN); // oreilles
  disc(S(0.30), S(0.30), S(0.07), INNER);  disc(S(0.70), S(0.30), S(0.07), INNER);
  disc(S(0.50), S(0.55), S(0.34), BROWN);  // tête
  disc(S(0.50), S(0.66), S(0.17), CREAM);  // museau
  disc(S(0.40), S(0.50), S(0.05), DARK);   disc(S(0.60), S(0.50), S(0.05), DARK); // yeux
  disc(S(0.50), S(0.625), S(0.055), DARK); // nez
  return encodePNG(sz, sz, px);
}

const dir = path.join(__dirname, "..", "icons");
fs.mkdirSync(dir, { recursive: true });
for (const sz of [16, 32, 48, 128]) {
  const f = path.join(dir, "icon" + sz + ".png");
  fs.writeFileSync(f, make(sz));
  console.log("écrit " + f + " (" + fs.statSync(f).size + " o)");
}
