/**
 * The shared look of every handout: one A4 page, the chapter's own colours,
 * and room for real screenshots of the app rather than drawings of it.
 *
 * A sheet is data — see sheets.mjs — so a new one is a few paragraphs of
 * content, not a new design.
 */

const CSS = `
  :root {
    --cream:#faf8f4; --parchment:#f2eee5; --ink:#23261f; --muted:#6f6a5f;
    --line:#e4dfd3; --forest:#2f6f4f; --forest-dark:#24583e; --forest-light:#e8f1ec;
    --clay:#c2643c; --clay-light:#fbeee7; --gold:#b8892b; --gold-light:#faf3e2;
  }
  * { box-sizing:border-box; margin:0; padding:0; }
  body {
    width:1240px; height:1754px; background:var(--cream); color:var(--ink);
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
    -webkit-font-smoothing:antialiased; display:flex; flex-direction:column;
  }
  .sheet { flex:1; display:flex; flex-direction:column; padding:46px 58px 0; }

  header { display:flex; align-items:center; gap:24px; padding-bottom:20px; border-bottom:3px solid var(--line); }
  header img.mark { height:58px; }
  .kicker { font-size:17px; font-weight:800; letter-spacing:.16em; text-transform:uppercase; color:var(--muted); line-height:1.5; }
  .site { margin-left:auto; text-align:right; }
  .site .lab { font-size:13px; font-weight:800; letter-spacing:.14em; text-transform:uppercase; color:var(--muted); }
  .site .url { font-size:25px; font-weight:800; color:var(--forest); margin-top:3px; }

  .forwhom { display:inline-block; margin-top:22px; background:var(--gold-light); color:var(--gold);
             border:2px solid var(--gold); border-radius:999px; padding:6px 18px;
             font-size:17px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; }
  h1 { font-size:56px; line-height:1.02; letter-spacing:-.02em; margin-top:14px; }
  h1 em { font-style:normal; color:var(--forest); }
  .standfirst { font-size:23px; line-height:1.4; color:var(--muted); margin-top:11px; max-width:920px; }

  .steps { display:grid; gap:18px; margin-top:22px; }
  .steps.of4 { grid-template-columns:repeat(4,1fr); }
  .steps.of3 { grid-template-columns:repeat(3,1fr); }
  .step { background:#fff; border:2px solid var(--line); border-radius:18px;
          padding:18px 18px 20px; display:flex; flex-direction:column; }
  .head { display:flex; align-items:center; gap:12px; }
  .num { width:42px; height:42px; border-radius:999px; background:var(--forest); color:#fff; flex:none;
         font-size:23px; font-weight:800; display:flex; align-items:center; justify-content:center; }
  .step h2 { font-size:21px; line-height:1.15; letter-spacing:-.01em; }
  .step p { font-size:17px; line-height:1.4; color:var(--muted); margin-top:8px; }
  .step p + p { margin-top:6px; }
  .shot { margin-top:auto; padding-top:12px; }
  .shot img { width:100%; display:block; border:2px solid var(--line); border-radius:11px; }
  /* Three wider columns make each screenshot tall enough to push the footer off
     the page, so those are cropped from the top rather than shrunk to nothing. */
  .steps.of3 .shot img { height:348px; object-fit:cover; object-position:top; }

  .panel { margin-top:20px; border-radius:20px; padding:24px 28px; border:2px solid var(--forest); background:var(--forest-light); }
  .panel h2 { font-size:30px; letter-spacing:-.01em; }
  .panel > p { font-size:19px; color:var(--forest-dark); margin-top:6px; }
  .two { display:grid; grid-template-columns:1fr 1fr; gap:18px; margin-top:16px; }
  .card { background:#fff; border-radius:14px; padding:18px 20px; border:2px solid #fff; }
  .card.warn { border-color:var(--clay); background:var(--clay-light); }
  .card h3 { font-size:21px; display:flex; align-items:center; gap:11px; }
  .dot { width:14px; height:14px; border-radius:999px; background:var(--forest); flex:none; }
  .dot.warn { background:var(--clay); }
  .card ul { margin-top:9px; padding-left:0; list-style:none; }
  .card li { font-size:17px; line-height:1.44; color:var(--muted); padding-left:24px; position:relative; margin-top:5px; }
  .card li::before { content:"\\2713"; position:absolute; left:0; color:var(--forest); font-weight:800; }
  .card.warn li::before { content:"\\2715"; color:var(--clay); font-weight:800; }
  /* Some pairs are two halves of one picture rather than a can/cannot list, so
     they get a neutral mark: a cross beside "at home" reads as a prohibition. */
  .card.info { border-color:var(--gold); background:var(--gold-light); }
  .card.info li::before { content:"\\2022"; color:var(--gold); font-weight:800; }
  .dot.info { background:var(--gold); }

  .notes { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; margin-top:18px; }
  .note { border-left:5px solid var(--gold); padding-left:16px; }
  .note h3 { font-size:19px; }
  .note p { font-size:16px; line-height:1.4; color:var(--muted); margin-top:5px; }

  .scan { margin-top:18px; margin-bottom:20px; display:flex; align-items:center; gap:34px;
          background:#fff; border:2px solid var(--line); border-radius:20px; padding:26px 34px; }
  .scan .qr { width:172px; height:172px; flex:none; }
  .scan h2 { font-size:31px; letter-spacing:-.01em; }
  .scan p { font-size:20px; line-height:1.45; color:var(--muted); margin-top:8px; }
  .scan p strong { color:var(--forest); }
  .scan .ask { font-size:18px; color:var(--gold); font-weight:700; margin-top:12px; }

  footer { background:var(--forest); color:#fff; padding:20px 58px; display:flex;
           align-items:center; justify-content:space-between; font-size:18px; }
  footer strong { font-weight:800; }
`;

