// Ryzon email templates: one source for all customer emails and owner alerts.
// `node scripts/emails/templates.mjs` writes supabase/seed/ryzon_landing_email_templates.sql
// (an idempotent upsert) and previews/*.html for visual checks.
// Placeholders ({{name}}) are filled and HTML-escaped by ryzon_landing_render() in Postgres.
import { mkdirSync, writeFileSync } from "node:fs";

const NAVY = "#0B1220";
const BLUE = "#2F6BFF";
const INK = "#0B1220";
const MUTED = "#4A5568";
const LINE = "#E2E8F0";
const BG = "#F4F6FA";
const FONT = "font-family:Arial,Helvetica,sans-serif;";

// Inline styles live once in this map (stored as ryzon_landing_config.email_styles) and
// templates reference them as {{st_*}}, so every email keeps full inline styling while the
// stored templates stay small.
const STYLES = {
  st_p: `margin:0 0 16px;${FONT}font-size:16px;line-height:1.6;color:${INK};`,
  st_small: `margin:0 0 12px;${FONT}font-size:14px;line-height:1.5;color:${MUTED};`,
  st_h1: `margin:0 0 16px;${FONT}font-size:26px;line-height:1.25;font-weight:700;color:${INK};`,
  st_btn_tbl: `margin:8px 0 20px;`,
  st_btn_td: `border-radius:8px;`,
  st_btn_a: `display:inline-block;padding:15px 28px;${FONT}font-size:17px;font-weight:700;line-height:20px;color:#ffffff;text-decoration:none;border-radius:8px;`,
  st_link: `color:${BLUE};font-weight:700;text-decoration:underline;`,
  st_tbl: `margin:0 0 20px;border:1px solid ${LINE};border-radius:8px;`,
  st_k: `padding:10px 14px;${FONT}font-size:14px;color:${MUTED};width:38%;vertical-align:top;`,
  st_v: `padding:10px 14px;${FONT}font-size:15px;color:${INK};vertical-align:top;`,
  st_k2: `padding:10px 14px;border-top:1px solid ${LINE};${FONT}font-size:14px;color:${MUTED};width:38%;vertical-align:top;`,
  st_v2: `padding:10px 14px;border-top:1px solid ${LINE};${FONT}font-size:15px;color:${INK};vertical-align:top;`,
  st_box: `margin:0 0 20px;padding:14px 16px;background:${BG};border-radius:8px;${FONT}font-size:15px;line-height:1.6;color:${INK};white-space:pre-wrap;`,
};

const p = (html) => `<p style="{{st_p}}">${html}</p>`;
const small = (html) => `<p style="{{st_small}}">${html}</p>`;
const h1 = (html) => `<h1 style="{{st_h1}}">${html}</h1>`;

// Bulletproof button: padded table cell, at least 48px tall in every client.
const button = (label, href) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="{{st_btn_tbl}}"><tr><td bgcolor="${BLUE}" style="{{st_btn_td}}"><a href="${href}" style="{{st_btn_a}}">${label}</a></td></tr></table>`;

const link = (label, href) => `<a href="${href}" style="{{st_link}}">${label}</a>`;

const rows = (pairs) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="{{st_tbl}}">${pairs
    .map(([k, v], i) => `<tr><td style="{{${i ? "st_k2" : "st_k"}}}">${k}</td><td style="{{${i ? "st_v2" : "st_v"}}}">${v}</td></tr>`)
    .join("")}</table>`;

