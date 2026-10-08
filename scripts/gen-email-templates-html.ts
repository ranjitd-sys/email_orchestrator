import fs from "node:fs";
import { EMAIL_TEMPLATES, renderTemplate, type StepEmailTemplate } from "../packages/db/src/index.ts";
import { MERGE_DEFAULTS, mergeFields } from "../apps/orchestrator/src/domain/payload.ts";

const MERGE_SAMPLE: Record<string, string> = {
  first_name: "Priya Sharma",
  sender_name: "Tejes Pujara",
  sender_title: "Founder",
  demo_link: MERGE_DEFAULTS.demo_link,
  unsubscribe_url: MERGE_DEFAULTS.unsubscribe_url,
};

const DELAYS: Record<string, number> = {
  NO_1: 0,
  NO_2: 2,
  NO_3: 2,
  NO_4: 3,
  NO_5: 3,
  O_1: 0,
  O_2: 2,
  O_3: 3,
  C_1: 0,
  C_2: 2,
  C_3: 3,
};

const SEQUENCES = [
  { key: "NOT_OPENED", title: "NOT_OPENED", blurb: "The lead never opened the first email." },
  { key: "OPENED", title: "OPENED", blurb: "The lead opened but did not click." },
  { key: "CLICKED", title: "CLICKED", blurb: "The lead clicked, so intent is high." },
];

function sequenceOf(code: string): string {
  if (code.startsWith("NO_")) return "NOT_OPENED";
  if (code.startsWith("O_")) return "OPENED";
  return "CLICKED";
}

const htmlEscape = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function card(template: StepEmailTemplate): string {
  const { html, text } = renderTemplate(template);
  const mergedHtml = mergeFields(html, MERGE_SAMPLE);
  const mergedText = mergeFields(text, MERGE_SAMPLE);
  const mergedSubject = mergeFields(template.subject, MERGE_SAMPLE);
  const delay = DELAYS[template.code] ?? 0;

  const alts = template.subjectAlternates
    .map((alt) => `<li>${htmlEscape(mergeFields(alt, MERGE_SAMPLE))}</li>`)
    .join("");

  return `
  <article class="card" id="${template.code}">
    <div class="card-head">
      <div>
        <span class="step">${template.code}</span>
        <h3>${htmlEscape(template.name)}</h3>
      </div>
      <span class="delay">${delay === 0 ? "sends immediately" : `+${delay} day${delay === 1 ? "" : "s"} after previous`}</span>
    </div>

    <div class="field">
      <span class="label">Subject</span>
      <span class="value">${htmlEscape(mergedSubject)}</span>
    </div>
    ${alts ? `<div class="field"><span class="label">Alternates</span><ul class="alts">${alts}</ul></div>` : ""}

    <div class="preview-wrap">
      <div class="preview-bar"><span class="dot"></span><span class="dot"></span><span class="dot"></span>
        <span class="preview-title">Rendered preview</span></div>
      <div class="preview-body">${mergedHtml}</div>
    </div>

    <details>
      <summary>Plain text</summary>
      <pre>${htmlEscape(mergedText)}</pre>
    </details>
    <details>
      <summary>HTML source</summary>
      <pre>${htmlEscape(mergedHtml)}</pre>
    </details>
  </article>`;
}

const nav = SEQUENCES.map(
  (seq) => `<a class="nav-seq" href="#${seq.key}">${seq.title}</a>
  ${EMAIL_TEMPLATES.filter((t) => sequenceOf(t.code) === seq.key)
    .map((t) => `<a class="nav-step" href="#${t.code}">${t.code}</a>`)
    .join("")}`,
).join("");

const sections = SEQUENCES.map((seq) => {
  const templates = EMAIL_TEMPLATES.filter((t) => sequenceOf(t.code) === seq.key);
  return `
  <section class="sequence" id="${seq.key}">
    <div class="sequence-head">
      <h2>${seq.title}</h2>
      <p>${seq.blurb} · ${templates.length} step${templates.length === 1 ? "" : "s"}</p>
    </div>
    ${templates.map(card).join("")}
  </section>`;
}).join("");

