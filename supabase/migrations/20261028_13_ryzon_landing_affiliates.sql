-- Ryzon landing: affiliate program.
--
-- How it fits together:
--   1. Someone applies on /affiliates (ryzon_landing_affiliate_apply). You approve them in the
--      dashboard, which gives them a code and emails their link (ryzon_landing_admin_affiliate_update).
--   2. Visitors arrive on any page with ?aff=<code> or on /a/<code>. The site's proxy sets first-party
--      cookies (last touch, first touch, and a short touch history) that last affiliate_cookie_days, and
--      logs the click (ryzon_landing_affiliate_click).
--   3. When that visitor sends a demo or contact form inside the window, the cookie travels with the
--      form and ryzon_landing_submit credits the lead to the most recent valid affiliate (last click).
--   4. Payments by a credited customer create commission rows: hosting at affiliate_rate_hosting of
--      each hosting payment (first checkout, then each renewal invoice, capped at
--      affiliate_hosting_months when set), design at affiliate_rate_design of any upfront design fee
--      or design-files purchase. Commissions start 'pending'; you approve and mark them paid.
--
-- Settings (ryzon_landing_config): affiliate_cookie_days, affiliate_rate_hosting, affiliate_rate_design,
-- affiliate_hosting_months (empty = for as long as the customer pays). Keep affiliate_cookie_days
-- in step with site.config.json "affiliates.cookieDays", which the site uses for the cookies.

insert into public.ryzon_landing_config (key, value) values
  ('affiliate_cookie_days', '60'),
  ('affiliate_rate_hosting', '0.25'),
  ('affiliate_rate_design', '0.50'),
  ('affiliate_hosting_months', '')
on conflict (key) do nothing;

