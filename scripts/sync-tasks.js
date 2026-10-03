import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docs = path.join(__dirname, "..", "docs");

function parseCsv(text) {
  const rows = [];
  let field = "", row = [], q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.some((v) => v !== ""));
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""])));
}

const tasks = parseCsv(fs.readFileSync(path.join(docs, "Email_Orchestrator_Tasks.csv"), "utf8"));
const byId = Object.fromEntries(tasks.map((t) => [t.id, t]));

const MARK = { todo: "[ ]", in_progress: "[~]", done: "[x]", blocked: "[!]", skipped: "[-]" };
const PRI = { critical: "**critical**", high: "high", medium: "medium", low: "low" };

const num = (n) => (Number(n) || 0);
const totalH = tasks.reduce((s, t) => s + num(t.estimate_h), 0);
const sprints = [...new Set(tasks.map((t) => t.sprint))].sort((a, b) => a - b);

// ---------- summary CSV (one row per sprint) ----------
const sumHead = ["sprint", "start_date", "end_date", "phases", "task_count", "hours", "critical_done", "task_ids", "goal"];
const sumRows = sprints.map((s) => {
  const inS = tasks.filter((t) => t.sprint === s);
  const done = inS.filter((t) => t.status === "done").length;
  const days = inS[0].sprint_days.split("..");
  const phases = [...new Set(inS.map((t) => t.phase.replace(/^Phase \d+ - /, "")))];
  const critical = inS.filter((t) => t.priority === "critical");
  const cDone = critical.filter((t) => t.status === "done").length;
  const goal = critical.length ? `Close out: ${critical[0].task.toLowerCase()}` : "Wrap-up and cleanup";
  return [s, days[0], days[1], phases.join(" + "), inS.length, num(inS.reduce((a, t) => a + num(t.estimate_h), 0)),
          `${cDone}/${critical.length}`, inS.map((t) => t.id).join(" "), goal];
});
const esc = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v);
fs.writeFileSync(path.join(docs, "Email_Orchestrator_Schedule.csv"),
  [sumHead.join(","), ...sumRows.map((r) => r.map(esc).join(","))].join("\n") + "\n");

// ---------- markdown ----------
let md = `# Email Orchestrator — Build Plan

**Source of truth:** \`Email_Orchestrator_Tasks.csv\` · **Schedule:** \`Email_Orchestrator_Schedule.csv\`
Regenerate this file: \`bun run tasks\`

| | |
|---|---|
| Sprints | ${sprints.length} × 2 days |
| Working days | ${sprints.length * 2} |
| Total effort | ${totalH} h |
| Tasks | ${tasks.length} |
| Status | ${tasks.filter((t) => t.status === "done").length} done · ${tasks.filter((t) => t.status === "in_progress").length} in progress · ${tasks.filter((t) => t.status === "todo").length} todo |

**Legend** — \`[ ]\` todo · \`[~]\` in progress · \`[x]\` done · \`[!]\` blocked · \`[-]\` skipped

### How this is organised

| Column | Meaning |
|---|---|
| \`sprint\` | Which 2-day sprint the task belongs to |
| \`why\` | Plain-language reason the task exists |
| \`spec_ref\` | Section of the spec docx this satisfies |
| \`acceptance_tests\` | Which of T01–T15 it verifies |
| \`blocked_by\` | Task ids that must finish first |
| \`estimate_h\` | Estimated hours |

---

## Roadmap at a glance

| Sprint | Dates | Phase | Tasks | Hours |
|---|---|---|---|---|
`;

for (const s of sprints) {
  const inS = tasks.filter((t) => t.sprint === s);
  const d = inS[0].sprint_days.split("..");
  md += `| ${s} | ${d[0]} → ${d[1]} | ${[...new Set(inS.map((t) => t.phase.replace(/^Phase \d+ - /, "")))].join(" + ")} | ${inS.length} | ${num(inS.reduce((a, t) => a + num(t.estimate_h), 0))} h |\n`;
}

md += `\n---\n\n## Sprints in detail\n`;

for (const s of sprints) {
  const inS = tasks.filter((t) => t.sprint === s);
  const d = inS[0].sprint_days.split("..");
  const h = num(inS.reduce((a, t) => a + num(t.estimate_h), 0));
  const phases = [...new Set(inS.map((t) => t.phase))];
  md += `\n### Sprint ${s} — ${d[0]} → ${d[1]}\n\n_${phases.join(" → ")} · ${inS.length} tasks · ${h} h_\n\n`;

  for (const t of inS) {
    md += `- ${MARK[t.status] ?? "[ ]"} **${t.id}** ${t.task}\n`;
    const meta = [];
    if (t.why) meta.push(t.why);
    if (t.spec_ref) meta.push(`spec ${t.spec_ref.split(";").map((r) => (r.startsWith("S") ? "§" + r.slice(1) : r)).join(", ")}`);
    if (t.acceptance_tests) meta.push(t.acceptance_tests.split(";").join(", "));
    meta.push(`${PRI[t.priority] ?? t.priority}`, `${t.estimate_h} h`);
    if (t.blocked_by) {
      const names = t.blocked_by.split(";").map((x) => `${x} (${(byId[x]?.task ?? "?").slice(0, 40)})`);
      meta.push(`needs ${names.join(", ")}`);
    }
    md += `  <sub>${meta.join(" · ")}</sub>\n`;
    if (t.notes) md += `  > ${t.notes}\n`;
  }
}

md += `\n---\n\n## Critical path\n\nTasks that block the most downstream work:\n\n`;
const crit = tasks.filter((t) => t.priority === "critical");
for (const t of crit) {
  const dependents = tasks.filter((x) => (x.blocked_by || "").split(";").includes(t.id));
  if (dependents.length) md += `- **${t.id}** ${t.task} — unlocks ${dependents.length} task(s)\n`;
}

fs.writeFileSync(path.join(docs, "BUILD_TASKS.md"), md);
console.log(`wrote BUILD_TASKS.md + Email_Orchestrator_Schedule.csv (${sprints.length} sprints, ${totalH} h)`);