# Email Templates

Source of truth: `packages/db/src/email-templates.ts` (loaded by `bun run db:seed`).
Regenerate: `bun run docs:email-templates`.

Merge fields: `{{first_name}}`, `{{sender_name}}`, `{{sender_title}}`, `{{demo_link}}`, `{{unsubscribe_url}}`.

---

## NO_1 — NO_1 - Initial outreach

**Subject:** End Spreadsheet Chaos: 20+ Hours Saved for Indian Ecommerce Owners

**Subject alternates:** How Top Amazon Sellers Automate GST & Boost Profits - Free Demo Inside · Are You Still Doing Ecommerce Accounting the Hard Way? · Ecommerce accounting solved · Are you even making Profits on Amazon?

**Plain text**

```
Hi {{first_name}},

Are endless spreadsheets, late-night reconciliations and GST headaches holding back your ecommerce growth?

You didn't start your business to become a part-time accountant - yet every month you're stuck matching payments, fixing mismatches and dreading compliance. It isn't your fault; the old way is broken.

DeepEcom automates your entire finance workflow across Amazon, Flipkart, Meesho and more:

- Reclaim 20+ hours a week
- GST & Tally-ready in minutes
- Instant profit & tax clarity
- No tech skills needed

Our users report 15% higher profit margins and zero GST discrepancies.

Want to see how it works?

Book a free 30-minute demo: {{demo_link}}

No contracts, no hidden fees. Ready to run your business, not let it run you?

{{sender_name}}
{{sender_title}}, DeepEcom

You are receiving this because you are in our B2B list.
Unsubscribe: {{unsubscribe_url}}
```

**HTML**

```html
<div style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a">
<p>Hi {{first_name}},</p>
<p>Are endless spreadsheets, late-night reconciliations and GST headaches holding back your ecommerce growth?</p>
<p>You didn't start your business to become a part-time accountant - yet every month you're stuck matching payments, fixing mismatches and dreading compliance. It isn't your fault; the old way is broken.</p>
<p>DeepEcom automates your entire finance workflow across Amazon, Flipkart, Meesho and more:</p>
<ul><li>Reclaim 20+ hours a week</li><li>GST & Tally-ready in minutes</li><li>Instant profit & tax clarity</li><li>No tech skills needed</li></ul>
<p>Our users report 15% higher profit margins and zero GST discrepancies.</p>
<p>Want to see how it works?</p>
<p><a href="{{demo_link}}" style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 22px;border-radius:6px;text-decoration:none">Book a free 30-minute demo</a></p>
<p>No contracts, no hidden fees. Ready to run your business, not let it run you?</p>
<p>{{sender_name}}<br>{{sender_title}}, DeepEcom</p>
<p style="font-size:12px;color:#8a8a8a;border-top:1px solid #e5e5e5;padding-top:12px">You are receiving this because you are in our B2B list. <a href="{{unsubscribe_url}}" style="color:#8a8a8a">Unsubscribe</a></p>
</div>
```

---

## NO_2 — NO_2 - Value reminder & social proof

**Subject:** How Amazon Sellers Cut Reconciliation Time by 95%

**Plain text**

```
Hi {{first_name}},

Just following up - many Amazon sellers like you are switching to DeepEcom and seeing results fast.

Here's what they're saying:

"We went from monthly guesswork to daily certainty. Our reconciliation time dropped from 45 hours to 2 hours per week. The accuracy improvement alone saved us Rs 1.5 lakhs in the first month."

- Ecommerce CFO

If you're ready to stop losing time and money to manual finance chaos, book your free demo.

Book your free demo: {{demo_link}}

Still have questions? Just reply and I'll share more success stories from sellers in your industry.

{{sender_name}}
{{sender_title}}, DeepEcom

You are receiving this because you are in our B2B list.
Unsubscribe: {{unsubscribe_url}}
```

**HTML**

