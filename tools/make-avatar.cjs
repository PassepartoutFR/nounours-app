// Génère l'avatar de marque « Un web de gentil » (le nounours) en haute
// résolution, SANS dépendance — même technique que make-icons.cjs.
// Plein cadre sur fond miel (propre en cercle ET en carré arrondi, les deux
// formats d'avatar GitHub). Sorties : brand/avatar-512.png et brand/avatar-1024.png.
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
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
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
  // fond miel PLEIN (opaque) — propre en cercle comme en carré
  for (let i = 0; i < sz * sz; i++) { px[i*4]=0xf4; px[i*4+1]=0xa9; px[i*4+2]=0x3b; px[i*4+3]=255; }

  const S = (v) => v * sz;
  const BROWN = [0xa8, 0x6a, 0x35], DARK = [0x3a, 0x2a, 0x1e],
        CREAM = [0xff, 0xf1, 0xd6], INNER = [0xc9, 0x8a, 0x4b],
        SHINE = [0xff, 0xff, 0xff];
  // oreilles
  disc(S(0.27), S(0.28), S(0.16), BROWN); disc(S(0.73), S(0.28), S(0.16), BROWN);
  disc(S(0.27), S(0.28), S(0.078), INNER); disc(S(0.73), S(0.28), S(0.078), INNER);
  // tête + museau
  disc(S(0.50), S(0.55), S(0.37), BROWN);
  disc(S(0.50), S(0.67), S(0.185), CREAM);
  // yeux (avec un point de lumière pour le côté « gentil »)
  disc(S(0.385), S(0.50), S(0.052), DARK); disc(S(0.615), S(0.50), S(0.052), DARK);
  disc(S(0.40), S(0.485), S(0.016), SHINE); disc(S(0.63), S(0.485), S(0.016), SHINE);
  // nez
  disc(S(0.50), S(0.635), S(0.058), DARK);
  return encodePNG(sz, sz, px);
}

const dir = path.join(__dirname, "..", "brand");
fs.mkdirSync(dir, { recursive: true });
for (const sz of [512, 1024]) {
  const f = path.join(dir, "avatar-" + sz + ".png");
  fs.writeFileSync(f, make(sz));
  console.log("écrit " + f + " (" + fs.statSync(f).size + " o)");
}
