-- Location pages: "Website design for {industry} in {city}, {ST}" and "... in {state}".
--
-- Modeled on the junk-removals project: one row per page, text written once by a SQL
-- template with varied wording (12 openings, 3 local paragraphs, FAQ order per page),
-- and the page code renders the row. Prices and the current offer are NOT stored here;
-- the page code shows them from site.config.json so a price change never rewrites rows.
--
-- City facts (county, nearby towns, landmarks, coordinates) come from the junk-removals
-- project's researched city_pages, copied into ryzon_landing_city_source.
-- Re-runnable: rebuild with  select public.ryzon_landing_build_location_pages();

-- 1. Source facts (filled once from the junk-removals project).
create table if not exists public.ryzon_landing_city_source (
  state_slug text not null,
  city_slug text not null,
  city_name text not null,
  state_code text,
  lat numeric,
  lng numeric,
  nearby_cities text,
  landmarks text,
  city_context text,
  primary key (state_slug, city_slug)
);
create table if not exists public.ryzon_landing_state_source (
  state_slug text primary key,
  state_name text not null,
  state_code text,
  lat numeric,
  lng numeric
);
alter table public.ryzon_landing_city_source enable row level security;
alter table public.ryzon_landing_state_source enable row level security;
revoke all on public.ryzon_landing_city_source, public.ryzon_landing_state_source from anon, authenticated;

-- 2. Industries. Add a row and rebuild to add an industry.
create table if not exists public.ryzon_landing_industries (
  slug text primary key,                -- URL segment: /website-design/{slug}/...
  name text not null,                   -- "Plumbers"
  label text not null,                  -- title word: "Plumber" in "Plumber Website Design in ..."
  plural text not null,                 -- "plumbers"
  singular text not null,               -- "plumber"
  trade text not null,                  -- "plumbing"
  search_note text not null,            -- how customers search; {city} is filled per page
  site_includes text[] not null,        -- pages and features the site should have
  faqs jsonb not null,                  -- [{question, answer}], {city} filled per page
  sort int not null default 0,
  is_active boolean not null default true
);

-- 3. Pages.
create table if not exists public.ryzon_landing_city_pages (
  id uuid primary key default gen_random_uuid(),
  industry_slug text not null references public.ryzon_landing_industries(slug) on update cascade,
  state_slug text not null,
  state_code text not null,
  state_name text not null,
  city_slug text not null,
  city_name text not null,
  county text,                          -- "Wayne County", or null when unknown
  area_label text not null,             -- county, else "the X area", else the state
  lat numeric,
  lng numeric,
  nearby_cities text,                   -- "A|B|C", closest first
  unique_intro text not null,
  city_context text not null,
  search_note text not null,
  site_includes text not null,          -- ';' separated
  faqs jsonb not null,
  meta_title text not null,
  meta_description text not null,
  is_active boolean not null default true,
  seo_status text not null default 'generated',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (industry_slug, state_slug, city_slug)
);
create index if not exists ryzon_landing_city_pages_state on public.ryzon_landing_city_pages (industry_slug, state_slug, city_name);

create table if not exists public.ryzon_landing_state_pages (
  id uuid primary key default gen_random_uuid(),
  industry_slug text not null references public.ryzon_landing_industries(slug) on update cascade,
  state_slug text not null,
  state_code text not null,
  state_name text not null,
  hero_title text not null,
  intro text not null,
  state_context text not null,
  city_count int not null default 0,
  faqs jsonb not null,
  meta_title text not null,
  meta_description text not null,
  is_active boolean not null default true,
  seo_status text not null default 'generated',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (industry_slug, state_slug)
);

alter table public.ryzon_landing_industries enable row level security;
alter table public.ryzon_landing_city_pages enable row level security;
alter table public.ryzon_landing_state_pages enable row level security;

drop policy if exists "Public reads active industries" on public.ryzon_landing_industries;
create policy "Public reads active industries" on public.ryzon_landing_industries for select to anon, authenticated using (is_active);
drop policy if exists "Public reads active city pages" on public.ryzon_landing_city_pages;
create policy "Public reads active city pages" on public.ryzon_landing_city_pages for select to anon, authenticated using (is_active);
drop policy if exists "Public reads active state pages" on public.ryzon_landing_state_pages;
create policy "Public reads active state pages" on public.ryzon_landing_state_pages for select to anon, authenticated using (is_active);
drop policy if exists "Admins write industries" on public.ryzon_landing_industries;
create policy "Admins write industries" on public.ryzon_landing_industries for all to authenticated using (public.ryzon_landing_is_admin()) with check (public.ryzon_landing_is_admin());
drop policy if exists "Admins write city pages" on public.ryzon_landing_city_pages;
create policy "Admins write city pages" on public.ryzon_landing_city_pages for all to authenticated using (public.ryzon_landing_is_admin()) with check (public.ryzon_landing_is_admin());
drop policy if exists "Admins write state pages" on public.ryzon_landing_state_pages;
create policy "Admins write state pages" on public.ryzon_landing_state_pages for all to authenticated using (public.ryzon_landing_is_admin()) with check (public.ryzon_landing_is_admin());