// The shared frame. Stored once per kind in ryzon_landing_config (email_layout_*);
// each template stores only its body, which replaces {{body_html}} at send time.
function layout({ body, promo = false, admin = false }) {
  const signoff = admin
    ? ""
    : p(`Talk soon,<br><strong>{{owner_name}}</strong><br>Ryzon Automation · {{owner_phone}}`) +
      small(`Just reply to this email. It comes straight to me.`);
  const footer = promo
    ? `${small(`{{business_address}}`)}${small(`You're getting this because you asked for a free website demo. ${link("Unsubscribe from offers", "{{unsubscribe_url}}")}. You'll still get emails about anything you buy.`)}`
    : admin
      ? small(`Ryzon pipeline alert`)
      : small(`{{business_address}}`);
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light">
<title>Ryzon Automation</title></head>
<body style="margin:0;padding:0;background:${BG};">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${BG};">{{preheader}}&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${BG}" style="background:${BG};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid ${LINE};">
<tr><td bgcolor="${NAVY}" style="background:${NAVY};padding:20px 28px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="width:32px;height:32px;background:${BLUE};border-radius:6px;text-align:center;${FONT}font-size:18px;font-weight:700;color:#ffffff;line-height:32px;">R</td>
<td style="padding-left:10px;${FONT}font-size:18px;font-weight:700;color:#ffffff;">Ryzon Automation</td>
</tr></table></td></tr>
<tr><td style="padding:28px 28px 8px;">
${body}
${signoff}
</td></tr>
<tr><td style="padding:16px 28px 24px;border-top:1px solid ${LINE};">${footer}</td></tr>
</table></td></tr></table>
</body></html>`;
}

const T = [];
const add = (key, recipient, isPromo, subject, preheader, body, text, description) =>
  T.push({ key, recipient, isPromo, subject, preheader, body, html: layout({ body, promo: isPromo, admin: recipient === "admin" }), text, description });

const LAYOUTS = {
  customer: layout({ body: "{{body_html}}" }),
  promo: layout({ body: "{{body_html}}", promo: true }),
  admin: layout({ body: "{{body_html}}", admin: true }),
};

const textSignoff = `\n\nTalk soon,\n{{owner_name}}\nRyzon Automation · {{owner_phone}}\n\n{{business_address}}`;
const textPromoFooter = `\n\nTalk soon,\n{{owner_name}}\nRyzon Automation · {{owner_phone}}\n\n{{business_address}}\nUnsubscribe from offers: {{unsubscribe_url}}`;

// ---------------------------------------------------------------- Track 1: intake
add(
  "request_received", "customer", false,
  "We're building your website demo, {{first_name}}",
  "Your free preview is in the works. It can be ready as soon as tomorrow.",
  h1("Your free demo is in the works") +
    p("Hi {{first_name}},") +
    p("Thanks for asking us to design a preview of the new website for <strong>{{business_name}}</strong>. We've got what we need to get started.") +
    p("Your demo can be ready as soon as the next day. When it is, you'll get a link to see it. There's nothing to pay and nothing to sign.") +
    p("While you wait, here's the kind of work we do:") +
    button("See recent work", "{{site_url}}/#examples"),
  `Hi {{first_name}},\n\nThanks for asking us to design a preview of the new website for {{business_name}}. We've got what we need to get started.\n\nYour demo can be ready as soon as the next day. When it is, you'll get a link to see it. There's nothing to pay and nothing to sign.\n\nSee recent work: {{site_url}}/#examples${textSignoff}`,
  "Email 1. Sent instantly when the demo form is submitted.",
);

add(
  "new_request_alert", "admin", false,
  "New demo request: {{business_name}}",
  "{{name}} · {{industry}} · {{email}}",
  h1("New demo request") +
    rows([
      ["Business", "{{business_name}}"],
      ["Name", "{{name}}"],
      ["Email", "{{email}}"],
      ["Phone", "{{phone}}"],
      ["Industry", "{{industry}}"],
      ["Style they like", "{{style}}"],
      ["Current website", "{{current_site}}"],
      ["Notes", "{{goals}}"],
    ]) +
    button("Open in dashboard", "{{admin_url}}") +
    small("Reply to this email to write to them directly."),
  `New demo request\n\nBusiness: {{business_name}}\nName: {{name}}\nEmail: {{email}}\nPhone: {{phone}}\nIndustry: {{industry}}\nStyle they like: {{style}}\nCurrent website: {{current_site}}\nNotes: {{goals}}\n\nOpen in dashboard: {{admin_url}}`,
  "Email 2. Instant alert to the owner.",
);

add(
  "contact_alert", "admin", false,
  "New question from {{name}}",
  "{{message}}",
  h1("New message from the website") +
    rows([
      ["Name", "{{name}}"],
      ["Email", "{{email}}"],
      ["Phone", "{{phone}}"],
      ["Message", "{{message}}"],
    ]) +
    small("Reply to this email to answer them directly."),
  `New message from the website\n\nName: {{name}}\nEmail: {{email}}\nPhone: {{phone}}\nMessage: {{message}}`,
  "Contact form alert to the owner. Not part of the demo pipeline.",
);

