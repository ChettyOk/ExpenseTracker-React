/**
 * Copies public/logo.png into cap-web/ so the native Capacitor shell shows branding.
 * Run automatically before `cap sync` via npm scripts.
 */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SRC = join(ROOT, "public", "logo.png");
const DEST_DIR = join(ROOT, "cap-web");
const DEST = join(DEST_DIR, "logo.png");

if (!existsSync(SRC)) {
  console.error("sync-cap-web-logo: missing", SRC);
  process.exit(1);
}
mkdirSync(DEST_DIR, { recursive: true });
copyFileSync(SRC, DEST);
