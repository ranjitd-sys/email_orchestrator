export type TemplateBlock =
  | { readonly p: string }
  | { readonly ul: readonly string[] }
  | { readonly quote: string }
  | { readonly cta: string };

export interface StepEmailTemplate {
  readonly code: string;
  readonly name: string;
  readonly subject: string;
  readonly subjectAlternates: readonly string[];
  readonly blocks: readonly TemplateBlock[];
}

const GREETING: TemplateBlock = { p: "Hi {{first_name}}," };

function renderBlockHtml(block: TemplateBlock): string {
  if ("p" in block) return `<p>${block.p}</p>`;
  if ("ul" in block) {
    return `<ul>${block.ul.map((item) => `<li>${item}</li>`).join("")}</ul>`;
  }
  if ("quote" in block) {
    return `<blockquote style="margin:16px 0;padding:8px 16px;border-left:3px solid #2563eb;color:#444444">${block.quote}</blockquote>`;
  }
  return `<p><a href="{{demo_link}}" style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 22px;border-radius:6px;text-decoration:none">${block.cta}</a></p>`;
}

function renderBlockText(block: TemplateBlock): string[] {
  if ("p" in block) return [block.p, ""];
  if ("ul" in block) return [...block.ul.map((item) => `- ${item}`), ""];
  if ("quote" in block) return [`"${block.quote}"`, ""];
  return [`${block.cta}: {{demo_link}}`, ""];
}

export function renderTemplate(template: StepEmailTemplate): { html: string; text: string } {
  const html = [
    '<div style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a">',
    template.blocks.map(renderBlockHtml).join("\n"),
    "<p>{{sender_name}}<br>{{sender_title}}, DeepEcom</p>",
    '<p style="font-size:12px;color:#8a8a8a;border-top:1px solid #e5e5e5;padding-top:12px">You are receiving this because you are in our B2B list. <a href="{{unsubscribe_url}}" style="color:#8a8a8a">Unsubscribe</a></p>',
    "</div>",
  ].join("\n");

  const text = [
    ...template.blocks.flatMap(renderBlockText),
    "{{sender_name}}",
    "{{sender_title}}, DeepEcom",
    "",
    "You are receiving this because you are in our B2B list.",
    "Unsubscribe: {{unsubscribe_url}}",
  ].join("\n");

  return { html, text };
}