grant select on public.ryzon_landing_industries, public.ryzon_landing_city_pages, public.ryzon_landing_state_pages to anon, authenticated;
grant insert, update, delete on public.ryzon_landing_industries, public.ryzon_landing_city_pages, public.ryzon_landing_state_pages to authenticated;

-- 4. The five industries.
insert into public.ryzon_landing_industries (slug, name, label, plural, singular, trade, search_note, site_includes, faqs, sort) values
('plumbers', 'Plumbers', 'Plumber', 'plumbers', 'plumber', 'plumbing',
 'Plumbing searches are often urgent. People in {city} type things like "emergency plumber near me", "water heater repair" or "drain cleaning {city}", usually on a phone, and call one of the first businesses that answers the question. Your site should load fast, show a tap-to-call number at the top of every page and have a page for each job you want to be called about.',
 array['Emergency plumbing page with tap-to-call','Drain cleaning and sewer line pages','Water heater repair and installation page','Leak detection and repiping page','Service area page listing the towns you cover','Quote request form for non-urgent jobs'],
 '[{"question":"Do I need a separate page for each plumbing service?","answer":"It helps. A page for drain cleaning, one for water heaters and one for emergency calls gives Google a clear match for each search, and gives {city} customers the exact answer they came for."},{"question":"Can my website handle emergency calls after hours?","answer":"Your site can show a tap-to-call button on every page plus a short form for non-urgent jobs. With business automations, new requests from {city} customers can go straight to your phone."}]', 1),
('hvac', 'HVAC Companies', 'HVAC', 'HVAC companies', 'HVAC company', 'heating and cooling',
 'Heating and cooling searches follow the seasons. In {city}, "furnace repair" and "no heat" searches climb when it turns cold, and "AC repair" and "AC not cooling" searches climb when it turns hot. A site that features the right service at the right time of year, with a clear phone number and a maintenance plan page, matches what people are searching for.',
 array['Furnace repair and replacement page','AC repair and installation page','Heat pump page','Maintenance plan and tune-up page','Emergency no-heat and no-cool page with tap-to-call','Financing or estimate request form'],
 '[{"question":"Should my HVAC website change with the seasons?","answer":"Yes. Featuring furnace tune-ups in the fall and AC service before summer keeps your site matching what {city} customers are searching for at that time of year."},{"question":"Can customers request maintenance through my website?","answer":"Yes. A simple request form for tune-ups and maintenance plans lets {city} customers ask for a visit any time, even when your office is closed."}]', 2),
('roofing', 'Roofers', 'Roofing', 'roofers', 'roofer', 'roofing',
 'Roofing customers research before they call. Homeowners in {city} search for "roof replacement", "roof leak repair" or "storm damage roofer", then compare a few companies by their photos, reviews and how easy it is to request an estimate. Real before-and-after photos and a simple estimate form do much of the selling.',
 array['Roof replacement page','Roof repair and leak page','Storm and hail damage page','Gutters and inspections pages','Project gallery with before-and-after photos','Free estimate request form'],
 '[{"question":"How should I show my roofing work on my website?","answer":"Use real before-and-after photos from your jobs and a dedicated page for storm damage. Homeowners in {city} want to see roofs you have actually done, not stock photos."},{"question":"Can my website collect roof estimate requests?","answer":"Yes. A short form that asks for the address, the type of roof and a few photos makes it easy for {city} homeowners to request an estimate."}]', 3),