// ---------------------------------------------------------------- Track 2: demo review and offers
add(
  "demo_ready", "customer", false,
  "{{business_name}}, your new website is ready",
  "Your free demo is live. Take a look, it's built around your business.",
  h1("Your new website is ready to see") +
    p("Hi {{first_name}},") +
    p("We designed a preview of the new website for <strong>{{business_name}}</strong>. Take a look and picture your customers landing on it.") +
    "{{demo_image_html}}" +
    button("View my demo", "{{demo_url}}") +
    p(`Love it? You can ${link("get your website live", "{{go_live_url}}")} starting at $40/month, with $0 upfront for a limited time.`),
  `Hi {{first_name}},\n\nWe designed a preview of the new website for {{business_name}}. Take a look:\n{{demo_url}}\n\nLove it? Get your website live, starting at $40/month with $0 upfront for a limited time:\n{{go_live_url}}${textSignoff}`,
  "Email 3. Sent the moment a demo URL is added in the dashboard.",
);

add(
  "reminder_1", "customer", true,
  "Did you get a look at your new site?",
  "Your demo for {{business_name}} is ready and waiting.",
  h1("Did you get a look?") +
    p("Hi {{first_name}},") +
    p("Your new website for <strong>{{business_name}}</strong> is ready to go. Every day without it is a day customers find someone else first.") +
    "{{demo_image_html}}" +
    button("Get my website live now", "{{go_live_url}}") +
    small(`Want another look first? ${link("View your demo", "{{demo_url}}")}.`),
  `Hi {{first_name}},\n\nYour new website for {{business_name}} is ready to go. Every day without it is a day customers find someone else first.\n\nGet my website live now: {{go_live_url}}\nView your demo: {{demo_url}}${textPromoFooter}`,
  "Email 4. Day 1, 10 AM local. Stops on payment, pause or status change.",
);

add(
  "reminder_2", "customer", true,
  "Your design is still waiting for you",
  "Plans start at $40/month with $0 upfront for a limited time.",
  h1("Your design is still waiting") +
    p("Hi {{first_name}},") +
    p("We built the <strong>{{business_name}}</strong> website around what you told us. It's ready to launch whenever you are.") +
    p("Plans start at $40/month, and right now every plan is $0 upfront.") +
    button("Get my website live now", "{{go_live_url}}") +
    small(`Questions first? Just reply, or ${link("look at your demo again", "{{demo_url}}")}.`),
  `Hi {{first_name}},\n\nWe built the {{business_name}} website around what you told us. It's ready to launch whenever you are.\n\nPlans start at $40/month, and right now every plan is $0 upfront.\n\nGet my website live now: {{go_live_url}}${textPromoFooter}`,
  "Email 5. Day 3, 10 AM local.",
);

add(
  "offer_1", "customer", true,
  "50% off your first month of hosting",
  "Half off your first month. This offer ends {{offer_end}}.",
  h1("50% off your first month") +
    p("Hi {{first_name}},") +
    p("Your <strong>{{business_name}}</strong> website is still ready to launch. To make it easy, your first month is half price on any plan.") +
    p(`<strong>This offer ends {{offer_end}}.</strong>`) +
    button("Claim 50% off", "{{go_live_url}}") +
    small(`See your design again: ${link("view your demo", "{{demo_url}}")}.`),
  `Hi {{first_name}},\n\nYour {{business_name}} website is still ready to launch. To make it easy, your first month is half price on any plan.\n\nThis offer ends {{offer_end}}.\n\nClaim 50% off: {{go_live_url}}${textPromoFooter}`,
  "Email 6. Day 5, 10 AM local. Offer host50-month, ends when offer 2 arrives.",
);