export const EMAIL_TEMPLATES: readonly StepEmailTemplate[] = [
  {
    code: "NO_1",
    name: "NO_1 - Initial outreach",
    subject: "End Spreadsheet Chaos: 20+ Hours Saved for Indian Ecommerce Owners",
    subjectAlternates: [
      "How Top Amazon Sellers Automate GST & Boost Profits - Free Demo Inside",
      "Are You Still Doing Ecommerce Accounting the Hard Way?",
      "Ecommerce accounting solved",
      "Are you even making Profits on Amazon?",
    ],
    blocks: [
      GREETING,
      { p: "Are endless spreadsheets, late-night reconciliations and GST headaches holding back your ecommerce growth?" },
      {
        p: "You didn't start your business to become a part-time accountant - yet every month you're stuck matching payments, fixing mismatches and dreading compliance. It isn't your fault; the old way is broken.",
      },
      { p: "DeepEcom automates your entire finance workflow across Amazon, Flipkart, Meesho and more:" },
      {
        ul: [
          "Reclaim 20+ hours a week",
          "GST & Tally-ready in minutes",
          "Instant profit & tax clarity",
          "No tech skills needed",
        ],
      },
      { p: "Our users report 15% higher profit margins and zero GST discrepancies." },
      { p: "Want to see how it works?" },
      { cta: "Book a free 30-minute demo" },
      { p: "No contracts, no hidden fees. Ready to run your business, not let it run you?" },
    ],
  },
  {
    code: "NO_2",
    name: "NO_2 - Value reminder & social proof",
    subject: "How Amazon Sellers Cut Reconciliation Time by 95%",
    subjectAlternates: [],
    blocks: [
      GREETING,
      { p: "Just following up - many Amazon sellers like you are switching to DeepEcom and seeing results fast." },
      { p: "Here's what they're saying:" },
      {
        quote:
          "We went from monthly guesswork to daily certainty. Our reconciliation time dropped from 45 hours to 2 hours per week. The accuracy improvement alone saved us Rs 1.5 lakhs in the first month.",
      },
      { p: "- Ecommerce CFO" },
      { p: "If you're ready to stop losing time and money to manual finance chaos, book your free demo." },
      { cta: "Book your free demo" },
      { p: "Still have questions? Just reply and I'll share more success stories from sellers in your industry." },
    ],
  },
  {
    code: "NO_3",
    name: "NO_3 - Pain, agitate, solve + urgency",
    subject: "Don't Let Accounting Bottlenecks Stall Your Amazon Growth",
    subjectAlternates: ["Still incurring losses on Amazon Selling? Track your real profits here!"],
    blocks: [
      GREETING,
      { p: "Every hour spent fixing finance issues is time stolen from growing your ecommerce business." },
      {
        ul: [
          "Manual payment matching = missed profit leaks",
          "GST errors = risk of penalties",
          "Scattered data = slow decisions",
        ],
      },
      { p: "DeepEcom fixes all of this - fast:" },
      {
        ul: [
          "50+ integrations (Amazon, Flipkart, Meesho, Tally, Zoho and more)",
          "One-click GST filing",
          "Real-time profit tracking",
        ],
      },
      { p: "Slots for this week's free demo are filling up. Reserve your spot now." },
      { cta: "Reserve your spot" },
      { p: "Prefer a quick call instead? Let me know." },
    ],
  },
  {
    code: "NO_4",
    name: "NO_4 - Useful resource",
    subject: "4 Hacks to Automate Ecommerce GST (Free Guide Inside)",
    subjectAlternates: ["Audit-Proof Your Amazon Business - Here's How"],
    blocks: [
      GREETING,
      { p: "I know you're busy, so here's something useful - 4 must-do hacks for ecommerce sellers:" },
      {
        ul: [
          "Automate GST compliance (goodbye manual errors)",
          "Daily TCS reconciliation",
          "Pre-calculate GST for promo pricing",
          "Digitally store every tax invoice",
        ],
      },
      { p: "DeepEcom makes all of this a reality - no tech skills needed." },
      { p: "If you'd like to see these hacks in action, book a free demo." },
      { cta: "Book a free demo" },
      { p: "No pressure - just pure value." },
    ],
  },
  {
    code: "NO_5",
    name: "NO_5 - Final nudge / breakup",
    subject: "Should I Close Your File?",
    subjectAlternates: ["Last Chance: See How Top Sellers Automate Ecommerce Finance"],
    blocks: [
      GREETING,
      { p: "I haven't heard back, so I'll assume now isn't the right time." },
      {
        p: "If you're ever ready to ditch manual accounting and see how ecommerce leaders automate GST, reconciliation and profit tracking, you can always book a free demo.",
      },
      { cta: "Book a free demo" },
      { p: "Wishing you continued success!" },
    ],
  },
  {
    code: "O_1",
    name: "O_1 - Opened, short version",
    subject: "The short version",
    subjectAlternates: [],
    blocks: [
      GREETING,
      { p: "Here's the short version of what I mentioned - most teams see results within the first month." },
      { cta: "Book a free demo" },
      { p: "Or just reply and I'll set up a live walkthrough." },
    ],
  },
  {
    code: "O_2",
    name: "O_2 - Opened, before and after",
    subject: "What DeepEcom looks like in practice",
    subjectAlternates: [],
    blocks: [
      GREETING,
      { p: "A quick before and after from teams using DeepEcom:" },
      {
        ul: [
          "45 hours to 2 hours of reconciliation per week",
          "One-click GST filing",
          "Real-time profit tracking",
        ],
      },
      { p: "Grab a slot and I'll show you how this looks on your own data." },
      { cta: "Book a free demo" },
    ],
  },
  {
    code: "O_3",
    name: "O_3 - Opened, closing loop",
    subject: "Should I stop here?",
    subjectAlternates: [],
    blocks: [
      GREETING,
      { p: "I'll leave it here for now. If automating GST and profit tracking becomes a priority, you can book anytime." },
      { cta: "Book a free demo" },
    ],
  },
  {
    code: "C_1",
    name: "C_1 - Clicked, book a time",
    subject: "Want me to book a time?",
    subjectAlternates: [],
    blocks: [
      GREETING,
      { p: "Since you had a look, the easiest next step is a quick 15-minute call." },
      { cta: "Book a 15-minute call" },
      { p: "Or reply with two times that work and I'll set it up." },
    ],
  },
  {
    code: "C_2",
    name: "C_2 - Clicked, tailor the demo",
    subject: "Anything I can answer first?",
    subjectAlternates: [],
    blocks: [
      GREETING,
      { p: "Happy to tailor the demo to your channels - Amazon, Flipkart, Meesho, Tally or Zoho." },
      { p: "Reply with your questions, or grab a time here." },
      { cta: "Book a free demo" },
    ],
  },
  {
    code: "C_3",
    name: "C_3 - Clicked, last note",
    subject: "Last note from me",
    subjectAlternates: [],
    blocks: [
      GREETING,
      { p: "I'll close the loop from my side. Book whenever works for you." },
      { cta: "Book a free demo" },
      { p: "Wishing you a great quarter." },
    ],
  },
];

const BY_CODE = new Map(EMAIL_TEMPLATES.map((template) => [template.code, template]));

export function stepEmailTemplate(code: string): StepEmailTemplate | null {
  return BY_CODE.get(code) ?? null;
}