const doc = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Email Templates — DeepEcom</title>
<style>
  :root { --ink:#18202c; --muted:#6c7888; --line:#e2e8f0; --brand:#2563eb; --bg:#f6f8fb; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color:var(--ink); background:var(--bg); }
  .hero { background: linear-gradient(135deg,#1e3a8a,#2563eb); color:#fff; padding:40px 32px 34px; }
  .hero h1 { margin:0 0 8px; font-size:30px; }
  .hero p { margin:0; color:#dbeafe; }
  .hero .chips { margin-top:16px; display:flex; flex-wrap:wrap; gap:8px; }
  .hero .chip { background:rgba(255,255,255,.15); border:1px solid rgba(255,255,255,.3); padding:4px 10px; border-radius:999px; font-size:12.5px; }
  .layout { display:grid; grid-template-columns: 190px 1fr; gap:24px; max-width:1180px; margin:0 auto; padding:24px; }
  nav.toc { position:sticky; top:24px; align-self:start; background:#fff; border:1px solid var(--line); border-radius:12px; padding:14px; }
  nav.toc a { display:block; text-decoration:none; color:var(--ink); border-radius:8px; padding:4px 8px; font-size:13.5px; }
  nav.toc a:hover { background:var(--bg); }
  nav.toc .nav-seq { font-weight:700; margin-top:6px; color:var(--brand); }
  nav.toc .nav-step { color:var(--muted); margin-left:10px; font-family: ui-monospace, Consolas, monospace; }
  main { min-width:0; }
  .sequence { margin-bottom:36px; }
  .sequence-head { margin-bottom:14px; }
  .sequence-head h2 { margin:0; font-size:22px; }
  .sequence-head p { margin:4px 0 0; color:var(--muted); font-size:14px; }
  .card { background:#fff; border:1px solid var(--line); border-radius:14px; padding:20px; margin-bottom:20px; }
  .card-head { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; border-bottom:1px solid var(--line); padding-bottom:12px; margin-bottom:14px; }
  .card-head h3 { margin:6px 0 0; font-size:16px; }
  .step { font-family: ui-monospace, Consolas, monospace; font-weight:700; color:#fff; background:var(--brand); padding:2px 9px; border-radius:6px; font-size:13px; }
  .delay { font-size:12.5px; color:var(--muted); white-space:nowrap; }
  .field { display:flex; gap:10px; margin:8px 0; font-size:14.5px; }
  .label { flex:0 0 92px; color:var(--muted); font-size:12.5px; text-transform:uppercase; letter-spacing:.04em; padding-top:2px; }
  .value { font-weight:600; }
  .alts { margin:0; padding-left:18px; color:var(--muted); }
  .preview-wrap { margin:16px 0; border:1px solid var(--line); border-radius:12px; overflow:hidden; }
  .preview-bar { display:flex; align-items:center; gap:6px; background:#eef2f7; padding:8px 12px; border-bottom:1px solid var(--line); }
  .preview-bar .dot { width:9px; height:9px; border-radius:50%; background:#cdd6e0; }
  .preview-title { margin-left:8px; font-size:12px; color:var(--muted); }
  .preview-body { background:#e9eef5; padding:26px 18px; }
  .preview-body > div { background:#ffffff; border:1px solid #e2e8f0; border-radius:10px; padding:26px 24px; box-shadow:0 1px 3px rgba(15,23,42,.06); }
  .preview-body p { margin:0 0 14px; }
  .preview-body ul { margin:0 0 14px; padding-left:22px; }
  .preview-body li { margin-bottom:6px; }
  .preview-body blockquote { margin:16px 0; }
  .preview-body a { color:var(--brand); }
  details { border-top:1px solid var(--line); padding:10px 0 0; margin-top:10px; }
  summary { cursor:pointer; font-size:13.5px; color:var(--brand); font-weight:600; }
  pre { background:#0f172a; color:#e2e8f0; padding:14px; border-radius:10px; overflow:auto; font-size:12.5px; line-height:1.5; margin:10px 0 0; white-space:pre-wrap; word-break:break-word; }
  footer { text-align:center; color:var(--muted); font-size:12.5px; padding:24px; }
  @media (max-width: 820px) { .layout { grid-template-columns: 1fr; } nav.toc { position:static; } }
  @media print { .hero { background:#1e3a8a !important; -webkit-print-color-adjust:exact; } details { page-break-inside:avoid; } .card { page-break-inside:avoid; } }
</style>
</head>
<body>
<header class="hero">
  <h1>Email Templates</h1>
  <p>All ${EMAIL_TEMPLATES.length} templates across the NOT_OPENED, OPENED and CLICKED sequences.</p>
  <div class="chips">
    <span class="chip">Merge: {{first_name}}</span>
    <span class="chip">{{sender_name}}</span>
    <span class="chip">{{sender_title}}</span>
    <span class="chip">{{demo_link}}</span>
    <span class="chip">{{unsubscribe_url}}</span>
  </div>
</header>
<div class="layout">
  <nav class="toc">
    <a class="nav-seq" href="#top">Contents</a>
    ${nav}
  </nav>
  <main id="top">
    ${sections}
  </main>
</div>
<footer>Generated from <code>packages/db/src/email-templates.ts</code> · regenerate with <code>bun run docs:email-templates</code></footer>
</body>
</html>
`;

fs.writeFileSync("docs/email-templates.html", doc);
console.log(`wrote docs/email-templates.html (${EMAIL_TEMPLATES.length} templates)`);