add(
  "offer_2", "customer", true,
  "Half-price hosting for a full year, any package",
  "50% off for 12 months. Ends {{offer_end}}.",
  h1("Half price for a full year") +
    p("Hi {{first_name}},") +
    p("This is our best offer: <strong>50% off your plan for 12 months</strong>, on any package. Starter becomes $20/month for your whole first year.") +
    p(`<strong>It ends {{offer_end}}.</strong>`) +
    button("Lock in half-price hosting", "{{go_live_url}}") +
    small(`Your ${link("demo for {{business_name}}", "{{demo_url}}")} is ready the moment you are.`),
  `Hi {{first_name}},\n\nThis is our best offer: 50% off your plan for 12 months, on any package. Starter becomes $20/month for your whole first year.\n\nIt ends {{offer_end}}.\n\nLock in half-price hosting: {{go_live_url}}${textPromoFooter}`,
  "Email 7. Day 10, 10 AM local. Offer host50-year, ends when offer 3 arrives.",
);

add(
  "offer_3", "customer", true,
  "Keep your design for just $99",
  "Not ready for a plan? Take your design files for $99. Ends {{offer_end}}.",
  h1("Keep your design for $99") +
    p("Hi {{first_name}},") +
    p("Not ready for a monthly plan? No problem. You can still keep the design we made for <strong>{{business_name}}</strong>.") +
    p("For a one-time $99, we'll email you your design files to use however you like. No hosting, no subscription.") +
    p(`<strong>This offer ends {{offer_end}}.</strong>`) +
    button("Get my design files for $99", "{{go_live_url}}"),
  `Hi {{first_name}},\n\nNot ready for a monthly plan? You can still keep the design we made for {{business_name}}.\n\nFor a one-time $99, we'll email you your design files to use however you like. No hosting, no subscription.\n\nThis offer ends {{offer_end}}.\n\nGet my design files for $99: {{go_live_url}}${textPromoFooter}`,
  "Email 8. Day 15, 10 AM local. Offer files99, ends day 21.",
);

// ---------------------------------------------------------------- Track 3: after payment
add(
  "payment_confirmed", "customer", false,
  "You're in! Tell us what to change",
  "Welcome aboard. One quick step before we finish your site.",
  h1("You're in, {{first_name}}!") +
    p("Thanks for choosing Ryzon. Your <strong>{{business_name}}</strong> website is officially on its way.") +
    p("Next, tell us what you'd like changed on your demo: wording, photos, colors, services, anything. The more you share, the faster we finish.") +
    button("Request my changes", "{{changes_url}}") +
    p(`Prefer to talk it through? ${link("Book a quick call", "{{book_url}}")} by Google Meet or phone.`),
  `You're in, {{first_name}}!\n\nThanks for choosing Ryzon. Your {{business_name}} website is officially on its way.\n\nNext, tell us what you'd like changed on your demo: wording, photos, colors, services, anything.\n\nRequest my changes: {{changes_url}}\nOr book a quick call (Google Meet or phone): {{book_url}}${textSignoff}`,
  "Email 9. Instantly after a plan payment (any offer).",
);

add(
  "changes_reminder_1", "customer", false,
  "Quick one: what should we change?",
  "Two minutes now gets your site live sooner.",
  h1("Quick one: what should we change?") +
    p("Hi {{first_name}},") +
    p("We're ready to finish the <strong>{{business_name}}</strong> website. All we need is your list of changes. Even a few bullet points helps.") +
    button("Request my changes", "{{changes_url}}") +
    small(`Easier to talk? ${link("Book a quick call", "{{book_url}}")}.`),
  `Hi {{first_name}},\n\nWe're ready to finish the {{business_name}} website. All we need is your list of changes. Even a few bullet points helps.\n\nRequest my changes: {{changes_url}}\nOr book a quick call: {{book_url}}${textSignoff}`,
  "Email 10. Day 1 after payment, 10 AM. Stops when the form is sent or a call is booked.",
);

add(
  "changes_reminder_2", "customer", false,
  "One last step before we finish your site",
  "Send your changes and we'll take it from there.",
  h1("One last step") +
    p("Hi {{first_name}},") +
    p("Your site is waiting on one thing: your changes. If you're happy with the demo as it is, just say so and we'll get it ready to launch.") +
    button("Request my changes", "{{changes_url}}") +
    small(`Or ${link("book a quick call", "{{book_url}}")} and we'll go through it together.`),
  `Hi {{first_name}},\n\nYour site is waiting on one thing: your changes. If you're happy with the demo as it is, just say so and we'll get it ready to launch.\n\nRequest my changes: {{changes_url}}\nOr book a quick call: {{book_url}}${textSignoff}`,
  "Email 11. Day 3 after payment, 10 AM.",
);

