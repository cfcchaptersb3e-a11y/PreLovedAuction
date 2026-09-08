/**
 * Renders every handout to a PNG for sharing and a PDF for printing.
 *
 * A4 at 300dpi, so the same file works pasted into a chat and pinned to a
 * noticeboard. Reports any sheet whose content does not fit the page rather
 * than quietly cropping the footer off.
 *
 *   npm run handouts:seed          # sample data
 *   npm run build && npm start     # the app the screenshots come from
 *   node handouts/shoot.mjs        # photograph it
 *   npm run handouts               # this
 */
import { chromium } from "playwright";
import QRCode from "qrcode";
import { readFileSync, existsSync, mkdirSync, readdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { renderSheet } from "./template.mjs";
import { SHEETS } from "./sheets.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const OUT = join(HERE, "out");
const SHOTS = join(HERE, "shots");
const URL_TEXT = process.env.HANDOUT_URL ?? "cfc-sb3e-auctions.vercel.app";
const EXE = process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

const dataUri = (file) => "data:image/png;base64," + readFileSync(file).toString("base64");

mkdirSync(OUT, { recursive: true });

const shots = Object.fromEntries(
  readdirSync(SHOTS).filter((f) => f.endsWith(".png"))
    .map((f) => [f.replace(/\.png$/, ""), dataUri(join(SHOTS, f))])
);

const qrFile = join(OUT, "qr.png");
await QRCode.toFile(qrFile, `https://${URL_TEXT}`, {
  width: 900, margin: 1, errorCorrectionLevel: "M",
  color: { dark: "#23261f", light: "#ffffff" },
});

const assets = {
  logo: dataUri(join(ROOT, "public", "cfc-logo.png")),
  qr: dataUri(qrFile),
  shots,
  url: URL_TEXT,
};

const browser = await chromium.launch({ executablePath: EXE });
const ctx = await browser.newContext({ viewport: { width: 1240, height: 1754 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

let problems = 0;
for (const sheet of SHEETS) {
  const missing = sheet.steps.filter((s) => s.shot && !shots[s.shot]).map((s) => s.shot);
  if (missing.length) {
    console.log(`  ${sheet.id}: MISSING SCREENSHOTS ${missing.join(", ")}`);
    problems++;
  }

  const html = renderSheet(sheet, assets);
  const file = join(OUT, `${sheet.id}.html`);
  await page.setContent(html, { waitUntil: "networkidle" });

  const height = await page.evaluate(() => document.body.scrollHeight);
  const fits = height <= 1754;
  if (!fits) problems++;

  await page.screenshot({ path: join(OUT, `${sheet.id}.png`) });
  await page.pdf({ path: join(OUT, `${sheet.id}.pdf`), width: "210mm", height: "297mm", printBackground: true });
  console.log(`  ${sheet.id.padEnd(24)} ${fits ? "fits" : `OVERFLOWS by ${height - 1754}px`}`);
  void file; void existsSync;
}

await browser.close();
console.log(problems ? `\n${problems} sheet(s) need attention.` : "\nAll sheets rendered.");
process.exitCode = problems ? 1 : 0;