('electricians', 'Electricians', 'Electrician', 'electricians', 'electrician', 'electrical',
 'People in {city} search for an electrician by the job: "panel upgrade", "EV charger installation", "outlet not working" or "electrician near me". Before they call, they look for signs you are qualified, such as your license details, real job photos and a clear list of what you do.',
 array['Panel upgrade and rewiring pages','EV charger installation page','Lighting and fixture page','Generator installation page','Troubleshooting and repair page','License and insurance details on every page'],
 '[{"question":"What should an electrician website show to build trust?","answer":"Your license details, real job photos, the services you offer and a clear service area. Homeowners in {city} want to know you are qualified before they call."},{"question":"Should I have a page for EV charger installation?","answer":"If you install them, yes. It is a specific job people search for, and a dedicated page gives {city} customers a direct answer."}]', 4),
('landscaping', 'Lawn Care and Landscaping Companies', 'Landscaping', 'lawn care and landscaping companies', 'landscaper', 'lawn care and landscaping',
 'Lawn care and landscaping customers in {city} usually search when the season changes: "lawn mowing service", "spring cleanup", "landscape design" or "patio installation". They want to see your work and get a quote quickly, so a gallery of local jobs and a short quote form matter more than long paragraphs.',
 array['Lawn mowing and maintenance page','Landscape design and installation page','Spring and fall cleanup pages','Hardscaping and patio page','Photo gallery of local jobs','Quote form with address and yard details'],
 '[{"question":"Should my lawn care website show prices?","answer":"Starting prices or a simple quote form both work. Many {city} homeowners want a rough idea before they call, and a quote form lets them send their address and yard details in a minute."},{"question":"Can my website feature seasonal services?","answer":"Yes. Your site can feature spring cleanups, summer maintenance and fall services at the right time of year, so it always matches what {city} customers are looking for."}]', 5)
on conflict (slug) do update set name = excluded.name, label = excluded.label, plural = excluded.plural, singular = excluded.singular, trade = excluded.trade,
  search_note = excluded.search_note, site_includes = excluded.site_includes, faqs = excluded.faqs, sort = excluded.sort;