add(
  "changes_received", "customer", false,
  "Got it, we're on your changes",
  "We have everything we need. Here's what happens next.",
  h1("Got it, we're on it") +
    p("Hi {{first_name}},") +
    p("Thanks for sending your changes for <strong>{{business_name}}</strong>. We'll build them in and let you know when your site is ready to launch.") +
    p("Here's what you sent:") +
    `<div style="{{st_box}}">{{change_details}}</div>` +
    small("Thought of something else? Just reply to this email."),
  `Hi {{first_name}},\n\nThanks for sending your changes for {{business_name}}. We'll build them in and let you know when your site is ready to launch.\n\nHere's what you sent:\n{{change_details}}${textSignoff}`,
  "Email 12. Instantly on the change form.",
);

add(
  "changes_alert", "admin", false,
  "Changes received: {{business_name}}",
  "{{change_details}}",
  h1("Changes received") +
    rows([
      ["Business", "{{business_name}}"],
      ["Name", "{{name}}"],
      ["Plan", "{{plan}} ({{offer_code}})"],
      ["Changes", "{{change_details}}"],
    ]) +
    button("Open in dashboard", "{{admin_url}}"),
  `Changes received\n\nBusiness: {{business_name}}\nName: {{name}}\nPlan: {{plan}} ({{offer_code}})\nChanges:\n{{change_details}}\n\nOpen in dashboard: {{admin_url}}`,
  "Owner alert when a change form arrives.",
);

add(
  "payment_alert", "admin", false,
  "Payment: {{business_name}} ({{plan}}, {{offer_code}})",
  "A demo just converted.",
  h1("New payment") +
    rows([
      ["Business", "{{business_name}}"],
      ["Name", "{{name}}"],
      ["Email", "{{email}}"],
      ["Plan", "{{plan}}"],
      ["Offer", "{{offer_code}}"],
    ]) +
    p("If this is the $99 design-files offer, upload their ZIP from the dashboard to send it.") +
    button("Open in dashboard", "{{admin_url}}"),
  `New payment\n\nBusiness: {{business_name}}\nName: {{name}}\nEmail: {{email}}\nPlan: {{plan}}\nOffer: {{offer_code}}\n\nIf this is the $99 design-files offer, upload their ZIP from the dashboard.\n\nOpen in dashboard: {{admin_url}}`,
  "Owner alert on every payment.",
);

add(
  "files_preparing", "customer", false,
  "We're packaging your design files",
  "Payment received. Your files arrive in a separate email.",
  h1("Your design files are on the way") +
    p("Hi {{first_name}},") +
    p("Thanks! Your $99 payment for the <strong>{{business_name}}</strong> design came through. We're packaging your files now, and they'll arrive in a separate email with a secure download link.") +
    small("Questions? Just reply to this email."),
  `Hi {{first_name}},\n\nThanks! Your $99 payment for the {{business_name}} design came through. We're packaging your files now, and they'll arrive in a separate email with a secure download link.${textSignoff}`,
  "Sent instantly on the $99 payment, before the owner uploads the ZIP.",
);

add(
  "files_delivered", "customer", false,
  "Your design files are here",
  "Download your {{business_name}} design files. Link works for 7 days.",
  h1("Your design files are here") +
    p("Hi {{first_name}},") +
    p("Here are the design files for <strong>{{business_name}}</strong>. Download them and keep a copy somewhere safe.") +
    button("Download my files", "{{files_url}}") +
    small("This secure link works for 7 days. If it expires, reply and we'll send a fresh one.") +
    p(`If you ever want us to host and run it for you, ${link("plans start at $40/month", "{{site_url}}/#pricing")}.`),
  `Hi {{first_name}},\n\nHere are the design files for {{business_name}}:\n{{files_url}}\n\nThis secure link works for 7 days. If it expires, reply and we'll send a fresh one.${textSignoff}`,
  "Email 13. Sent when the owner uploads the ZIP in the dashboard.",
);