```html
<div style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a">
<p>Hi {{first_name}},</p>
<p>Just following up - many Amazon sellers like you are switching to DeepEcom and seeing results fast.</p>
<p>Here's what they're saying:</p>
<blockquote style="margin:16px 0;padding:8px 16px;border-left:3px solid #2563eb;color:#444444">We went from monthly guesswork to daily certainty. Our reconciliation time dropped from 45 hours to 2 hours per week. The accuracy improvement alone saved us Rs 1.5 lakhs in the first month.</blockquote>
<p>- Ecommerce CFO</p>
<p>If you're ready to stop losing time and money to manual finance chaos, book your free demo.</p>
<p><a href="{{demo_link}}" style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 22px;border-radius:6px;text-decoration:none">Book your free demo</a></p>
<p>Still have questions? Just reply and I'll share more success stories from sellers in your industry.</p>
<p>{{sender_name}}<br>{{sender_title}}, DeepEcom</p>
<p style="font-size:12px;color:#8a8a8a;border-top:1px solid #e5e5e5;padding-top:12px">You are receiving this because you are in our B2B list. <a href="{{unsubscribe_url}}" style="color:#8a8a8a">Unsubscribe</a></p>
</div>
```

---

## NO_3 — NO_3 - Pain, agitate, solve + urgency

**Subject:** Don't Let Accounting Bottlenecks Stall Your Amazon Growth

**Subject alternates:** Still incurring losses on Amazon Selling? Track your real profits here!

**Plain text**

```
Hi {{first_name}},

Every hour spent fixing finance issues is time stolen from growing your ecommerce business.

- Manual payment matching = missed profit leaks
- GST errors = risk of penalties
- Scattered data = slow decisions

DeepEcom fixes all of this - fast:

- 50+ integrations (Amazon, Flipkart, Meesho, Tally, Zoho and more)
- One-click GST filing
- Real-time profit tracking

Slots for this week's free demo are filling up. Reserve your spot now.

Reserve your spot: {{demo_link}}

Prefer a quick call instead? Let me know.

{{sender_name}}
{{sender_title}}, DeepEcom

You are receiving this because you are in our B2B list.
Unsubscribe: {{unsubscribe_url}}
```

**HTML**

```html
<div style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a">
<p>Hi {{first_name}},</p>
<p>Every hour spent fixing finance issues is time stolen from growing your ecommerce business.</p>
<ul><li>Manual payment matching = missed profit leaks</li><li>GST errors = risk of penalties</li><li>Scattered data = slow decisions</li></ul>
<p>DeepEcom fixes all of this - fast:</p>
<ul><li>50+ integrations (Amazon, Flipkart, Meesho, Tally, Zoho and more)</li><li>One-click GST filing</li><li>Real-time profit tracking</li></ul>
<p>Slots for this week's free demo are filling up. Reserve your spot now.</p>
<p><a href="{{demo_link}}" style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 22px;border-radius:6px;text-decoration:none">Reserve your spot</a></p>
<p>Prefer a quick call instead? Let me know.</p>
<p>{{sender_name}}<br>{{sender_title}}, DeepEcom</p>
<p style="font-size:12px;color:#8a8a8a;border-top:1px solid #e5e5e5;padding-top:12px">You are receiving this because you are in our B2B list. <a href="{{unsubscribe_url}}" style="color:#8a8a8a">Unsubscribe</a></p>
</div>
```

---

## NO_4 — NO_4 - Useful resource

**Subject:** 4 Hacks to Automate Ecommerce GST (Free Guide Inside)

**Subject alternates:** Audit-Proof Your Amazon Business - Here's How

**Plain text**

```
Hi {{first_name}},

I know you're busy, so here's something useful - 4 must-do hacks for ecommerce sellers:

- Automate GST compliance (goodbye manual errors)
- Daily TCS reconciliation
- Pre-calculate GST for promo pricing
- Digitally store every tax invoice

DeepEcom makes all of this a reality - no tech skills needed.

If you'd like to see these hacks in action, book a free demo.

Book a free demo: {{demo_link}}

No pressure - just pure value.

{{sender_name}}
{{sender_title}}, DeepEcom

You are receiving this because you are in our B2B list.
Unsubscribe: {{unsubscribe_url}}
```

**HTML**

```html
<div style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a">
<p>Hi {{first_name}},</p>
<p>I know you're busy, so here's something useful - 4 must-do hacks for ecommerce sellers:</p>
<ul><li>Automate GST compliance (goodbye manual errors)</li><li>Daily TCS reconciliation</li><li>Pre-calculate GST for promo pricing</li><li>Digitally store every tax invoice</li></ul>
<p>DeepEcom makes all of this a reality - no tech skills needed.</p>
<p>If you'd like to see these hacks in action, book a free demo.</p>
<p><a href="{{demo_link}}" style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 22px;border-radius:6px;text-decoration:none">Book a free demo</a></p>
<p>No pressure - just pure value.</p>
<p>{{sender_name}}<br>{{sender_title}}, DeepEcom</p>
<p style="font-size:12px;color:#8a8a8a;border-top:1px solid #e5e5e5;padding-top:12px">You are receiving this because you are in our B2B list. <a href="{{unsubscribe_url}}" style="color:#8a8a8a">Unsubscribe</a></p>
</div>
```