-- 5. The builder. Writes every city and state page for every active industry (or one).
create or replace function public.ryzon_landing_build_location_pages(p_industry text default null)
returns table (city_pages bigint, state_pages bigint)
language plpgsql
set search_path = public
as $$
begin
  -- County from the researched text ("... in Van Buren County", "Fond du Lac County");
  -- else a Connecticut planning region or a Virginia independent city; else "the X area"
  -- from "a community near X"; else the state.
  create temp table loc on commit drop as
  with s as (
    select c.*, st.state_name,
      substring(c.city_context from '(?:^|\s)in (?:the )?((?:[A-Z][A-Za-z.''’‘-]*\s(?:(?:du|qui|de|la|le|of|des|del)\s)?){1,4}(?:County|Parish|Borough|Census Area))') county,
      substring(c.city_context from 'in (the (?:[A-Z][A-Za-z.''’‘-]*\s){1,6}region)') region,
      substring(c.city_context from 'in (the City of [A-Z][A-Za-z.''’‘ -]{1,40}?)[,.]') indep_city,
      substring(c.city_context from 'a community near ([A-Z][A-Za-z.''’‘ -]{1,40}?)[,.]') near
    from ryzon_landing_city_source c join ryzon_landing_state_source st using (state_slug)
  )
  select s.*, coalesce(s.county, s.region, s.indep_city, 'the ' || s.near || ' area', s.state_name) area_label,
    split_part(coalesce(s.nearby_cities, ''), '|', 1) n0, split_part(coalesce(s.nearby_cities, ''), '|', 2) n1,
    split_part(coalesce(s.nearby_cities, ''), '|', 3) n2
  from s;
  update loc set n0 = coalesce(nullif(n0, ''), 'nearby towns'), n1 = coalesce(nullif(n1, ''), 'the surrounding area'), n2 = coalesce(nullif(n2, ''), 'neighboring communities');

  insert into ryzon_landing_city_pages as cp (industry_slug, state_slug, state_code, state_name, city_slug, city_name, county, area_label, lat, lng,
    nearby_cities, unique_intro, city_context, search_note, site_includes, faqs, meta_title, meta_description, seo_status, updated_at)
  select i.slug, l.state_slug, l.state_code, l.state_name, l.city_slug, l.city_name, l.county, l.area_label, l.lat, l.lng, l.nearby_cities,
    ryzon_landing_fill((array[
      'Website design for {plural} in {city}, {ST}. Ryzon Automation builds fast, mobile-friendly sites that help {city} customers find your {trade} business on Google and call you.',
      'When someone in {city} needs a {singular}, they grab their phone and search. We build websites for {plural} in {city}, {state} that load fast, are set up for local search and make calling you one tap away.',
      'Your work speaks for itself, but {city} customers have to find it first. We design websites for {city} {plural} that put your services, your service area and your phone number where people look for them.',
      'Running a {trade} business in {city}, {ST}? Your website is often the first impression a new customer gets. We build it and manage it for you, so you can stay on the job.',
      '{City} {plural} win more work when their website answers the basics fast: what you do, where you work and how to reach you. That is exactly what we build.',
      'Ryzon Automation designs websites for {plural} in {city} and across {state}. Every site is built for phones first, set up for local search and ready to turn visits into calls and quote requests.',
      'Looking for website design for your {trade} business in {city}, {ST}? See a free demo of your new site before you pay anything, then pick a monthly plan that fits.',
      'A {singular} in {city} should not need a big upfront design bill to look professional online. We design, host and manage websites for {city} {plural} on a simple monthly plan.',
      'Customers in {city} often compare a few {plural} before they call. A modern website with real photos, clear services and an easy contact form helps them choose you.',
      'For {plural} in {city}, {state}, we build websites that do one job well: help nearby customers find you, trust you and call you.',
      'Get a professional {trade} website for your {city} business without the hassle. We handle the design, the setup and the updates while you handle the jobs.',
      'From the first search to the first call, your website does a lot of selling. Ryzon Automation builds sites for {plural} in {city}, {ST} that keep that path short and simple.'
    ])[1 + abs(hashtext(i.slug || l.state_slug || l.city_slug || 'intro')) % 12], i, l),
    ryzon_landing_fill((array[
      '{city} is a community in {area}. When customers in {city} or nearby {n0}, {n1} and {n2} search for a {singular}, Google weighs how relevant, how close and how well known each business is. A website that names the towns you serve, lists each service clearly and keeps your contact details consistent helps Google match your business to those searches.',
      'Most {plural} around {city} serve more than one town, and your website should say so. We add a clear service area covering {city}, {n0}, {n1}, {n2} and the rest of {area}, so customers and Google both know where you work.',
      'Whether your customers are in {city} itself or out toward {n0} and {n1}, they expect the same things from a {trade} website: quick answers, real photos of your work and a fast way to get a quote. We build that into every page, with a service area that covers {area}.'
    ])[1 + abs(hashtext(i.slug || l.state_slug || l.city_slug || 'ctx')) % 3], i, l),
    ryzon_landing_fill(i.search_note, i, l),
    array_to_string(i.site_includes, ';'),
    (select jsonb_agg(jsonb_build_object('question', ryzon_landing_fill(f->>'question', i, l), 'answer', ryzon_landing_fill(f->>'answer', i, l))
       order by md5(i.slug || l.city_slug || (f->>'question')))
     from jsonb_array_elements(i.faqs || jsonb_build_array(
       jsonb_build_object('question', 'How much does a {trade} website cost in {city}?',
         'answer', 'Ryzon Automation plans are a low monthly price with no large upfront design bill, and you see a free demo of your site before you pay anything. Current plans and prices are on our pricing page.'),
       jsonb_build_object('question', 'Do you work with {plural} outside {city}?',
         'answer', 'Yes. Ryzon Automation is based in Commerce Township, Michigan, and builds websites for small businesses across the US, including {plural} in {n0}, {n1} and the rest of {state}.'),
       jsonb_build_object('question', 'Will my {trade} website show up on Google?',
         'answer', 'Every site we build includes on-page SEO and analytics, so Google can understand your services and service area and you can see how visitors find you. No one can guarantee rankings, but a fast, clear, well-built site gives your {city} business a strong start.')
     )) f),
    ryzon_landing_fill('{label} Website Design in {city}, {ST}', i, l),
    left(ryzon_landing_fill('Websites for {plural} in {city}, {ST}, built to show up in local searches and turn visitors into calls. See a free design demo before you pay.', i, l), 160),
    'generated', now()
  from ryzon_landing_industries i cross join loc l
  where i.is_active and (p_industry is null or i.slug = p_industry)
  on conflict (industry_slug, state_slug, city_slug) do update set
    state_code = excluded.state_code, state_name = excluded.state_name, city_name = excluded.city_name, county = excluded.county,
    area_label = excluded.area_label, lat = excluded.lat, lng = excluded.lng, nearby_cities = excluded.nearby_cities,
    unique_intro = excluded.unique_intro, city_context = excluded.city_context, search_note = excluded.search_note,
    site_includes = excluded.site_includes, faqs = excluded.faqs, meta_title = excluded.meta_title,
    meta_description = excluded.meta_description, updated_at = now()
  where cp.seo_status = 'generated';  -- never overwrite a page someone edited by hand ('custom')

  insert into ryzon_landing_state_pages as sp (industry_slug, state_slug, state_code, state_name, hero_title, intro, state_context, city_count, faqs,
    meta_title, meta_description, seo_status, updated_at)
  select i.slug, st.state_slug, coalesce(st.state_code, ''), st.state_name,
    'Website Design for ' || i.name || ' in ' || st.state_name,
    replace(replace(replace((array[
      'Ryzon Automation builds websites for {plural} across {state}. Every site is designed for phones first, set up for local search and managed for you on a simple monthly plan, with no large upfront design bill.',
      'From the biggest cities in {state} to small towns, customers find {plural} the same way: they search on their phone and call the business that answers their question fastest. We build {trade} websites that do exactly that.',
      'Your {trade} business deserves a website that works as hard as you do. We design, host and manage websites for {plural} throughout {state}, and you see a free demo before you pay anything.'
    ])[1 + abs(hashtext(i.slug || st.state_slug)) % 3], '{plural}', i.plural), '{state}', st.state_name), '{trade}', i.trade),
    'We build websites for ' || i.plural || ' in ' || coalesce(cnt.n, 0) || ' ' || st.state_name || ' cities and towns. Pick your city below to see how a website can help your ' || i.trade
      || ' business get found by nearby customers, or request a free demo and we will design one around your service area.',
    coalesce(cnt.n, 0),
    jsonb_build_array(
      jsonb_build_object('question', 'Do you build websites for ' || i.plural || ' anywhere in ' || st.state_name || '?',
        'answer', 'Yes. Ryzon Automation works with small businesses across the US, including ' || i.plural || ' in every part of ' || st.state_name || '. Everything is handled online, so your location is never a problem.'),
      jsonb_build_object('question', 'How fast can I see a website for my ' || i.trade || ' business?',
        'answer', 'Request a free demo and we design a preview of your new site, often ready as soon as the next day. You only pick a plan if you like it.'),
      jsonb_build_object('question', 'Will my website target the towns I serve in ' || st.state_name || '?',
        'answer', 'Yes. We add a clear service area listing the cities and towns you cover, so customers and Google both know where you work.')),
    'Website Design for ' || i.name || ' in ' || st.state_name,
    left('Websites for ' || i.plural || ' in ' || st.state_name || ', built for phones and local search. See a free design demo of your new site before you pay.', 160),
    'generated', now()
  from ryzon_landing_industries i cross join ryzon_landing_state_source st
  left join (select state_slug, count(*)::int n from ryzon_landing_city_source group by 1) cnt on cnt.state_slug = st.state_slug
  where i.is_active and (p_industry is null or i.slug = p_industry)
  on conflict (industry_slug, state_slug) do update set
    state_name = excluded.state_name, hero_title = excluded.hero_title, intro = excluded.intro, state_context = excluded.state_context,
    city_count = excluded.city_count, faqs = excluded.faqs, meta_title = excluded.meta_title, meta_description = excluded.meta_description, updated_at = now()
  where sp.seo_status = 'generated';

  return query select (select count(*) from ryzon_landing_city_pages), (select count(*) from ryzon_landing_state_pages);
end $$;

-- Fills {city} {City} {ST} {state} {area} {n0} {n1} {n2} {plural} {label} {singular} {Singular} {trade}.
create or replace function public.ryzon_landing_fill(t text, i public.ryzon_landing_industries, l record)
returns text language plpgsql immutable as $$
begin
  -- "an electrician", "an HVAC company": vowel sounds take "an".
  return replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(t,
    'a {singular}', case when i.singular ~ '^([aeiouAEIOU]|H[A-Z])' then 'an {singular}' else 'a {singular}' end),
    'A {singular}', case when i.singular ~ '^([aeiouAEIOU]|H[A-Z])' then 'An {singular}' else 'A {singular}' end),
    '{City}', l.city_name), '{city}', l.city_name), '{ST}', coalesce(l.state_code, '')), '{state}', l.state_name),
    '{area}', l.area_label), '{n0}', l.n0), '{n1}', l.n1), '{n2}', l.n2),
    '{plural}', i.plural), '{label}', i.label), '{Singular}', upper(left(i.singular, 1)) || substr(i.singular, 2)), '{singular}', i.singular), '{trade}', i.trade);
end $$;

revoke all on function public.ryzon_landing_build_location_pages(text) from public, anon, authenticated;