-- ---------------------------------------------------------------- tables
create table if not exists public.ryzon_landing_affiliates (
  id uuid primary key default gen_random_uuid(),
  code text unique check (code ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(code) between 3 and 40),
  status text not null default 'applied' check (status in ('applied', 'active', 'paused', 'rejected')),
  source text not null default 'form' check (source in ('form', 'admin')),
  name text not null,
  email text not null,
  phone text,
  business_name text,
  website text,
  audience text,            -- who they reach (applicant's words)
  promote_how text,         -- how they plan to share (applicant's words)
  notes text,               -- anything else the applicant added
  payout_email text,        -- where to send payouts, if different
  admin_notes text,
  applied_at timestamptz not null default now(),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'active' or code is not null)
);
comment on table public.ryzon_landing_affiliates is 'Ryzon landing: affiliate applications and approved affiliates. code is set when approved.';
create unique index if not exists ryzon_landing_affiliates_email_uidx on public.ryzon_landing_affiliates (lower(email));
drop trigger if exists ryzon_landing_affiliates_touch on public.ryzon_landing_affiliates;
create trigger ryzon_landing_affiliates_touch before update on public.ryzon_landing_affiliates
  for each row execute function public.ryzon_landing_touch();

create table if not exists public.ryzon_landing_affiliate_clicks (
  id bigint generated always as identity primary key,
  affiliate_id uuid not null references public.ryzon_landing_affiliates (id) on delete cascade,
  visitor_id text,          -- random id in the visitor's rz_vid cookie; no personal data
  landing_path text,
  referrer_host text,
  created_at timestamptz not null default now()
);
comment on table public.ryzon_landing_affiliate_clicks is 'Ryzon landing: one row per affiliate link visit (deduplicated per visitor for 30 minutes).';
create index if not exists ryzon_landing_affiliate_clicks_aff_idx on public.ryzon_landing_affiliate_clicks (affiliate_id, created_at desc);
create index if not exists ryzon_landing_affiliate_clicks_visitor_idx on public.ryzon_landing_affiliate_clicks (visitor_id, created_at desc);

alter table public.ryzon_landing_submissions
  add column if not exists affiliate_id uuid references public.ryzon_landing_affiliates (id) on delete set null,
  add column if not exists affiliate_clicked_at timestamptz,
  add column if not exists affiliate_touches jsonb;
create index if not exists ryzon_landing_submissions_affiliate_idx on public.ryzon_landing_submissions (affiliate_id) where affiliate_id is not null;

create table if not exists public.ryzon_landing_affiliate_commissions (
  id bigint generated always as identity primary key,
  affiliate_id uuid not null references public.ryzon_landing_affiliates (id) on delete cascade,
  submission_id uuid references public.ryzon_landing_submissions (id) on delete set null,
  payment_id bigint references public.ryzon_landing_payments (id) on delete set null,
  stripe_invoice_id text,
  kind text not null check (kind in ('hosting', 'design')),
  basis_cents int not null check (basis_cents >= 0),
  rate numeric(5, 4) not null check (rate >= 0 and rate <= 1),
  amount_cents int not null check (amount_cents >= 0),
  currency text not null default 'usd',
  status text not null default 'pending' check (status in ('pending', 'approved', 'paid', 'void')),
  note text,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  paid_at timestamptz,
  updated_at timestamptz not null default now()
);
comment on table public.ryzon_landing_affiliate_commissions is 'Ryzon landing: what each affiliate earned, per payment. pending -> approved -> paid (or void).';
create unique index if not exists ryzon_landing_affiliate_commissions_payment_uidx on public.ryzon_landing_affiliate_commissions (payment_id, kind) where payment_id is not null;
create unique index if not exists ryzon_landing_affiliate_commissions_invoice_uidx on public.ryzon_landing_affiliate_commissions (stripe_invoice_id, kind) where stripe_invoice_id is not null;
create index if not exists ryzon_landing_affiliate_commissions_aff_idx on public.ryzon_landing_affiliate_commissions (affiliate_id, created_at desc);
create index if not exists ryzon_landing_affiliate_commissions_sub_idx on public.ryzon_landing_affiliate_commissions (submission_id);
drop trigger if exists ryzon_landing_affiliate_commissions_touch on public.ryzon_landing_affiliate_commissions;
create trigger ryzon_landing_affiliate_commissions_touch before update on public.ryzon_landing_affiliate_commissions
  for each row execute function public.ryzon_landing_touch();

-- Renewal invoices Stripe reports for subscriptions (first payments live in ryzon_landing_payments).
create table if not exists public.ryzon_landing_invoices (
  id bigint generated always as identity primary key,
  stripe_invoice_id text not null unique,
  stripe_subscription_id text,
  submission_id uuid references public.ryzon_landing_submissions (id) on delete set null,
  billing_reason text,
  amount_paid int,
  currency text,
  created_at timestamptz not null default now()
);
comment on table public.ryzon_landing_invoices is 'Ryzon landing: subscription renewal invoices from Stripe (invoice.paid), used for recurring affiliate commissions.';
create index if not exists ryzon_landing_invoices_sub_idx on public.ryzon_landing_invoices (submission_id);

-- Admin-only reads; every write goes through the functions below.
alter table public.ryzon_landing_affiliates enable row level security;
alter table public.ryzon_landing_affiliate_clicks enable row level security;
alter table public.ryzon_landing_affiliate_commissions enable row level security;
alter table public.ryzon_landing_invoices enable row level security;
drop policy if exists "Admins read affiliates" on public.ryzon_landing_affiliates;
create policy "Admins read affiliates" on public.ryzon_landing_affiliates for select to authenticated using ((select public.ryzon_landing_is_admin()));
drop policy if exists "Admins read affiliate clicks" on public.ryzon_landing_affiliate_clicks;
create policy "Admins read affiliate clicks" on public.ryzon_landing_affiliate_clicks for select to authenticated using ((select public.ryzon_landing_is_admin()));
drop policy if exists "Admins read affiliate commissions" on public.ryzon_landing_affiliate_commissions;
create policy "Admins read affiliate commissions" on public.ryzon_landing_affiliate_commissions for select to authenticated using ((select public.ryzon_landing_is_admin()));
drop policy if exists "Admins read invoices" on public.ryzon_landing_invoices;
create policy "Admins read invoices" on public.ryzon_landing_invoices for select to authenticated using ((select public.ryzon_landing_is_admin()));
revoke all on public.ryzon_landing_affiliates, public.ryzon_landing_affiliate_clicks, public.ryzon_landing_affiliate_commissions, public.ryzon_landing_invoices from anon, authenticated;
grant select on public.ryzon_landing_affiliates, public.ryzon_landing_affiliate_clicks, public.ryzon_landing_affiliate_commissions, public.ryzon_landing_invoices to authenticated;

-- ---------------------------------------------------------------- helpers
create or replace function public.ryzon_landing_affiliate_cookie_days() returns int
language sql stable security definer set search_path = '' as $fn$
  select greatest(1, least(365, coalesce(nullif(public.ryzon_landing_cfg('affiliate_cookie_days'), '')::int, 60)));
$fn$;

create or replace function public.ryzon_landing_affiliate_url(p_code text) returns text
language sql stable security definer set search_path = '' as $fn$
  select rtrim(coalesce(public.ryzon_landing_cfg('site_url'), ''), '/') || '/a/' || p_code;
$fn$;

-- A readable unique code from the name: "jane-smith", then "jane-smith-k3p9" if taken.
create or replace function public.ryzon_landing_new_affiliate_code(p_name text) returns text
language plpgsql volatile security definer set search_path = '' as $fn$
declare v_base text := trim(both '-' from regexp_replace(lower(coalesce(p_name, '')), '[^a-z0-9]+', '-', 'g')); v_code text;
begin
  v_base := left(coalesce(nullif(v_base, ''), 'partner'), 24);
  if length(v_base) < 3 then v_base := v_base || '-partner'; end if;
  v_code := v_base;
  while exists (select 1 from public.ryzon_landing_affiliates where code = v_code) loop
    v_code := v_base || '-' || substr(md5(gen_random_uuid()::text), 1, 4);
  end loop;
  return v_code;
end $fn$;

create or replace function public.ryzon_landing_affiliate_vars(a public.ryzon_landing_affiliates) returns jsonb
language sql stable security definer set search_path = '' as $fn$
  select jsonb_build_object(
    'first_name', public.ryzon_landing_first_name(a.name),
    'name', a.name,
    'email', a.email,
    'phone', coalesce(a.phone, ''),
    'business_name', coalesce(a.business_name, ''),
    'website', coalesce(a.website, ''),
    'audience', coalesce(a.audience, ''),
    'promote_how', coalesce(a.promote_how, ''),
    'notes', coalesce(a.notes, ''),
    'code', coalesce(a.code, ''),
    'affiliate_url', case when a.code is null then '' else public.ryzon_landing_affiliate_url(a.code) end,
    'cookie_days', public.ryzon_landing_affiliate_cookie_days()::text,
    'rate_hosting', round(coalesce(nullif(public.ryzon_landing_cfg('affiliate_rate_hosting'), '')::numeric, 0.25) * 100)::text,
    'rate_design', round(coalesce(nullif(public.ryzon_landing_cfg('affiliate_rate_design'), '')::numeric, 0.50) * 100)::text,
    'admin_url', rtrim(coalesce(public.ryzon_landing_cfg('site_url'), ''), '/') || '/admin/affiliates',
    'site_url', rtrim(coalesce(public.ryzon_landing_cfg('site_url'), ''), '/'),
    'business_address', coalesce(public.ryzon_landing_cfg('business_address'), ''),
    'owner_name', coalesce(public.ryzon_landing_cfg('owner_name'), 'Ryzon Automation'),
    'owner_phone', coalesce(public.ryzon_landing_cfg('owner_phone'), '')
  );
$fn$;

-- ---------------------------------------------------------------- emails: queue support
alter table public.ryzon_landing_email_queue add column if not exists affiliate_id uuid references public.ryzon_landing_affiliates (id) on delete cascade;
create index if not exists ryzon_landing_email_queue_affiliate_idx on public.ryzon_landing_email_queue (affiliate_id) where affiliate_id is not null;
alter table public.ryzon_landing_email_queue drop constraint if exists ryzon_landing_email_queue_one_recipient;
alter table public.ryzon_landing_email_queue add constraint ryzon_landing_email_queue_one_recipient
  check (num_nonnulls(submission_id, referrer_id, review_id, affiliate_id) = 1);
alter table public.ryzon_landing_email_templates drop constraint if exists ryzon_landing_email_templates_recipient_check;
alter table public.ryzon_landing_email_templates add constraint ryzon_landing_email_templates_recipient_check
  check (recipient in ('customer', 'admin', 'referrer', 'reviewer', 'affiliate'));

create or replace function public.ryzon_landing_queue_affiliate_email(p_affiliate uuid, p_template text) returns bigint
language plpgsql security definer set search_path = '' as $fn$
declare v_id bigint;
begin
  insert into public.ryzon_landing_email_queue (affiliate_id, template_key, send_at)
  values (p_affiliate, p_template, now()) returning id into v_id;
  perform public.ryzon_landing_kick();
  return v_id;
end $fn$;

-- claim_due gains an affiliate branch; everything else is unchanged from migration 09.
create or replace function public.ryzon_landing_claim_due(p_limit int default 25)
returns table (queue_id bigint, template_key text, to_email text, reply_to text, from_name text, subject text, html text, text_body text)
language plpgsql security definer set search_path = '' as $fn$
declare
  q public.ryzon_landing_email_queue;
  s public.ryzon_landing_submissions;
  t public.ryzon_landing_email_templates;
  r public.ryzon_landing_referrers;
  rv public.ryzon_landing_reviews;
  af public.ryzon_landing_affiliates;
  v_vars jsonb;
  v_admin text := public.ryzon_landing_cfg('admin_email');
  v_from text := coalesce(public.ryzon_landing_cfg('from_name'), 'Ryzon Automation');
  v_call_status text;
begin
  -- Recover rows stuck in 'sending' (n8n crashed mid-run).
  update public.ryzon_landing_email_queue set state = 'pending'
   where state = 'sending' and updated_at < now() - interval '30 minutes';

  for q in
    select * from public.ryzon_landing_email_queue
     where state = 'pending' and send_at <= now()
     order by send_at
     limit p_limit
     for update skip locked
  loop
    select * into t from public.ryzon_landing_email_templates where key = q.template_key;

    -- Affiliate emails: the confirmation and approval go to the affiliate, the alert to the owner.
    if q.affiliate_id is not null then
      select * into af from public.ryzon_landing_affiliates where id = q.affiliate_id;
      if not found then
        update public.ryzon_landing_email_queue set state = 'cancelled', cancel_reason = 'affiliate removed' where id = q.id;
        continue;
      end if;
      v_vars := public.ryzon_landing_affiliate_vars(af)
        || coalesce(public.ryzon_landing_cfg('email_styles')::jsonb, '{}'::jsonb)
        || jsonb_build_object('preheader', t.preheader)
        || coalesce(q.vars, '{}'::jsonb);
      update public.ryzon_landing_email_queue set state = 'sending', attempts = attempts + 1 where id = q.id;
      queue_id := q.id;
      template_key := q.template_key;
      to_email := case when t.recipient = 'admin' then v_admin else af.email end;
      reply_to := case when t.recipient = 'admin' then af.email else v_admin end;
      from_name := case when t.recipient = 'admin' then 'Ryzon Pipeline' else v_from end;
      subject := public.ryzon_landing_render(t.subject, v_vars, false);
      html := public.ryzon_landing_render(replace(
        coalesce(public.ryzon_landing_cfg('email_layout_' || case when t.recipient = 'admin' then 'admin' else 'customer' end), '{{body_html}}'),
        '{{body_html}}', t.html), v_vars, true);
      text_body := public.ryzon_landing_render(t.text_body, v_vars, false);
      return next;
      continue;
    end if;

    -- Review emails: the request goes to the customer, the alert to the owner.
    if q.review_id is not null then
      select * into rv from public.ryzon_landing_reviews where id = q.review_id;
      if not found or (t.recipient = 'reviewer' and rv.status <> 'sent') then
        update public.ryzon_landing_email_queue set state = 'cancelled', cancel_reason = 'already answered' where id = q.id;
        continue;
      end if;
      v_vars := public.ryzon_landing_review_vars(rv)
        || coalesce(public.ryzon_landing_cfg('email_styles')::jsonb, '{}'::jsonb)
        || jsonb_build_object('preheader', t.preheader)
        || coalesce(q.vars, '{}'::jsonb);
      update public.ryzon_landing_email_queue set state = 'sending', attempts = attempts + 1 where id = q.id;
      queue_id := q.id;
      template_key := q.template_key;
      to_email := case when t.recipient = 'admin' then v_admin else rv.email end;
      reply_to := case when t.recipient = 'admin' then rv.email else v_admin end;
      from_name := case when t.recipient = 'admin' then 'Ryzon Pipeline' else v_from end;
      subject := public.ryzon_landing_render(t.subject, v_vars, false);
      html := public.ryzon_landing_render(replace(
        coalesce(public.ryzon_landing_cfg('email_layout_' || case when t.recipient = 'admin' then 'admin' else 'customer' end), '{{body_html}}'),
        '{{body_html}}', t.html), v_vars, true);
      text_body := public.ryzon_landing_render(t.text_body, v_vars, false);
      return next;
      continue;
    end if;

    -- Referrer emails: no submission, sent to the referrer.
    if q.referrer_id is not null then
      select * into r from public.ryzon_landing_referrers where id = q.referrer_id;
      if not found or not r.is_active then
        update public.ryzon_landing_email_queue set state = 'cancelled', cancel_reason = 'referrer turned off' where id = q.id;
        continue;
      end if;
      v_vars := public.ryzon_landing_referrer_vars(r)
        || coalesce(public.ryzon_landing_cfg('email_styles')::jsonb, '{}'::jsonb)
        || jsonb_build_object('preheader', t.preheader)
        || coalesce(q.vars, '{}'::jsonb);
      update public.ryzon_landing_email_queue set state = 'sending', attempts = attempts + 1 where id = q.id;
      queue_id := q.id;
      template_key := q.template_key;
      to_email := r.email;
      reply_to := v_admin;
      from_name := v_from;
      subject := public.ryzon_landing_render(t.subject, v_vars, false);
      html := public.ryzon_landing_render(replace(
        coalesce(public.ryzon_landing_cfg('email_layout_customer'), '{{body_html}}'), '{{body_html}}', t.html), v_vars, true);
      text_body := public.ryzon_landing_render(t.text_body, v_vars, false);
      return next;
      continue;
    end if;

    select * into s from public.ryzon_landing_submissions where id = q.submission_id;

    if t.recipient = 'customer' and s.automations_paused then
      continue; -- paused: stays queued until resumed
    end if;
    if q.requires_status is not null and not (s.status = any (q.requires_status)) then
      update public.ryzon_landing_email_queue set state = 'cancelled', cancel_reason = 'status is ' || s.status where id = q.id;
      continue;
    end if;
    if t.is_promotional and s.unsubscribed_at is not null then
      update public.ryzon_landing_email_queue set state = 'cancelled', cancel_reason = 'unsubscribed' where id = q.id;
      continue;
    end if;
    if q.change_request_id is not null then
      select call_status into v_call_status from public.ryzon_landing_change_requests where id = q.change_request_id;
      if v_call_status = 'cancelled' then
        update public.ryzon_landing_email_queue set state = 'cancelled', cancel_reason = 'call cancelled' where id = q.id;
        continue;
      end if;
    end if;

    v_vars := public.ryzon_landing_email_vars(s, q)
      || coalesce(public.ryzon_landing_cfg('email_styles')::jsonb, '{}'::jsonb)
      || jsonb_build_object('preheader', t.preheader);
    update public.ryzon_landing_email_queue set state = 'sending', attempts = attempts + 1 where id = q.id;

    queue_id := q.id;
    template_key := q.template_key;
    to_email := case when t.recipient = 'admin' then v_admin else s.email end;
    reply_to := case when t.recipient = 'admin' then s.email else v_admin end;
    from_name := case when t.recipient = 'admin' then 'Ryzon Pipeline' else v_from end;
    subject := public.ryzon_landing_render(t.subject, v_vars, false);
    html := public.ryzon_landing_render(replace(
      coalesce(public.ryzon_landing_cfg('email_layout_' || case when t.recipient = 'admin' then 'admin' when t.is_promotional then 'promo' else 'customer' end), '{{body_html}}'),
      '{{body_html}}', t.html), v_vars, true);
    text_body := public.ryzon_landing_render(t.text_body, v_vars, false);
    return next;
  end loop;
end $fn$;

-- Resending a failed affiliate email from the dashboard keeps its target.
create or replace function public.ryzon_landing_admin_resend(p_queue_id bigint) returns bigint
language plpgsql security definer set search_path = '' as $fn$
declare q public.ryzon_landing_email_queue; v_id bigint;
begin
  perform public.ryzon_landing_require_admin();
  select * into q from public.ryzon_landing_email_queue where id = p_queue_id;
  if not found then raise exception 'not found'; end if;
  insert into public.ryzon_landing_email_queue (submission_id, referrer_id, review_id, affiliate_id, template_key, send_at, vars, change_request_id)
  values (q.submission_id, q.referrer_id, q.review_id, q.affiliate_id, q.template_key, now(), q.vars, q.change_request_id) returning id into v_id;
  perform public.ryzon_landing_kick();
  return v_id;
end $fn$;

-- ---------------------------------------------------------------- public: apply and click
-- Anyone can apply. One application per email: applying again updates the details instead.
create or replace function public.ryzon_landing_affiliate_apply(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $fn$
declare
  v_name text := left(btrim(coalesce(p->>'name', '')), 120);
  v_email text := lower(left(btrim(coalesce(p->>'email', '')), 200));
  a public.ryzon_landing_affiliates;
  v_new boolean := false;
begin
  if v_name = '' or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' then raise exception 'name and valid email required'; end if;
  -- Light abuse guard: at most 30 applications an hour across the whole site.
  if (select count(*) from public.ryzon_landing_affiliates where applied_at > now() - interval '1 hour' and source = 'form') >= 30 then
    raise exception 'too many applications, try again later';
  end if;

  select * into a from public.ryzon_landing_affiliates where lower(email) = v_email;
  if found then
    update public.ryzon_landing_affiliates set
      name = v_name,
      phone = coalesce(nullif(left(btrim(coalesce(p->>'phone', '')), 40), ''), phone),
      business_name = coalesce(nullif(left(btrim(coalesce(p->>'business_name', '')), 160), ''), business_name),
      website = coalesce(nullif(left(btrim(coalesce(p->>'website', '')), 300), ''), website),
      audience = coalesce(nullif(left(btrim(coalesce(p->>'audience', '')), 2000), ''), audience),
      promote_how = coalesce(nullif(left(btrim(coalesce(p->>'promote_how', '')), 2000), ''), promote_how),
      notes = coalesce(nullif(left(btrim(coalesce(p->>'notes', '')), 2000), ''), notes)
    where id = a.id;
  else
    insert into public.ryzon_landing_affiliates (name, email, phone, business_name, website, audience, promote_how, notes)
    values (v_name, v_email, nullif(left(btrim(coalesce(p->>'phone', '')), 40), ''), nullif(left(btrim(coalesce(p->>'business_name', '')), 160), ''),
            nullif(left(btrim(coalesce(p->>'website', '')), 300), ''), nullif(left(btrim(coalesce(p->>'audience', '')), 2000), ''),
            nullif(left(btrim(coalesce(p->>'promote_how', '')), 2000), ''), nullif(left(btrim(coalesce(p->>'notes', '')), 2000), ''))
    returning * into a;
    v_new := true;
    perform public.ryzon_landing_queue_affiliate_email(a.id, 'affiliate_application_received');
  end if;
  perform public.ryzon_landing_queue_affiliate_email(a.id, 'affiliate_application_alert');
  return jsonb_build_object('ok', true, 'new', v_new);
end $fn$;

drop function if exists public.ryzon_landing_affiliate_click(text, text, text, text);
-- Logs an affiliate link visit. Returns the cookie window in days when the code belongs to an
-- active affiliate (null otherwise), so the site only keeps cookies for real codes and the
-- window set in the dashboard is the one the browser uses. Repeat visits within 30 minutes count once.
create or replace function public.ryzon_landing_affiliate_click(p_code text, p_visitor text default null, p_path text default null, p_referrer text default null)
returns int
language plpgsql security definer set search_path = '' as $fn$
declare v_aff uuid; v_visitor text := nullif(left(regexp_replace(coalesce(p_visitor, ''), '[^A-Za-z0-9_-]', '', 'g'), 64), '');
begin
  select id into v_aff from public.ryzon_landing_affiliates where code = lower(btrim(coalesce(p_code, ''))) and status = 'active';
  if v_aff is null then return null; end if;
  if v_visitor is null or not exists (
    select 1 from public.ryzon_landing_affiliate_clicks
     where affiliate_id = v_aff and visitor_id = v_visitor and created_at > now() - interval '30 minutes') then
    insert into public.ryzon_landing_affiliate_clicks (affiliate_id, visitor_id, landing_path, referrer_host)
    values (v_aff, v_visitor, left(coalesce(p_path, ''), 300), left(coalesce(p_referrer, ''), 200));
  end if;
  return public.ryzon_landing_affiliate_cookie_days();
end $fn$;

-- The public affiliate page shows the first name of whoever sent the visitor (like /r/<code>).
create or replace function public.ryzon_landing_affiliate_public(p_code text) returns jsonb
language sql stable security definer set search_path = '' as $fn$
  select jsonb_build_object('code', a.code, 'first_name', public.ryzon_landing_first_name(a.name), 'business_name', coalesce(a.business_name, ''))
    from public.ryzon_landing_affiliates a where a.code = lower(btrim(coalesce(p_code, ''))) and a.status = 'active';
$fn$;

-- ---------------------------------------------------------------- attribution
-- Picks the affiliate to credit from the cookie data a form sends:
--   p = { code, clicked_at, first_code, first_at, touches: [{c, t}, ...] }
-- Last click wins: the most recent touch, inside the window, by an active affiliate who
-- isn't the person filling in the form. Returns null when nothing qualifies.
create or replace function public.ryzon_landing_affiliate_resolve(p jsonb, p_email text)
returns table (affiliate_id uuid, clicked_at timestamptz, touches jsonb)
language plpgsql stable security definer set search_path = '' as $fn$
declare
  v_window interval := make_interval(days => public.ryzon_landing_affiliate_cookie_days());
  v_touches jsonb := '[]'::jsonb;
  v_raw jsonb;
  t jsonb;
  v_at timestamptz;
begin
  if p is null or jsonb_typeof(p) <> 'object' then return; end if;
  v_raw := case when jsonb_typeof(p->'touches') = 'array' then p->'touches' else '[]'::jsonb end;
  if nullif(p->>'code', '') is not null then
    v_raw := v_raw || jsonb_build_array(jsonb_build_object('c', p->>'code', 't', p->>'clicked_at'));
  end if;
  if nullif(p->>'first_code', '') is not null then
    v_raw := v_raw || jsonb_build_array(jsonb_build_object('c', p->>'first_code', 't', p->>'first_at'));
  end if;
  -- Keep well-formed touches only (cookie data is visitor-controlled), at most 20.
  for t in select value from jsonb_array_elements(v_raw) limit 40 loop
    begin
      v_at := (t->>'t')::timestamptz;
    exception when others then
      v_at := null;
    end;
    if v_at is not null and lower(coalesce(t->>'c', '')) ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and v_at <= now() + interval '5 minutes' then
      v_touches := v_touches || jsonb_build_array(jsonb_build_object('c', lower(t->>'c'), 't', v_at));
    end if;
  end loop;

  return query
    select a.id, (x->>'t')::timestamptz, (select coalesce(jsonb_agg(e order by (e->>'t')::timestamptz), '[]'::jsonb)
                                            from (select distinct e from jsonb_array_elements(v_touches) e) d)
      from jsonb_array_elements(v_touches) x
      join public.ryzon_landing_affiliates a on a.code = x->>'c' and a.status = 'active'
     where (x->>'t')::timestamptz >= now() - v_window
       and lower(a.email) <> lower(coalesce(p_email, ''))
     order by (x->>'t')::timestamptz desc
     limit 1;
end $fn$;

-- ryzon_landing_submit, now crediting affiliates. Everything else is unchanged from migration 01.
create or replace function public.ryzon_landing_submit(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_type text := coalesce(p->>'form_type', 'demo');
  v_email text := lower(btrim(coalesce(p->>'email', '')));
  v_name text := btrim(coalesce(p->>'name', ''));
  v_existing public.ryzon_landing_submissions;
  v_id uuid;
  v_token text;
  v_aff_id uuid;
  v_aff_at timestamptz;
  v_aff_touches jsonb;
begin
  if v_type not in ('demo', 'contact') then raise exception 'invalid form_type'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' or v_name = '' then raise exception 'name and valid email required'; end if;

  select r.affiliate_id, r.clicked_at, r.touches into v_aff_id, v_aff_at, v_aff_touches from public.ryzon_landing_affiliate_resolve(p->'affiliate', v_email) r;
  -- People who were already in touch before they clicked an affiliate link aren't the affiliate's referral.
  if v_aff_id is not null and exists (
    select 1 from public.ryzon_landing_submissions where lower(email) = v_email and created_at < v_aff_at) then
    v_aff_id := null; v_aff_at := null; v_aff_touches := null;
  end if;

  if v_type = 'demo' then
    select * into v_existing from public.ryzon_landing_submissions
     where form_type = 'demo' and lower(email) = v_email and created_at > now() - interval '7 days'
       and status in ('demo_in_progress', 'demo_review')
     order by created_at desc limit 1;

    if found then
      update public.ryzon_landing_submissions set
        name = coalesce(nullif(v_name, ''), name),
        phone = coalesce(nullif(p->>'phone', ''), phone),
        business_name = coalesce(nullif(p->>'business_name', ''), business_name),
        industry = coalesce(nullif(p->>'industry', ''), industry),
        current_site = coalesce(nullif(p->>'current_site', ''), current_site),
        goals = coalesce(nullif(p->>'goals', ''), goals),
        style = coalesce(nullif(p->>'style', ''), style),
        form_answers = form_answers || coalesce(p->'form_answers', '{}'::jsonb),
        -- An affiliate only fills an empty slot; an existing credit is never taken away.
        affiliate_id = coalesce(affiliate_id, v_aff_id),
        affiliate_clicked_at = case when affiliate_id is null then v_aff_at else affiliate_clicked_at end,
        affiliate_touches = case when affiliate_id is null then v_aff_touches else affiliate_touches end
      where id = v_existing.id;
      insert into public.ryzon_landing_status_history (submission_id, from_status, to_status, changed_by, note)
      values (v_existing.id, v_existing.status, v_existing.status, 'form', 'Submitted the form again within 7 days; details updated');
      return jsonb_build_object('id', v_existing.id, 'token', v_existing.public_token, 'duplicate', true);
    end if;
  end if;

  insert into public.ryzon_landing_submissions (
    form_type, name, email, phone, business_name, industry, current_site, goals, style, message,
    form_answers, timezone, status, source_page, referrer, utm_source, utm_medium, utm_campaign, utm_term, utm_content,
    affiliate_id, affiliate_clicked_at, affiliate_touches
  ) values (
    v_type, v_name, v_email, nullif(p->>'phone', ''), nullif(p->>'business_name', ''), nullif(p->>'industry', ''),
    nullif(p->>'current_site', ''), nullif(p->>'goals', ''), nullif(p->>'style', ''), nullif(p->>'message', ''),
    coalesce(p->'form_answers', '{}'::jsonb), public.ryzon_landing_tz(p->>'timezone'),
    case when v_type = 'demo' then 'demo_in_progress' else 'contact' end,
    nullif(p->>'source_page', ''), nullif(p->>'referrer', ''), nullif(p->>'utm_source', ''), nullif(p->>'utm_medium', ''),
    nullif(p->>'utm_campaign', ''), nullif(p->>'utm_term', ''), nullif(p->>'utm_content', ''),
    v_aff_id, v_aff_at, v_aff_touches
  ) returning id, public_token into v_id, v_token;

  insert into public.ryzon_landing_status_history (submission_id, from_status, to_status, changed_by, note)
  values (v_id, null, case when v_type = 'demo' then 'demo_in_progress' else 'contact' end, 'form',
          'Form submitted' || case when v_aff_id is not null then ' (affiliate: ' || (select code from public.ryzon_landing_affiliates where id = v_aff_id) || ')' else '' end);

  if v_type = 'demo' then
    perform public.ryzon_landing_enqueue(v_id, 'request_received', now());
    perform public.ryzon_landing_enqueue(v_id, 'new_request_alert', now());
  else
    perform public.ryzon_landing_enqueue(v_id, 'contact_alert', now());
  end if;
  return jsonb_build_object('id', v_id, 'token', v_token, 'duplicate', false);
end $$;

-- ---------------------------------------------------------------- commissions
create or replace function public.ryzon_landing_affiliate_rate(p_kind text) returns numeric
language sql stable security definer set search_path = '' as $fn$
  select coalesce(nullif(public.ryzon_landing_cfg(case p_kind when 'design' then 'affiliate_rate_design' else 'affiliate_rate_hosting' end), '')::numeric,
                  case p_kind when 'design' then 0.50 else 0.25 end);
$fn$;

-- The program page shows the live terms, so changing them in the dashboard updates the page.
create or replace function public.ryzon_landing_affiliate_terms() returns jsonb
language sql stable security definer set search_path = '' as $fn$
  select jsonb_build_object(
    'cookie_days', public.ryzon_landing_affiliate_cookie_days(),
    'rate_hosting', round(public.ryzon_landing_affiliate_rate('hosting') * 100),
    'rate_design', round(public.ryzon_landing_affiliate_rate('design') * 100),
    'hosting_months', coalesce(nullif(public.ryzon_landing_cfg('affiliate_hosting_months'), '')::int, 0));
$fn$;

-- Adds one commission row. Idempotent per payment or invoice and kind.
create or replace function public.ryzon_landing_affiliate_add_commission(
  p_affiliate uuid, p_submission uuid, p_payment bigint, p_invoice text, p_kind text, p_basis int, p_currency text, p_note text
) returns bigint
language plpgsql security definer set search_path = '' as $fn$
declare v_rate numeric := public.ryzon_landing_affiliate_rate(p_kind); v_id bigint;
begin
  if p_affiliate is null or coalesce(p_basis, 0) <= 0 then return null; end if;
  insert into public.ryzon_landing_affiliate_commissions (affiliate_id, submission_id, payment_id, stripe_invoice_id, kind, basis_cents, rate, amount_cents, currency, note)
  values (p_affiliate, p_submission, p_payment, p_invoice, p_kind, p_basis, v_rate, round(p_basis * v_rate)::int, coalesce(nullif(p_currency, ''), 'usd'), p_note)
  on conflict do nothing
  returning id into v_id;
  return v_id;
end $fn$;

-- First payments (checkout). The design-files purchase is a design commission; plan payments are
-- hosting. A checkout that also carried an upfront design fee splits it out via design_fee_cents.
create or replace function public.ryzon_landing_affiliate_on_payment() returns trigger
language plpgsql security definer set search_path = '' as $fn$
declare v_aff uuid; v_design int := 0;
begin
  select affiliate_id into v_aff from public.ryzon_landing_submissions where id = new.submission_id;
  if v_aff is null or coalesce(new.amount_total, 0) <= 0 then return new; end if;
  if new.product = 'files99' or new.offer_code = 'files99' then
    perform public.ryzon_landing_affiliate_add_commission(v_aff, new.submission_id, new.id, null, 'design', new.amount_total, new.currency, 'Design files purchase');
  else
    v_design := least(new.amount_total, greatest(0, coalesce(new.design_fee_cents, 0)));
    perform public.ryzon_landing_affiliate_add_commission(v_aff, new.submission_id, new.id, null, 'design', v_design, new.currency, 'Upfront design fee');
    perform public.ryzon_landing_affiliate_add_commission(v_aff, new.submission_id, new.id, null, 'hosting', new.amount_total - v_design, new.currency,
      'First ' || coalesce(new.billing_interval, 'month') || ' of ' || new.product);
  end if;
  return new;
end $fn$;
alter table public.ryzon_landing_payments add column if not exists design_fee_cents int;
drop trigger if exists ryzon_landing_affiliate_on_payment on public.ryzon_landing_payments;
create trigger ryzon_landing_affiliate_on_payment after insert on public.ryzon_landing_payments
  for each row execute function public.ryzon_landing_affiliate_on_payment();

-- Renewal invoices (Stripe invoice.paid), sent by the site's Stripe webhook through the edge function.
-- p = { stripe_invoice_id, stripe_subscription_id, billing_reason, amount_paid, currency }
create or replace function public.ryzon_landing_record_invoice(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $fn$
declare
  v_inv text := nullif(p->>'stripe_invoice_id', '');
  v_subscr text := nullif(p->>'stripe_subscription_id', '');
  v_reason text := nullif(p->>'billing_reason', '');
  v_amount int := nullif(p->>'amount_paid', '')::int;
  v_sub uuid;
  v_aff uuid;
  v_months text := nullif(public.ryzon_landing_cfg('affiliate_hosting_months'), '');
  v_first timestamptz;
  v_commission bigint;
begin
  if v_inv is null then raise exception 'stripe_invoice_id required'; end if;
  -- The first invoice of a subscription is the checkout itself, already counted.
  if v_reason = 'subscription_create' then return jsonb_build_object('skipped', 'first invoice'); end if;
  select submission_id into v_sub from public.ryzon_landing_payments where stripe_subscription_id = v_subscr order by created_at limit 1;

  insert into public.ryzon_landing_invoices (stripe_invoice_id, stripe_subscription_id, submission_id, billing_reason, amount_paid, currency)
  values (v_inv, v_subscr, v_sub, v_reason, v_amount, nullif(p->>'currency', ''))
  on conflict (stripe_invoice_id) do nothing;
  if not found then return jsonb_build_object('duplicate', true); end if;
  if v_sub is null then return jsonb_build_object('recorded', true, 'customer', 'unknown subscription'); end if;

  select affiliate_id into v_aff from public.ryzon_landing_submissions where id = v_sub;
  if v_aff is null then return jsonb_build_object('recorded', true); end if;

  -- Optional cap: hosting commissions only for the first N months of the customer's plan.
  if v_months is not null then
    select min(created_at) into v_first from public.ryzon_landing_payments where submission_id = v_sub;
    if v_first is not null and now() > v_first + make_interval(months => v_months::int) then
      return jsonb_build_object('recorded', true, 'commission', 'past the commission period');
    end if;
  end if;

  v_commission := public.ryzon_landing_affiliate_add_commission(v_aff, v_sub, null, v_inv, 'hosting', v_amount, p->>'currency', 'Renewal payment');
  return jsonb_build_object('recorded', true, 'commission_id', v_commission);
end $fn$;

-- ---------------------------------------------------------------- admin
-- Create an affiliate yourself (someone you recruited). Active right away, with a code.
create or replace function public.ryzon_landing_admin_affiliate_create(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $fn$
declare
  v_name text := btrim(coalesce(p->>'name', ''));
  v_email text := lower(btrim(coalesce(p->>'email', '')));
  v_code text := nullif(lower(btrim(coalesce(p->>'code', ''))), '');
  a public.ryzon_landing_affiliates;
begin
  perform public.ryzon_landing_require_admin();
  if v_name = '' then raise exception 'Add their name'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' then raise exception 'That email doesn''t look right'; end if;
  if exists (select 1 from public.ryzon_landing_affiliates where lower(email) = v_email) then raise exception 'There is already an affiliate with that email'; end if;
  if v_code is not null and v_code !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then raise exception 'Codes can use letters, numbers and dashes only'; end if;
  if v_code is not null and exists (select 1 from public.ryzon_landing_affiliates where code = v_code) then raise exception 'That code is already taken'; end if;
  insert into public.ryzon_landing_affiliates (code, status, source, name, email, phone, business_name, website, payout_email, admin_notes, approved_at)
  values (coalesce(v_code, public.ryzon_landing_new_affiliate_code(v_name)), 'active', 'admin', v_name, v_email,
          nullif(btrim(coalesce(p->>'phone', '')), ''), nullif(btrim(coalesce(p->>'business_name', '')), ''),
          nullif(btrim(coalesce(p->>'website', '')), ''), nullif(btrim(coalesce(p->>'payout_email', '')), ''),
          nullif(btrim(coalesce(p->>'admin_notes', '')), ''), now())
  returning * into a;
  if coalesce((p->>'send')::boolean, true) then perform public.ryzon_landing_queue_affiliate_email(a.id, 'affiliate_approved'); end if;
  return jsonb_build_object('id', a.id, 'code', a.code, 'url', public.ryzon_landing_affiliate_url(a.code));
end $fn$;

-- Approve, pause, reject, rename the code or edit details. Approving gives a code (if missing)
-- and emails the affiliate their link; p.send = false skips that email.
create or replace function public.ryzon_landing_admin_affiliate_update(p_id uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $fn$
declare
  a public.ryzon_landing_affiliates;
  v_status text := nullif(p->>'status', '');
  v_code text := nullif(lower(btrim(coalesce(p->>'code', ''))), '');
  v_was text;
begin
  perform public.ryzon_landing_require_admin();
  select * into a from public.ryzon_landing_affiliates where id = p_id for update;
  if not found then raise exception 'Affiliate not found'; end if;
  v_was := a.status;
  if v_status is not null and v_status not in ('applied', 'active', 'paused', 'rejected') then raise exception 'Unknown status: %', v_status; end if;
  if v_code is not null then
    if v_code !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(v_code) < 3 then raise exception 'Codes need 3+ letters, numbers or dashes'; end if;
    if exists (select 1 from public.ryzon_landing_affiliates where code = v_code and id <> p_id) then raise exception 'That code is already taken'; end if;
    -- Changing a live code breaks links already shared; the dashboard warns before allowing it.
  end if;
  update public.ryzon_landing_affiliates set
    status = coalesce(v_status, status),
    code = coalesce(v_code, code, case when coalesce(v_status, status) = 'active' then public.ryzon_landing_new_affiliate_code(name) end),
    approved_at = case when coalesce(v_status, status) = 'active' and approved_at is null then now() else approved_at end,
    name = coalesce(nullif(btrim(coalesce(p->>'name', '')), ''), name),
    phone = case when p ? 'phone' then nullif(btrim(coalesce(p->>'phone', '')), '') else phone end,
    business_name = case when p ? 'business_name' then nullif(btrim(coalesce(p->>'business_name', '')), '') else business_name end,
    website = case when p ? 'website' then nullif(btrim(coalesce(p->>'website', '')), '') else website end,
    payout_email = case when p ? 'payout_email' then nullif(btrim(coalesce(p->>'payout_email', '')), '') else payout_email end,
    admin_notes = case when p ? 'admin_notes' then nullif(btrim(coalesce(p->>'admin_notes', '')), '') else admin_notes end
  where id = p_id
  returning * into a;
  if a.status = 'active' and v_was <> 'active' and coalesce((p->>'send')::boolean, true) then
    perform public.ryzon_landing_queue_affiliate_email(a.id, 'affiliate_approved');
  end if;
  return jsonb_build_object('id', a.id, 'status', a.status, 'code', a.code,
                            'url', case when a.code is null then null else public.ryzon_landing_affiliate_url(a.code) end);
end $fn$;

create or replace function public.ryzon_landing_admin_affiliate_send_link(p_id uuid) returns bigint
language plpgsql security definer set search_path = '' as $fn$
begin
  perform public.ryzon_landing_require_admin();
  if not exists (select 1 from public.ryzon_landing_affiliates where id = p_id and status = 'active') then raise exception 'Only active affiliates have a link to send'; end if;
  return public.ryzon_landing_queue_affiliate_email(p_id, 'affiliate_approved');
end $fn$;

-- Approve, mark paid, or void a commission.
create or replace function public.ryzon_landing_admin_commission_set(p_ids bigint[], p_status text, p_note text default null) returns int
language plpgsql security definer set search_path = '' as $fn$
declare v_n int;
begin
  perform public.ryzon_landing_require_admin();
  if p_status not in ('pending', 'approved', 'paid', 'void') then raise exception 'Unknown status: %', p_status; end if;
  update public.ryzon_landing_affiliate_commissions set
    status = p_status,
    approved_at = case when p_status in ('approved', 'paid') then coalesce(approved_at, now()) else approved_at end,
    paid_at = case when p_status = 'paid' then coalesce(paid_at, now()) when p_status <> 'paid' then null end,
    note = coalesce(nullif(btrim(coalesce(p_note, '')), ''), note)
  where id = any (p_ids);
  get diagnostics v_n = row_count;
  return v_n;
end $fn$;

-- Credit or uncredit a lead by hand (a phone lead, or a correction). Commissions already
-- created stay with whoever earned them; void them separately if needed.
create or replace function public.ryzon_landing_admin_set_submission_affiliate(p_submission uuid, p_affiliate uuid) returns void
language plpgsql security definer set search_path = '' as $fn$
begin
  perform public.ryzon_landing_require_admin();
  if p_affiliate is not null and not exists (select 1 from public.ryzon_landing_affiliates where id = p_affiliate) then raise exception 'Affiliate not found'; end if;
  update public.ryzon_landing_submissions set affiliate_id = p_affiliate,
    affiliate_clicked_at = case when p_affiliate is null then null else affiliate_clicked_at end
   where id = p_submission;
  insert into public.ryzon_landing_status_history (submission_id, from_status, to_status, changed_by, note)
  select id, status, status, 'admin',
         case when p_affiliate is null then 'Affiliate credit removed'
              else 'Credited to affiliate ' || (select code from public.ryzon_landing_affiliates where id = p_affiliate) end
    from public.ryzon_landing_submissions where id = p_submission;
end $fn$;

create or replace function public.ryzon_landing_admin_affiliate_settings(p jsonb default null) returns jsonb
language plpgsql security definer set search_path = '' as $fn$
declare k text;
begin
  perform public.ryzon_landing_require_admin();
  if p is not null then
    if p ? 'cookie_days' and ((p->>'cookie_days') !~ '^\d+$' or (p->>'cookie_days')::int not between 1 and 365) then raise exception 'Cookie window must be 1 to 365 days'; end if;
    if p ? 'rate_hosting' and ((p->>'rate_hosting') !~ '^\d+(\.\d+)?$' or (p->>'rate_hosting')::numeric > 1) then raise exception 'Rates are fractions like 0.25'; end if;
    if p ? 'rate_design' and ((p->>'rate_design') !~ '^\d+(\.\d+)?$' or (p->>'rate_design')::numeric > 1) then raise exception 'Rates are fractions like 0.50'; end if;
    if p ? 'hosting_months' and coalesce(p->>'hosting_months', '') !~ '^(\d+)?$' then raise exception 'Months must be a whole number, or empty for no limit'; end if;
    foreach k in array array['cookie_days', 'rate_hosting', 'rate_design', 'hosting_months'] loop
      if p ? k then
        insert into public.ryzon_landing_config (key, value) values ('affiliate_' || k, coalesce(p->>k, ''))
        on conflict (key) do update set value = excluded.value;
      end if;
    end loop;
  end if;
  return jsonb_build_object(
    'cookie_days', public.ryzon_landing_affiliate_cookie_days(),
    'rate_hosting', public.ryzon_landing_affiliate_rate('hosting'),
    'rate_design', public.ryzon_landing_affiliate_rate('design'),
    'hosting_months', coalesce(public.ryzon_landing_cfg('affiliate_hosting_months'), ''));
end $fn$;

-- Deleting a person also removes their affiliate record (clicks and commissions cascade).
create or replace function public.ryzon_landing_admin_delete_person(p_id uuid, p_confirm text) returns jsonb
language plpgsql security definer set search_path = '' as $fn$
declare v_email text; v_ids uuid[]; v_reviews int; v_referrers int; v_affiliates int; v_subs int;
begin
  perform public.ryzon_landing_require_admin();
  select lower(email) into v_email from public.ryzon_landing_submissions where id = p_id;
  if v_email is null then raise exception 'Not found. They may already be deleted.'; end if;
  if lower(btrim(coalesce(p_confirm, ''))) <> v_email then raise exception 'Type their email exactly to confirm: %', v_email; end if;
  select array_agg(id) into v_ids from public.ryzon_landing_submissions where lower(email) = v_email;

  delete from public.ryzon_landing_reviews where submission_id = any (v_ids) or lower(email) = v_email;
  get diagnostics v_reviews = row_count;
  delete from public.ryzon_landing_referrers where lower(email) = v_email;
  get diagnostics v_referrers = row_count;
  delete from public.ryzon_landing_affiliates where lower(email) = v_email;
  get diagnostics v_affiliates = row_count;
  delete from public.ryzon_landing_submissions where id = any (v_ids);
  get diagnostics v_subs = row_count;

  return jsonb_build_object('email', v_email, 'submissions', v_subs, 'reviews', v_reviews, 'referrers', v_referrers, 'affiliates', v_affiliates);
end $fn$;

-- ---------------------------------------------------------------- grants
revoke all on function public.ryzon_landing_affiliate_cookie_days() from public, anon, authenticated;
revoke all on function public.ryzon_landing_affiliate_url(text) from public, anon, authenticated;
revoke all on function public.ryzon_landing_new_affiliate_code(text) from public, anon, authenticated;
revoke all on function public.ryzon_landing_affiliate_vars(public.ryzon_landing_affiliates) from public, anon, authenticated;
revoke all on function public.ryzon_landing_queue_affiliate_email(uuid, text) from public, anon, authenticated;
revoke all on function public.ryzon_landing_affiliate_resolve(jsonb, text) from public, anon, authenticated;
revoke all on function public.ryzon_landing_affiliate_rate(text) from public, anon, authenticated;
revoke all on function public.ryzon_landing_affiliate_add_commission(uuid, uuid, bigint, text, text, int, text, text) from public, anon, authenticated;
revoke all on function public.ryzon_landing_affiliate_on_payment() from public, anon, authenticated;
revoke all on function public.ryzon_landing_record_invoice(jsonb) from public, anon, authenticated;
revoke all on function public.ryzon_landing_claim_due(int) from public, anon, authenticated;
revoke all on function public.ryzon_landing_submit(jsonb) from public, anon, authenticated;

-- The edge function (service role) calls submit, record_invoice and claim_due.
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname like 'ryzon\_landing\_%'
  loop
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;

revoke all on function public.ryzon_landing_affiliate_apply(jsonb) from public;
revoke all on function public.ryzon_landing_affiliate_click(text, text, text, text) from public;
revoke all on function public.ryzon_landing_affiliate_public(text) from public;
revoke all on function public.ryzon_landing_affiliate_terms() from public;
grant execute on function public.ryzon_landing_affiliate_apply(jsonb) to anon, authenticated;
grant execute on function public.ryzon_landing_affiliate_click(text, text, text, text) to anon, authenticated;
grant execute on function public.ryzon_landing_affiliate_public(text) to anon, authenticated;
grant execute on function public.ryzon_landing_affiliate_terms() to anon, authenticated;

revoke all on function public.ryzon_landing_admin_affiliate_create(jsonb) from public, anon;
revoke all on function public.ryzon_landing_admin_affiliate_update(uuid, jsonb) from public, anon;
revoke all on function public.ryzon_landing_admin_affiliate_send_link(uuid) from public, anon;
revoke all on function public.ryzon_landing_admin_commission_set(bigint[], text, text) from public, anon;
revoke all on function public.ryzon_landing_admin_set_submission_affiliate(uuid, uuid) from public, anon;
revoke all on function public.ryzon_landing_admin_affiliate_settings(jsonb) from public, anon;
revoke all on function public.ryzon_landing_admin_resend(bigint) from public, anon;
revoke all on function public.ryzon_landing_admin_delete_person(uuid, text) from public, anon;
grant execute on function public.ryzon_landing_admin_affiliate_create(jsonb) to authenticated;
grant execute on function public.ryzon_landing_admin_affiliate_update(uuid, jsonb) to authenticated;
grant execute on function public.ryzon_landing_admin_affiliate_send_link(uuid) to authenticated;
grant execute on function public.ryzon_landing_admin_commission_set(bigint[], text, text) to authenticated;
grant execute on function public.ryzon_landing_admin_set_submission_affiliate(uuid, uuid) to authenticated;
grant execute on function public.ryzon_landing_admin_affiliate_settings(jsonb) to authenticated;
grant execute on function public.ryzon_landing_admin_resend(bigint) to authenticated;
grant execute on function public.ryzon_landing_admin_delete_person(uuid, text) to authenticated;

-- ---------------------------------------------------------------- the emails
insert into public.ryzon_landing_email_templates (key, recipient, is_promotional, subject, preheader, description, html, text_body)
values
(
'affiliate_application_alert', 'admin', false,
'Affiliate application: {{name}}',
'{{email}} · {{audience}}',
'Owner alert when someone applies to the affiliate program.',
$t$<h1 style="{{st_h1}}">New affiliate application</h1><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="{{st_tbl}}"><tr><td style="{{st_k}}">Name</td><td style="{{st_v}}">{{name}}</td></tr><tr><td style="{{st_k2}}">Email</td><td style="{{st_v2}}">{{email}}</td></tr><tr><td style="{{st_k2}}">Phone</td><td style="{{st_v2}}">{{phone}}</td></tr><tr><td style="{{st_k2}}">Business</td><td style="{{st_v2}}">{{business_name}}</td></tr><tr><td style="{{st_k2}}">Website or profile</td><td style="{{st_v2}}">{{website}}</td></tr><tr><td style="{{st_k2}}">Who they reach</td><td style="{{st_v2}}">{{audience}}</td></tr><tr><td style="{{st_k2}}">How they'll promote</td><td style="{{st_v2}}">{{promote_how}}</td></tr><tr><td style="{{st_k2}}">Notes</td><td style="{{st_v2}}">{{notes}}</td></tr></table><p style="{{st_p}}">Approve them in the dashboard to create their link and email it to them.</p><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="{{st_btn_tbl}}"><tr><td bgcolor="#2F6BFF" style="{{st_btn_td}}"><a href="{{admin_url}}" style="{{st_btn_a}}">Review application</a></td></tr></table><p style="{{st_small}}">Reply to this email to write to them directly.</p>$t$,
$t$New affiliate application

Name: {{name}}
Email: {{email}}
Phone: {{phone}}
Business: {{business_name}}
Website or profile: {{website}}
Who they reach: {{audience}}
How they'll promote: {{promote_how}}
Notes: {{notes}}

Approve them in the dashboard to create their link and email it to them.
Review application: {{admin_url}}$t$
),
(
'affiliate_application_received', 'affiliate', false,
'We got your affiliate application, {{first_name}}',
'We review every application by hand and usually reply within two business days.',
'Sent to someone right after they apply to the affiliate program.',
$t$<h1 style="{{st_h1}}">Thanks for applying</h1><p style="{{st_p}}">Hi {{first_name}},</p><p style="{{st_p}}">We got your application to the Ryzon Automation affiliate program. We review every one by hand and usually reply within two business days.</p><p style="{{st_p}}"><strong>What happens next</strong></p><ol style="margin:0 0 16px;padding-left:22px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#0B1220;"><li style="margin:0 0 8px;">We look over what you sent and may reply with a question or two.</li><li style="margin:0 0 8px;">Once you're approved, we email you your personal link.</li><li style="margin:0 0 8px;">You earn {{rate_hosting}}% of monthly hosting and {{rate_design}}% of the upfront design cost for every customer who comes through your link.</li></ol><p style="{{st_p}}">Questions in the meantime? Just reply to this email.</p>$t$,
$t$Hi {{first_name}},

We got your application to the Ryzon Automation affiliate program. We review every one by hand and usually reply within two business days.

What happens next
1. We look over what you sent and may reply with a question or two.
2. Once you're approved, we email you your personal link.
3. You earn {{rate_hosting}}% of monthly hosting and {{rate_design}}% of the upfront design cost for every customer who comes through your link.

Questions in the meantime? Just reply to this email.

Talk soon,
{{owner_name}}
Ryzon Automation · {{owner_phone}}

{{business_address}}$t$
),
(
'affiliate_approved', 'affiliate', false,
'You''re in: your Ryzon affiliate link, {{first_name}}',
'Share it anywhere. Every customer who comes through it is credited to you for {{cookie_days}} days.',
'Sent when an affiliate is approved (or when you press Send link).',
$t$<h1 style="{{st_h1}}">Welcome to the affiliate program</h1><p style="{{st_p}}">Hi {{first_name}},</p><p style="{{st_p}}">You're approved. Here is your personal link. Anyone who opens it and then becomes a customer is credited to you.</p><p style="{{st_box}}"><a href="{{affiliate_url}}" style="{{st_link}}">{{affiliate_url}}</a></p><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="{{st_btn_tbl}}"><tr><td bgcolor="#2F6BFF" style="{{st_btn_td}}"><a href="{{affiliate_url}}" style="{{st_btn_a}}">Open my link</a></td></tr></table><p style="{{st_p}}"><strong>What you earn</strong></p><ul style="margin:0 0 16px;padding-left:22px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#0B1220;"><li style="margin:0 0 8px;"><strong>{{rate_hosting}}% of monthly hosting</strong> for every customer you send.</li><li style="margin:0 0 8px;"><strong>{{rate_design}}% of the upfront design cost</strong> they pay.</li></ul><p style="{{st_p}}"><strong>How credit works</strong></p><p style="{{st_p}}">When someone opens your link we remember it on their device for {{cookie_days}} days. If they ask for a demo in that time, they're yours. If they open someone else's link later, the most recent link gets the credit.</p><p style="{{st_p}}"><strong>Not sure what to say? Copy this:</strong></p><p style="{{st_box}}">If your business needs a new website, Ryzon Automation will design a free demo of it before you pay anything. Take a look: {{affiliate_url}}</p><p style="{{st_small}}">Your code is {{code}}. Questions or payout details? Just reply to this email.</p>$t$,
$t$Hi {{first_name}},

You're approved. Here is your personal link. Anyone who opens it and then becomes a customer is credited to you.

Your link: {{affiliate_url}}

What you earn
- {{rate_hosting}}% of monthly hosting for every customer you send.
- {{rate_design}}% of the upfront design cost they pay.

How credit works
When someone opens your link we remember it on their device for {{cookie_days}} days. If they ask for a demo in that time, they're yours. If they open someone else's link later, the most recent link gets the credit.

Not sure what to say? Copy this:
"If your business needs a new website, Ryzon Automation will design a free demo of it before you pay anything. Take a look: {{affiliate_url}}"

Your code is {{code}}. Questions or payout details? Just reply to this email.

Talk soon,
{{owner_name}}
Ryzon Automation · {{owner_phone}}

{{business_address}}$t$
)
on conflict (key) do update set recipient = excluded.recipient, subject = excluded.subject, preheader = excluded.preheader,
  description = excluded.description, html = excluded.html, text_body = excluded.text_body, updated_at = now();
