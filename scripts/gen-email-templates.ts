import fs from "node:fs";
import { EMAIL_TEMPLATES, renderTemplate } from "../packages/db/src/index.ts";

let md = `# Email Templates

Source of truth: \`packages/db/src/email-templates.ts\` (loaded by \`bun run db:seed\`).
Regenerate: \`bun run docs:email-templates\`.

Merge fields: \`{{first_name}}\`, \`{{sender_name}}\`, \`{{sender_title}}\`, \`{{demo_link}}\`, \`{{unsubscribe_url}}\`.

---

`;

for (const t of EMAIL_TEMPLATES) {
  const { html, text } = renderTemplate(t);
  md += `## ${t.code} — ${t.name}\n\n`;
  md += `**Subject:** ${t.subject}\n\n`;
  if (t.subjectAlternates.length > 0) {
    md += `**Subject alternates:** ${t.subjectAlternates.join(" · ")}\n\n`;
  }
  md += `**Plain text**\n\n\`\`\`\n${text}\n\`\`\`\n\n`;
  md += `**HTML**\n\n\`\`\`html\n${html}\n\`\`\`\n\n---\n\n`;
}

fs.writeFileSync("docs/EMAIL_TEMPLATES.md", md);
console.log(`wrote docs/EMAIL_TEMPLATES.md (${EMAIL_TEMPLATES.length} templates)`);