// ---------------------------------------------------------------- Calls (own calendar)
add(
  "booking_confirmed", "customer", false,
  "You're booked: {{call_time_local}}",
  "{{call_method_label}} with Ryzon Automation.",
  h1("Your call is booked") +
    p("Hi {{first_name}},") +
    rows([
      ["When", "{{call_time_local}}"],
      ["How", "{{call_method_label}}"],
      ["Phone on file", "{{call_phone}}"],
    ]) +
    p("If you picked Google Meet, I'll send a calendar invite with the link before the call. If you picked phone, I'll call you at the number above.") +
    small("Need a different time? Just reply to this email."),
  `Hi {{first_name}},\n\nYour call is booked.\n\nWhen: {{call_time_local}}\nHow: {{call_method_label}}\nPhone on file: {{call_phone}}\n\nIf you picked Google Meet, I'll send a calendar invite with the link before the call. If you picked phone, I'll call you at the number above.\n\nNeed a different time? Just reply.${textSignoff}`,
  "Booking confirmation to the customer (also covers email 12 for calls).",
);

add(
  "booking_reminder", "customer", false,
  "Starting soon: your call at {{call_time_local}}",
  "Your {{call_method_label}} with Ryzon is in about an hour.",
  h1("Your call starts in about an hour") +
    p("Hi {{first_name}},") +
    rows([
      ["When", "{{call_time_local}}"],
      ["How", "{{call_method_label}}"],
    ]) +
    p("Have your notes handy: anything you'd like changed, added or asked. See you soon."),
  `Hi {{first_name}},\n\nYour call starts in about an hour.\n\nWhen: {{call_time_local}}\nHow: {{call_method_label}}\n\nHave your notes handy. See you soon.${textSignoff}`,
  "Pre-meeting reminder to the customer, 1 hour before.",
);

add(
  "booking_alert", "admin", false,
  "Call booked: {{business_name}}, {{call_time_local}}",
  "{{call_method_label}} · send the invite",
  h1("New call booked") +
    rows([
      ["When", "{{call_time_local}}"],
      ["How", "{{call_method_label}}"],
      ["Purpose", "{{call_purpose}}"],
      ["Business", "{{business_name}}"],
      ["Name", "{{name}}"],
      ["Email", "{{email}}"],
      ["Phone", "{{call_phone}}"],
    ]) +
    p("<strong>To do:</strong> if it's Google Meet, send them a calendar invite with the Meet link.") +
    button("Open in dashboard", "{{admin_url}}"),
  `New call booked\n\nWhen: {{call_time_local}}\nHow: {{call_method_label}}\nPurpose: {{call_purpose}}\nBusiness: {{business_name}}\nName: {{name}}\nEmail: {{email}}\nPhone: {{call_phone}}\n\nTo do: if it's Google Meet, send them a calendar invite with the Meet link.\n\nOpen in dashboard: {{admin_url}}`,
  "Owner alert for a new booking.",
);

add(
  "booking_reminder_admin", "admin", false,
  "In 1 hour: call with {{business_name}} ({{call_method_label}})",
  "{{call_time_local}} · {{call_phone}}",
  h1("Call in about an hour") +
    rows([
      ["When", "{{call_time_local}}"],
      ["How", "{{call_method_label}}"],
      ["Purpose", "{{call_purpose}}"],
      ["Business", "{{business_name}}"],
      ["Phone", "{{call_phone}}"],
      ["Email", "{{email}}"],
    ]) +
    button("Open in dashboard", "{{admin_url}}"),
  `Call in about an hour\n\nWhen: {{call_time_local}}\nHow: {{call_method_label}}\nPurpose: {{call_purpose}}\nBusiness: {{business_name}}\nPhone: {{call_phone}}\nEmail: {{email}}\n\nOpen in dashboard: {{admin_url}}`,
  "Pre-meeting reminder to the owner, 1 hour before.",
);

// ---------------------------------------------------------------- Track 4: launch
add(
  "prelaunch_call", "customer", false,
  "Your site is ready. Let's talk before we go live",
  "Book a quick launch call and we'll walk through it together.",
  h1("Your site is ready") +
    p("Hi {{first_name}},") +
    p("The <strong>{{business_name}}</strong> website is built and ready to launch. Before we flip the switch, let's take a few minutes to walk through it together and make sure it's exactly right.") +
    button("Book my launch call", "{{book_url}}") +
    small("Pick Google Meet or a phone call, whatever's easiest."),
  `Hi {{first_name}},\n\nThe {{business_name}} website is built and ready to launch. Before we flip the switch, let's walk through it together.\n\nBook my launch call: {{book_url}}${textSignoff}`,
  "Email 14. Sent when the owner marks the site ready to launch.",
);