const esc = (s) => String(s).replace(/&(?!\w+;|#)/g, "&amp;");

function stepHtml(step, index, shots) {
  const image = step.shot && shots[step.shot]
    ? `<div class="shot"><img src="${shots[step.shot]}" alt="${esc(step.alt ?? "")}"></div>`
    : "";
  return `
      <div class="step">
        <div class="head"><div class="num">${index + 1}</div><h2>${esc(step.title)}</h2></div>
        ${step.body.map((line) => `<p>${line}</p>`).join("\n        ")}
        ${image}
      </div>`;
}

function panelHtml(panel) {
  if (!panel) return "";
  // tone: "yes" ticks, "no" crosses, "info" bullets. Defaults keep the common
  // can/cannot pairing without every sheet having to say so.
  const card = (c, fallback) => {
    const tone = c.tone ?? fallback;
    const cls = tone === "yes" ? "" : ` ${tone}`;
    return `
        <div class="card${cls}">
          <h3><i class="dot${cls}"></i>${esc(c.title)}</h3>
          <ul>${c.points.map((p) => `<li>${p}</li>`).join("")}</ul>
        </div>`;
  };
  return `
    <section class="panel">
      <h2>${esc(panel.title)}</h2>
      ${panel.lead ? `<p>${panel.lead}</p>` : ""}
      <div class="two">${card(panel.left, "yes")}${card(panel.right, "warn")}</div>
    </section>`;
}

export function renderSheet(sheet, assets) {
  const { logo, qr, shots, url } = assets;
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>${CSS}</style></head><body>
  <div class="sheet">
    <header>
      <img class="mark" src="${logo}" alt="Couples for Christ">
      <div class="kicker">SB3E Chapter<br>Pre-Loved Auction</div>
      <div class="site">
        <div class="lab">Find the auction at</div>
        <div class="url">${esc(url)}</div>
      </div>
    </header>

    ${sheet.forWhom ? `<span class="forwhom">${esc(sheet.forWhom)}</span>` : ""}
    <h1>${sheet.title}</h1>
    <p class="standfirst">${sheet.standfirst}</p>

    <div class="steps of${sheet.steps.length === 3 ? 3 : 4}">
      ${sheet.steps.map((s, i) => stepHtml(s, i, shots)).join("\n")}
    </div>

    ${panelHtml(sheet.panel)}

    <div class="notes">
      ${sheet.notes.map((n) => `
      <div class="note">
        <h3>${esc(n.title)}</h3>
        <p>${n.body}</p>
      </div>`).join("")}
    </div>

    <section class="scan">
      <img class="qr" src="${qr}" alt="QR code for the auction">
      <div>
        <h2>${esc(sheet.scan?.title ?? "Scan to open the auction")}</h2>
        <p>${sheet.scan?.body ?? `Point your phone&rsquo;s camera at the square. Or type <strong>${esc(url)}</strong> into any browser.`}</p>
        <p class="ask">${sheet.scan?.ask ?? "Stuck on any of this? Ask a chapter organizer &mdash; that is what we are here for."}</p>
      </div>
    </section>
  </div>

  <footer>
    <span>${sheet.footer ?? "Every item was <strong>provided by a chapter member</strong>. Every peso raised goes to our chapter."}</span>
    <span>CFC SB3E</span>
  </footer>
</body></html>`;
}
