-- Starter posts for /blog. Re-runnable: each insert skips a slug that already exists.

insert into public.ryzon_landing_blog (slug, title, excerpt, content, meta_title, meta_description, focus_keyword, secondary_keywords, category, tags, internal_links, cta_text, cta_href, is_published, published_at)
values (
'how-much-does-a-small-business-website-cost',
'How Much Does a Small Business Website Cost?',
'Website prices range from free to five figures. Here is what you actually pay for, where the money goes, and how to pick the option that fits a local business.',
$c$<section><h2 id="the-short-answer">The short answer</h2><p>Most local businesses end up paying one of three ways: building it yourself on a website builder, paying a freelancer or agency a one-time design fee plus hosting, or paying a monthly plan that bundles design, hosting and updates. Each one moves the cost to a different place. The right pick depends less on the sticker price and more on how much of your own time you want to spend on the site.</p></section>
<section><h2 id="what-you-are-paying-for">What you are actually paying for</h2><p>Every website, whatever it costs, is made of the same parts:</p><ul><li><strong>Design and build:</strong> the layout, the copy and making it work on phones.</li><li><strong>Hosting:</strong> the server that keeps the site online and fast.</li><li><strong>Domain name:</strong> your address, like yourbusiness.com, usually renewed every year.</li><li><strong>Updates and fixes:</strong> new hours, new services, broken forms and security patches.</li><li><strong>Getting found:</strong> the basic search setup so people nearby can find you on Google.</li></ul><p>Cheap options usually leave one or more of these to you. Expensive options usually charge for all of them up front.</p></section>
<section><h2 id="three-ways-to-pay">The three ways to pay</h2><h3 id="do-it-yourself">Do it yourself</h3><p>Website builders have low monthly fees, but the real cost is your time: picking a template, writing every page, sizing photos and fixing things when they break. For an owner who already works long days, those evenings add up quickly.</p><h3 id="one-time-design-fee">One-time design fee</h3><p>A freelancer or agency designs the site for a fixed project price, then you pay hosting separately. You get something custom, but you pay most of the money before you see the finished site, and later changes are often billed by the hour.</p><h3 id="monthly-plan">Monthly plan with no design fee</h3><p>Some companies, including us, design the site for free and charge a monthly plan that covers hosting and care. The cost is spread out, there is no large bill up front, and you can see the design before you commit. The trade-off is an ongoing payment instead of a one-off.</p></section>
<section><h2 id="hidden-costs">Costs people forget</h2><ul><li>Domain renewals and business email.</li><li>Paying someone each time you need a small change.</li><li>Fixing a site that looks broken on phones, which is where most local searches happen.</li><li>The calls you never get because the site is slow, outdated or hard to find.</li></ul></section>
<section><h2 id="how-to-choose">How to choose</h2><p>Ask three questions: How much up-front money can the business spare? How much of your own time will the site take each month? And can you see the design before you pay? If you would rather keep cash in the business and stay out of the website weeds, a monthly plan with a free design preview is usually the safest bet.</p><div class="callout"><p><strong>Our approach:</strong> plans start at $40/month with a $0 design fee, and we design a free demo of your site first. If you do not love it, you owe nothing.</p></div></section>$c$,
'How Much Does a Small Business Website Cost?',
'What a small business website really costs, where the money goes, and how to choose between DIY, a one-time design fee and a monthly plan.',
'small business website cost',
array['website cost','website pricing','local business website','website design price'],
'guides',
array['pricing','planning'],
'[{"href":"/#pricing","text":"See our plans and prices"},{"href":"/#how-it-works","text":"How the free demo works"},{"href":"/#faq","text":"Questions about the offer"}]'::jsonb,
'Get My Free Demo', '/#demo', true, now() - interval '6 days'
) on conflict (slug) do nothing;