add(
  "site_live", "customer", false,
  "{{business_name}} is officially live",
  "Your new website is up. Share it with your customers.",
  h1("You're live!") +
    p("Hi {{first_name}},") +
    p("Congratulations: the new <strong>{{business_name}}</strong> website is officially live. Share the link with your customers, add it to your Google profile and your social pages.") +
    button("Visit my website", "{{live_url}}") +
    small("Need a change down the road? Just reply to this email."),
  `Hi {{first_name}},\n\nCongratulations: the new {{business_name}} website is officially live.\n\nVisit my website: {{live_url}}\n\nNeed a change down the road? Just reply.${textSignoff}`,
  "Email 15. Sent when the owner marks the site live.",
);

// ---------------------------------------------------------------- output
const dq = (s) => {
  if (s.includes("$tpl$")) throw new Error("template contains $tpl$");
  return `$tpl$${s}$tpl$`;
};
const sql = [
  "-- Generated by scripts/emails/templates.mjs. Edit the script, not this file.",
  "insert into public.ryzon_landing_config (key, value) values",
  [...Object.entries(LAYOUTS).map(([k, v]) => `(${dq("email_layout_" + k)}, ${dq(v)})`), `(${dq("email_styles")}, ${dq(JSON.stringify(STYLES))})`].join(",\n"),
  "on conflict (key) do update set value = excluded.value, updated_at = now();",
  "insert into public.ryzon_landing_email_templates (key, recipient, is_promotional, subject, preheader, html, text_body, description) values",
  T.map(
    (t) =>
      `(${dq(t.key)}, ${dq(t.recipient)}, ${t.isPromo}, ${dq(t.subject)}, ${dq(t.preheader)}, ${dq(t.body)}, ${dq(t.text)}, ${dq(t.description)})`,
  ).join(",\n"),
  "on conflict (key) do update set recipient = excluded.recipient, is_promotional = excluded.is_promotional, subject = excluded.subject,",
  "  preheader = excluded.preheader, html = excluded.html, text_body = excluded.text_body, description = excluded.description, updated_at = now();",
].join("\n");

mkdirSync(new URL("../../supabase/seed/", import.meta.url), { recursive: true });
writeFileSync(new URL("../../supabase/seed/ryzon_landing_email_templates.sql", import.meta.url), sql + "\n");

// Previews with sample data so the layouts can be screenshotted.
const sample = {
  first_name: "Jordan", name: "Jordan Smith", email: "jordan@example.com", phone: "(555) 123-4567",
  business_name: "Smith Lawn Care", industry: "Landscaping and lawn care", style: "Warm organic",
  current_site: "None yet", goals: "Show our weekly mowing plans", message: "Do you build Shopify sites?",
  plan: "growth", offer_code: "host50-year", site_url: "https://ryzon-funnel-preview.netlify.app",
  demo_url: "https://example.com/demo", go_live_url: "https://ryzon-funnel-preview.netlify.app/go-live?t=…",
  changes_url: "#", book_url: "#", admin_url: "#", unsubscribe_url: "#", files_url: "#", live_url: "#",
  offer_end: "Friday, October 24", business_address: "Ryzon Automation, 3230 Glen Iris Drive, Commerce Township, MI 48382",
  owner_name: "Larry Sabra", owner_phone: "(248) 974-4220", change_details: "Swap the hero photo\nAdd our Saturday hours",
  call_phone: "(555) 123-4567", call_time_local: "Tuesday, October 14 at 2:30 PM (America/Detroit)",
  call_method_label: "Google Meet", call_purpose: "changes", demo_image_html: "",
};
mkdirSync(new URL("./previews/", import.meta.url), { recursive: true });
for (const t of T) {
  const vars = { ...sample, ...STYLES, preheader: t.preheader };
  const fill = (str) => str.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
  const out = fill(fill(t.html));
  writeFileSync(new URL(`./previews/${t.key}.html`, import.meta.url), out);
}
console.log(`Wrote ${T.length} templates (${T.filter((t) => t.isPromo).length} promotional).`);