---

## NO_5 — NO_5 - Final nudge / breakup

**Subject:** Should I Close Your File?

**Subject alternates:** Last Chance: See How Top Sellers Automate Ecommerce Finance

**Plain text**

```
Hi {{first_name}},

I haven't heard back, so I'll assume now isn't the right time.

If you're ever ready to ditch manual accounting and see how ecommerce leaders automate GST, reconciliation and profit tracking, you can always book a free demo.

Book a free demo: {{demo_link}}

Wishing you continued success!

{{sender_name}}
{{sender_title}}, DeepEcom

You are receiving this because you are in our B2B list.
Unsubscribe: {{unsubscribe_url}}
```

**HTML**

```html
<div style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a">
<p>Hi {{first_name}},</p>
<p>I haven't heard back, so I'll assume now isn't the right time.</p>
<p>If you're ever ready to ditch manual accounting and see how ecommerce leaders automate GST, reconciliation and profit tracking, you can always book a free demo.</p>
<p><a href="{{demo_link}}" style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 22px;border-radius:6px;text-decoration:none">Book a free demo</a></p>
<p>Wishing you continued success!</p>
<p>{{sender_name}}<br>{{sender_title}}, DeepEcom</p>
<p style="font-size:12px;color:#8a8a8a;border-top:1px solid #e5e5e5;padding-top:12px">You are receiving this because you are in our B2B list. <a href="{{unsubscribe_url}}" style="color:#8a8a8a">Unsubscribe</a></p>
</div>
```

---

## O_1 — O_1 - Opened, short version

**Subject:** The short version

**Plain text**

```
Hi {{first_name}},

Here's the short version of what I mentioned - most teams see results within the first month.

Book a free demo: {{demo_link}}

Or just reply and I'll set up a live walkthrough.

{{sender_name}}
{{sender_title}}, DeepEcom

You are receiving this because you are in our B2B list.
Unsubscribe: {{unsubscribe_url}}
```

**HTML**

```html
<div style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a">
<p>Hi {{first_name}},</p>
<p>Here's the short version of what I mentioned - most teams see results within the first month.</p>
<p><a href="{{demo_link}}" style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 22px;border-radius:6px;text-decoration:none">Book a free demo</a></p>
<p>Or just reply and I'll set up a live walkthrough.</p>
<p>{{sender_name}}<br>{{sender_title}}, DeepEcom</p>
<p style="font-size:12px;color:#8a8a8a;border-top:1px solid #e5e5e5;padding-top:12px">You are receiving this because you are in our B2B list. <a href="{{unsubscribe_url}}" style="color:#8a8a8a">Unsubscribe</a></p>
</div>
```

---

## O_2 — O_2 - Opened, before and after

**Subject:** What DeepEcom looks like in practice

**Plain text**

```
Hi {{first_name}},

A quick before and after from teams using DeepEcom:

- 45 hours to 2 hours of reconciliation per week
- One-click GST filing
- Real-time profit tracking

Grab a slot and I'll show you how this looks on your own data.

Book a free demo: {{demo_link}}

{{sender_name}}
{{sender_title}}, DeepEcom

You are receiving this because you are in our B2B list.
Unsubscribe: {{unsubscribe_url}}
```

**HTML**

```html
<div style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a">
<p>Hi {{first_name}},</p>
<p>A quick before and after from teams using DeepEcom:</p>
<ul><li>45 hours to 2 hours of reconciliation per week</li><li>One-click GST filing</li><li>Real-time profit tracking</li></ul>
<p>Grab a slot and I'll show you how this looks on your own data.</p>
<p><a href="{{demo_link}}" style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 22px;border-radius:6px;text-decoration:none">Book a free demo</a></p>
<p>{{sender_name}}<br>{{sender_title}}, DeepEcom</p>
<p style="font-size:12px;color:#8a8a8a;border-top:1px solid #e5e5e5;padding-top:12px">You are receiving this because you are in our B2B list. <a href="{{unsubscribe_url}}" style="color:#8a8a8a">Unsubscribe</a></p>
</div>
```

---

## O_3 — O_3 - Opened, closing loop

**Subject:** Should I stop here?

**Plain text**