insert into public.ryzon_landing_blog (slug, title, excerpt, content, meta_title, meta_description, focus_keyword, secondary_keywords, category, tags, internal_links, cta_text, cta_href, is_published, published_at)
values (
'do-i-need-a-website-if-i-have-a-facebook-page',
'Do I Need a Website If I Already Have a Facebook Page?',
'Social pages are great for staying in touch, but they are rented space. Here is what a website does that a Facebook or Instagram page cannot.',
$c$<section><h2 id="why-owners-ask">Why owners ask this</h2><p>A Facebook page is free, quick to set up, and many of your regulars already follow it. So it is fair to wonder whether a website is worth it. The honest answer: social pages and websites do different jobs, and most local businesses do best with both.</p></section>
<section><h2 id="what-social-does-well">What social pages do well</h2><ul><li>Posting news, specials and photos quickly.</li><li>Keeping in touch with customers who already know you.</li><li>Collecting comments and messages.</li></ul></section>
<section><h2 id="what-a-website-does">What a website does that social cannot</h2><h3 id="you-own-it">You own it</h3><p>A social page lives on someone else's platform. Rules, layouts and reach change without notice, and an account can be locked. A website on your own domain stays yours.</p><h3 id="people-who-do-not-know-you">It reaches people who do not know you yet</h3><p>When someone searches for a service near them, search engines show websites far more prominently than social posts. A website with clear services, location and hours gives Google something to point people to.</p><h3 id="it-answers-questions">It answers questions without a message</h3><p>Prices, service area, hours, what is included and how to book: a good website answers these on one page, so the customer can call ready to buy instead of sending a message and waiting.</p><h3 id="it-looks-established">It makes you look established</h3><p>Many people check for a website before they call. A professional site tells them you are a real, active business.</p></section>
<section><h2 id="use-both">Use both, and link them</h2><p>Keep posting on social, and point every profile to your website. Put the phone number, booking link and services on the site, where they are easy to find and always up to date.</p><div class="callout"><p>Not sure what your site would look like? We will design a free demo first, with no credit card and no commitment.</p></div></section>$c$,
'Do I Need a Website If I Have a Facebook Page?',
'A Facebook page is not a website. What each one does for a local business, and why most do best with both.',
'do i need a website if i have a facebook page',
array['facebook page vs website','small business website','local seo'],
'tips',
array['social media','getting found'],
'[{"href":"/#examples","text":"See example designs"},{"href":"/#how-it-works","text":"How the free demo works"}]'::jsonb,
'Start My Free Demo', '/#demo', true, now() - interval '3 days'
) on conflict (slug) do nothing;

insert into public.ryzon_landing_blog (slug, title, excerpt, content, meta_title, meta_description, focus_keyword, secondary_keywords, category, tags, internal_links, cta_text, cta_href, is_published, published_at)
values (
'local-service-business-website-checklist',
'What to Put on a Local Service Business Website: A 10-Point Checklist',
'The ten things every plumber, salon, lawn crew or café website needs so visitors can trust you, find what they need and call.',
$c$<section><h2 id="why-a-checklist">Why a checklist</h2><p>Most local customers decide in seconds whether to call or hit back. They are looking for a few specific things. If your site shows them clearly, you get the call. Use this list to check your current site or plan a new one.</p></section>
<section><h2 id="the-checklist">The checklist</h2><ol><li><strong>What you do and where, at the top.</strong> One clear headline: the service and the area you cover.</li><li><strong>A phone number you can tap.</strong> On phones it should dial with one tap, in the header and again further down.</li><li><strong>One main action.</strong> Call, book or request a quote. Pick one and repeat it.</li><li><strong>Your services, each explained.</strong> Short sections or pages for each service, in plain words.</li><li><strong>Service area.</strong> List the towns or neighborhoods you serve.</li><li><strong>Hours.</strong> Including weekends and emergency availability if you offer it.</li><li><strong>Real photos.</strong> Your team, your work, your storefront. Stock photos are fine for backgrounds, not for proof.</li><li><strong>Reviews.</strong> Real ones from real customers, with names if they agree.</li><li><strong>Prices or a starting price.</strong> Even a range helps people decide to call.</li><li><strong>Fast and easy on a phone.</strong> Big buttons, readable text, and pages that load quickly on mobile data.</li></ol></section>
<section><h2 id="common-mistakes">Common mistakes</h2><ul><li>Burying the phone number in the footer.</li><li>A homepage slideshow that hides the main message.</li><li>Out-of-date hours or prices.</li><li>Contact forms that ask for too much.</li></ul></section>
<section><h2 id="next-step">Next step</h2><p>Go through your site on your own phone and tick off each item. Anything missing is a quick win. If it is easier to start fresh, we can design a free demo that covers all ten points.</p></section>$c$,
'Local Service Business Website Checklist (10 Points)',
'The ten things every local service business website needs: tap-to-call, services, area, hours, reviews, prices and a fast mobile layout.',
'local business website checklist',
array['what to put on a business website','service business website','website must haves'],
'how-to',
array['checklist','planning','mobile'],
'[{"href":"/#examples","text":"Example designs for local businesses"},{"href":"/#styles","text":"Pick a design style"},{"href":"/#pricing","text":"Plans and prices"}]'::jsonb,
'Get My Free Demo', '/#demo', true, now() - interval '1 day'
) on conflict (slug) do nothing;
