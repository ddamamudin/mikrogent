// One-off script: generate PWA icons + favicon dari public/mikroplay-logo.png
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const SRC = "public/mikroplay-logo.png";
const TARGETS = [
  { out: "public/icon-192.png", size: 192, padding: 0 },
  { out: "public/icon-512.png", size: 512, padding: 0 },
  // Maskable: 80% safe zone (logo dengan 10% padding di tiap sisi)
  { out: "public/icon-maskable-512.png", size: 512, padding: 0.1, bg: { r: 255, g: 255, b: 255, alpha: 1 } },
  { out: "public/apple-touch-icon-180.png", size: 180, padding: 0, bg: { r: 255, g: 255, b: 255, alpha: 1 } },
  { out: "public/favicon-32.png", size: 32, padding: 0 },
];

for (const t of TARGETS) {
  await mkdir(dirname(t.out), { recursive: true });
  const inner = Math.round(t.size * (1 - 2 * t.padding));
  const offset = Math.round((t.size - inner) / 2);

  const resizedLogo = await sharp(SRC)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  let pipeline = sharp({
    create: {
      width: t.size,
      height: t.size,
      channels: 4,
      background: t.bg ?? { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }).composite([{ input: resizedLogo, top: offset, left: offset }]);

  await pipeline.png().toFile(t.out);
  console.log(`  ✔ ${t.out} (${t.size}x${t.size}${t.padding ? `, padding ${t.padding * 100}%` : ""})`);
}
console.log("Done.");