```
Hi {{first_name}},

I'll leave it here for now. If automating GST and profit tracking becomes a priority, you can book anytime.

Book a free demo: {{demo_link}}

{{sender_name}}
{{sender_title}}, DeepEcom

You are receiving this because you are in our B2B list.
Unsubscribe: {{unsubscribe_url}}
```

**HTML**

```html
<div style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a">
<p>Hi {{first_name}},</p>
<p>I'll leave it here for now. If automating GST and profit tracking becomes a priority, you can book anytime.</p>
<p><a href="{{demo_link}}" style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 22px;border-radius:6px;text-decoration:none">Book a free demo</a></p>
<p>{{sender_name}}<br>{{sender_title}}, DeepEcom</p>
<p style="font-size:12px;color:#8a8a8a;border-top:1px solid #e5e5e5;padding-top:12px">You are receiving this because you are in our B2B list. <a href="{{unsubscribe_url}}" style="color:#8a8a8a">Unsubscribe</a></p>
</div>
```

---

## C_1 — C_1 - Clicked, book a time

**Subject:** Want me to book a time?

**Plain text**

```
Hi {{first_name}},

Since you had a look, the easiest next step is a quick 15-minute call.

Book a 15-minute call: {{demo_link}}

Or reply with two times that work and I'll set it up.

{{sender_name}}
{{sender_title}}, DeepEcom

You are receiving this because you are in our B2B list.
Unsubscribe: {{unsubscribe_url}}
```

**HTML**

```html
<div style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a">
<p>Hi {{first_name}},</p>
<p>Since you had a look, the easiest next step is a quick 15-minute call.</p>
<p><a href="{{demo_link}}" style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 22px;border-radius:6px;text-decoration:none">Book a 15-minute call</a></p>
<p>Or reply with two times that work and I'll set it up.</p>
<p>{{sender_name}}<br>{{sender_title}}, DeepEcom</p>
<p style="font-size:12px;color:#8a8a8a;border-top:1px solid #e5e5e5;padding-top:12px">You are receiving this because you are in our B2B list. <a href="{{unsubscribe_url}}" style="color:#8a8a8a">Unsubscribe</a></p>
</div>
```

---

## C_2 — C_2 - Clicked, tailor the demo

**Subject:** Anything I can answer first?

**Plain text**

```
Hi {{first_name}},

Happy to tailor the demo to your channels - Amazon, Flipkart, Meesho, Tally or Zoho.

Reply with your questions, or grab a time here.

Book a free demo: {{demo_link}}

{{sender_name}}
{{sender_title}}, DeepEcom

You are receiving this because you are in our B2B list.
Unsubscribe: {{unsubscribe_url}}
```

**HTML**

```html
<div style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a">
<p>Hi {{first_name}},</p>
<p>Happy to tailor the demo to your channels - Amazon, Flipkart, Meesho, Tally or Zoho.</p>
<p>Reply with your questions, or grab a time here.</p>
<p><a href="{{demo_link}}" style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 22px;border-radius:6px;text-decoration:none">Book a free demo</a></p>
<p>{{sender_name}}<br>{{sender_title}}, DeepEcom</p>
<p style="font-size:12px;color:#8a8a8a;border-top:1px solid #e5e5e5;padding-top:12px">You are receiving this because you are in our B2B list. <a href="{{unsubscribe_url}}" style="color:#8a8a8a">Unsubscribe</a></p>
</div>
```

---

## C_3 — C_3 - Clicked, last note

**Subject:** Last note from me

**Plain text**

```
Hi {{first_name}},

I'll close the loop from my side. Book whenever works for you.

Book a free demo: {{demo_link}}

Wishing you a great quarter.

{{sender_name}}
{{sender_title}}, DeepEcom

You are receiving this because you are in our B2B list.
Unsubscribe: {{unsubscribe_url}}
```

**HTML**

```html
<div style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a">
<p>Hi {{first_name}},</p>
<p>I'll close the loop from my side. Book whenever works for you.</p>
<p><a href="{{demo_link}}" style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 22px;border-radius:6px;text-decoration:none">Book a free demo</a></p>
<p>Wishing you a great quarter.</p>
<p>{{sender_name}}<br>{{sender_title}}, DeepEcom</p>
<p style="font-size:12px;color:#8a8a8a;border-top:1px solid #e5e5e5;padding-top:12px">You are receiving this because you are in our B2B list. <a href="{{unsubscribe_url}}" style="color:#8a8a8a">Unsubscribe</a></p>
</div>
```

---

