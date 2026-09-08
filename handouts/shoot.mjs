/**
 * Photographs the running app for the handouts.
 *
 * Real screenshots, not drawings: a member holding the sheet should be able to
 * match it against what is on their screen. Every window is the same shape so
 * a row of them reads as a sequence.
 *
 * Needs the app running against the handout seed:
 *   npm run handouts:seed && npm run build && npm start
 */
import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "shots");
const BASE = process.env.HANDOUT_BASE ?? "http://localhost:3000";
const EXE = process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

const W = 358, H = 500;          // one window shape for every screenshot
const PHONE = { width: 390, height: 844 };
const DESK = { width: 900, height: 900 };

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: EXE });

async function open(viewport = PHONE) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 3 });
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.accept());
  return { ctx, page };
}

async function signIn(page, email) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("#identifier", email);
  await page.fill("#password", "chapter2026");
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 15000 });
  await page.waitForLoadState("networkidle");
}

/**
 * A fixed window anchored on whatever the step is about.
 *
 * Scrolls the anchor into view first and then clips inside the viewport:
 * clipping straight to a page coordinate fails the moment the thing being
 * photographed sits below the fold.
 */
async function shot(page, anchor, name, { lift = 16, width = W, height = H, x = 16 } = {}) {
  const target = page.locator(anchor).first();

  // The site header is sticky, so scrolling something to the top of the page
  // parks it underneath. Scroll past by the header's height plus the air we
  // want above the anchor, then start the crop just below the header: every
  // window then begins exactly where the step's subject begins.
  const headerH = await page.evaluate(
    () => document.querySelector("header")?.getBoundingClientRect().height ?? 0
  );
  await target.evaluate((el, off) => {
    el.scrollIntoView({ block: "start", behavior: "instant" });
    window.scrollBy(0, -off);
  }, headerH + lift);
  await page.waitForTimeout(250);

  const view = page.viewportSize();
  const y = Math.round(headerH);
  await page.screenshot({
    path: join(OUT, `${name}.png`),
    clip: { x, y, width: Math.min(width, view.width - x), height: Math.min(height, view.height - y) },
  });
  console.log(`  ${name}`);
}

async function firstItemHref(page) {
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  return page.locator('a[href^="/items/"]').first().getAttribute("href");
}

// ------------------------------------------------------------ creating an account
console.log("creating an account");
{
  const { ctx, page } = await open();
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await shot(page, "section:has(a[href='/login'])", "account-home");
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await shot(page, "h1", "account-login");
  await page.goto(`${BASE}/signup`, { waitUntil: "networkidle" });
  await page.fill("#name", "Ana Santos");
  await page.fill("#email", "ana.santos@gmail.com");
  await page.fill("#mobile", "0917 555 0101");
  await shot(page, "#name", "account-signup", { lift: 44 });
  await ctx.close();
}
{
  const { ctx, page } = await open();
  await signIn(page, "carmen@example.com");
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.locator('a[href^="/items/"]').first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await shot(page, 'a[href^="/items/"]', "account-items", { lift: 12 });
  await ctx.close();
}

// ------------------------------------------------------------------ placing a bid
console.log("placing a bid");
{
  const { ctx, page } = await open();
  await signIn(page, "carmen@example.com");
  const href = await firstItemHref(page);

  await page.goto(`${BASE}${href}`, { waitUntil: "networkidle" });
  await shot(page, "h1", "bid-item", { lift: 20 });
  await shot(page, "#amount", "bid-form", { lift: 90 });

  await page.fill("#amount", "1100");
  await page.click('button:has-text("Place bid")');
  await page.waitForTimeout(2500);
  await shot(page, "#amount", "bid-placed", { lift: 150 });

  await page.goto(`${BASE}/account`, { waitUntil: "networkidle" });
  await shot(page, "h1", "bid-account", { lift: 16 });
  await ctx.close();
}

// ------------------------------------------------------------- the live auction
console.log("the live auction");
{
  const { ctx, page } = await open();
  await signIn(page, "treasurer@example.com");
  await page.goto(`${BASE}/admin/live`, { waitUntil: "networkidle" });
  const start = page.locator('button:has-text("Start this lot")').first();
  if (await start.count()) {
    await start.click();
    await page.waitForTimeout(2500);
  }
  await ctx.close();
}
{
  const { ctx, page } = await open();
  await signIn(page, "carmen@example.com");
  await page.goto(`${BASE}/live`, { waitUntil: "networkidle" });
  await shot(page, "h1", "live-audience", { lift: 16 });
  // What somebody at home actually taps, rather than the organizer's console.
  await shot(page, '#amount, button:has-text("Bid ")', "live-home", { lift: 150 });
  await ctx.close();
}
{
  const { ctx, page } = await open();
  await signIn(page, "treasurer@example.com");
  await page.goto(`${BASE}/admin/live`, { waitUntil: "networkidle" });
  await shot(page, '[class*="chip"]:has-text("On the block")', "live-console", { lift: 30 });
  // The paddle field and the Sold button, which is the operator's whole job.
  await shot(page, 'input[placeholder*="Paddle"]', "live-roombid", { lift: 30 });
  await ctx.close();
}

// -------------------------------------------------------------------- cataloger
console.log("cataloger");
{
  const { ctx, page } = await open();
  await signIn(page, "cataloger@example.com");
  await shot(page, 'nav[aria-label="Organizer tools"]', "cat-tools", { lift: 60 });
  await page.locator('a:has-text("Manage items")').first().click();
  await page.waitForLoadState("networkidle");
  await shot(page, 'button:has-text("Add an item"), button:has-text("Add item")', "cat-list", { lift: 20 });
  await page.locator('button:has-text("Add an item"), button:has-text("Add item")').first().click();
  await page.waitForSelector("#title");
  await page.fill("#title", "Rattan rocking chair");
  await page.fill("#donorName", "The Reyes family");
  await page.fill("#category", "Furniture");
  await shot(page, "#title", "cat-form", { lift: 40 });
  await shot(page, "#startingBid", "cat-prices", { lift: 40 });
  await ctx.close();
}

// -------------------------------------------------------------------- treasurer
console.log("treasurer");
{
  const { ctx, page } = await open();
  await signIn(page, "treasurer@example.com");
  await page.goto(`${BASE}/admin/winners`, { waitUntil: "networkidle" });
  await shot(page, "h2", "tre-winners", { lift: 16 });
  await shot(page, 'button:has-text("Mark paid")', "tre-mark", { lift: 190 });
  await ctx.close();
}

// -------------------------------------------------------------------- organizer
console.log("organizer");
{
  const { ctx, page } = await open();
  await signIn(page, "organizer@example.com");
  await shot(page, "h2", "org-auctions", { lift: 16 });
  await page.goto(`${BASE}/admin/people`, { waitUntil: "networkidle" });
  await shot(page, "h2", "org-people", { lift: 16 });
  await page.goto(`${BASE}/admin/events/new`, { waitUntil: "networkidle" });
  await page.fill("#name", "Chapter Pre-Loved Auction");
  await page.fill("#goal", "50000");
  await shot(page, "#name", "org-newevent", { lift: 40 });
  await ctx.close();
}

await browser.close();
console.log("screenshots written to handouts/shots");
