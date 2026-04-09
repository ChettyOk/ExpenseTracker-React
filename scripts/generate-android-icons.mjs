/**
 * Generates Android mipmap launcher assets and splash PNGs from public/logo.png.
 * Run: node scripts/generate-android-icons.mjs
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const LOGO = join(ROOT, "public", "logo.png");
const RES = join(ROOT, "android", "app", "src", "main", "res");

const BRAND = { r: 13, g: 148, b: 136, alpha: 1 }; // #0d9488

/** Adaptive icon foreground layer sizes per density. */
const FOREGROUND = [
  { folder: "mipmap-mdpi", px: 108 },
  { folder: "mipmap-hdpi", px: 162 },
  { folder: "mipmap-xhdpi", px: 216 },
  { folder: "mipmap-xxhdpi", px: 324 },
  { folder: "mipmap-xxxhdpi", px: 432 },
];

/** Legacy full launcher icon sizes (48dp baseline). */
const LEGACY = [
  { folder: "mipmap-mdpi", px: 48 },
  { folder: "mipmap-hdpi", px: 72 },
  { folder: "mipmap-xhdpi", px: 96 },
  { folder: "mipmap-xxhdpi", px: 144 },
  { folder: "mipmap-xxxhdpi", px: 192 },
];

async function foregroundLayer(size) {
  const inner = Math.round(size * 0.62);
  const resized = await sharp(LOGO)
    .ensureAlpha()
    .resize(inner, inner, { fit: "inside" })
    .toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: resized, gravity: "center" }])
    .png();
}

async function fullLauncherOnBrand(size) {
  const pad = Math.round(size * 0.12);
  const inner = size - pad * 2;
  const resized = await sharp(LOGO)
    .ensureAlpha()
    .resize(inner, inner, { fit: "inside" })
    .toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { ...BRAND, alpha: 1 },
    },
  })
    .composite([{ input: resized, gravity: "center" }])
    .png();
}

async function splashScreen(width, height) {
  const logoMax = Math.round(Math.min(width, height) * 0.28);
  const resized = await sharp(LOGO)
    .ensureAlpha()
    .resize(logoMax, logoMax, { fit: "inside" })
    .toBuffer();

  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { ...BRAND, alpha: 1 },
    },
  })
    .composite([{ input: resized, gravity: "center" }])
    .png();
}

function walkSplashFiles(dir, acc = []) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walkSplashFiles(p, acc);
    else if (e.name === "splash.png") acc.push(p);
  }
  return acc;
}

async function main() {
  statSync(LOGO);

  console.log("Generating launcher mipmaps from", LOGO);

  for (const { folder, px } of FOREGROUND) {
    const dir = join(RES, folder);
    mkdirSync(dir, { recursive: true });
    const out = join(dir, "ic_launcher_foreground.png");
    const fg = await foregroundLayer(px);
    await fg.toFile(out);
    console.log("  wrote", out);
  }

  for (const { folder, px } of LEGACY) {
    const dir = join(RES, folder);
    mkdirSync(dir, { recursive: true });
    const png = await fullLauncherOnBrand(px);
    await png.toFile(join(dir, "ic_launcher.png"));
    await png.toFile(join(dir, "ic_launcher_round.png"));
    console.log("  wrote", join(dir, "ic_launcher.png (+ round)"));
  }

  const splashes = walkSplashFiles(RES);
  console.log("Generating splash screens:", splashes.length);
  for (const file of splashes) {
    const meta = await sharp(file).metadata();
    const w = meta.width ?? 1080;
    const h = meta.height ?? 1920;
    const splash = await splashScreen(w, h);
    await splash.toFile(file);
    console.log("  wrote", file, `${w}x${h}`);
  }

  execFileSync(process.execPath, [join(__dirname, "sync-cap-web-logo.mjs")], {
    stdio: "inherit",
    cwd: ROOT,
  });

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
