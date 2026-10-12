-- Ryzon landing: client pipeline + email automation (schema, security, state machine).
-- Only new objects prefixed ryzon_landing_. Existing tables are not touched.

-- ---------------------------------------------------------------- tables
create table public.ryzon_landing_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
comment on table public.ryzon_landing_config is 'Ryzon landing private settings (edge token, site URL, admin email, address). Service role only.';

create table public.ryzon_landing_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default now()
);
comment on table public.ryzon_landing_admins is 'Ryzon landing dashboard admins. Only these Supabase Auth users can read or act on pipeline data.';

create table public.ryzon_landing_submissions (
  id uuid primary key default gen_random_uuid(),
  public_token text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  form_type text not null check (form_type in ('demo', 'contact')),
  name text not null,
  email text not null,
  phone text,
  business_name text,
  industry text,
  current_site text,
  goals text,
  style text,
  message text,
  form_answers jsonb not null default '{}'::jsonb,
  timezone text not null default 'America/Detroit',
  status text not null check (status in (
    'contact', 'demo_in_progress', 'demo_review',
    'converted_full', 'converted_50_month', 'converted_50_year',
    'design_files', 'files_delivered', 'closed_no_response',
    'changes_received', 'call_scheduled', 'in_build', 'ready_to_launch', 'live'
  )),
  demo_url text,
  demo_image_url text,
  demo_uploaded_at timestamptz,
  plan text check (plan in ('starter', 'growth', 'complete', 'files99')),
  billing_interval text check (billing_interval in ('month', 'year', 'once')),
  offer text check (offer in ('standard', 'host50-month', 'host50-year', 'files99')),
  paid_at timestamptz,
  files_path text,
  files_url text,
  files_url_expires_at timestamptz,
  live_url text,
  source_page text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  automations_paused boolean not null default false,
  unsubscribed_at timestamptz,
  webhook_synced boolean not null default false,
  admin_notes text,
  last_status_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.ryzon_landing_submissions is 'Ryzon landing: one row per website request (free demo) or contact message. public_token is the only identifier used in links.';
create index ryzon_landing_submissions_email_idx on public.ryzon_landing_submissions (lower(email), created_at desc);
create index ryzon_landing_submissions_status_idx on public.ryzon_landing_submissions (status, last_status_at);

create table public.ryzon_landing_status_history (
  id bigint generated always as identity primary key,
  submission_id uuid not null references public.ryzon_landing_submissions (id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by text not null check (changed_by in ('admin', 'n8n', 'stripe', 'form', 'system')),
  note text,
  created_at timestamptz not null default now()
);
comment on table public.ryzon_landing_status_history is 'Ryzon landing: every status change, who made it and why.';
create index ryzon_landing_status_history_sub_idx on public.ryzon_landing_status_history (submission_id, created_at);

create table public.ryzon_landing_change_requests (
  id bigint generated always as identity primary key,
  submission_id uuid not null references public.ryzon_landing_submissions (id) on delete cascade,
  kind text not null check (kind in ('form', 'call')),
  details text,
  attachments jsonb not null default '[]'::jsonb,
  call_time timestamptz,
  call_method text check (call_method in ('meet', 'phone')),
  call_purpose text check (call_purpose in ('changes', 'launch', 'question')),
  call_phone text,
  call_status text check (call_status in ('scheduled', 'done', 'cancelled')),
  created_at timestamptz not null default now(),
  check (kind = 'form' or (call_time is not null and call_method is not null and call_status is not null))
);
comment on table public.ryzon_landing_change_requests is 'Ryzon landing: change forms and booked calls (own calendar, Google Meet or phone).';
-- One booking per slot.
create unique index ryzon_landing_calls_slot_uidx on public.ryzon_landing_change_requests (call_time)
  where kind = 'call' and call_status = 'scheduled';

create table public.ryzon_landing_email_templates (
  key text primary key,
  recipient text not null check (recipient in ('customer', 'admin')),
  is_promotional boolean not null default false,
  subject text not null,
  preheader text not null default '',
  html text not null,
  text_body text not null,
  description text,
  updated_at timestamptz not null default now()
);
comment on table public.ryzon_landing_email_templates is 'Ryzon landing: every email, stored once as HTML + plain text with {{placeholders}}.';

create table public.ryzon_landing_email_queue (
  id bigint generated always as identity primary key,
  submission_id uuid not null references public.ryzon_landing_submissions (id) on delete cascade,
  template_key text not null references public.ryzon_landing_email_templates (key),
  send_at timestamptz not null,
  state text not null default 'pending' check (state in ('pending', 'sending', 'sent', 'cancelled', 'failed')),
  -- Send only while the submission is in one of these statuses (null = always). This is how a
  -- payment or status change cancels emails that no longer fit.
  requires_status text[],
  change_request_id bigint references public.ryzon_landing_change_requests (id) on delete cascade,
  vars jsonb not null default '{}'::jsonb,
  attempts int not null default 0,
  last_error text,
  cancel_reason text,
  provider_message_id text,
  sent_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.ryzon_landing_email_queue is 'Ryzon landing: every scheduled or sent email. The n8n scheduler sends due rows; payments and status changes cancel pending ones.';
create index ryzon_landing_email_queue_due_idx on public.ryzon_landing_email_queue (send_at) where state = 'pending';
create index ryzon_landing_email_queue_sub_idx on public.ryzon_landing_email_queue (submission_id, created_at);

create table public.ryzon_landing_payments (
  id bigint generated always as identity primary key,
  submission_id uuid not null references public.ryzon_landing_submissions (id) on delete cascade,
  stripe_session_id text not null unique,
  stripe_customer_id text,
  stripe_subscription_id text,
  product text not null check (product in ('starter', 'growth', 'complete', 'files99')),
  billing_interval text check (billing_interval in ('month', 'year', 'once')),
  offer_code text not null check (offer_code in ('standard', 'host50-month', 'host50-year', 'files99')),
  amount_total int,
  currency text,
  created_at timestamptz not null default now()
);
comment on table public.ryzon_landing_payments is 'Ryzon landing: completed Stripe checkouts, attributed by the submission token in session metadata.';

-- ---------------------------------------------------------------- helpers
create or replace function public.ryzon_landing_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger ryzon_landing_submissions_touch before update on public.ryzon_landing_submissions
  for each row execute function public.ryzon_landing_touch();
create trigger ryzon_landing_email_queue_touch before update on public.ryzon_landing_email_queue
  for each row execute function public.ryzon_landing_touch();

create or replace function public.ryzon_landing_is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.ryzon_landing_admins a where a.user_id = auth.uid());
$$;

create or replace function public.ryzon_landing_cfg(p_key text) returns text
language sql stable security definer set search_path = '' as $$
  select value from public.ryzon_landing_config where key = p_key;
$$;

create or replace function public.ryzon_landing_tz(p_tz text) returns text
language sql stable set search_path = '' as $$
  select case when exists (select 1 from pg_catalog.pg_timezone_names where name = p_tz) then p_tz else 'America/Detroit' end;
$$;

-- 10:00 AM in the customer's timezone, p_days after p_base. Weekends move to Monday.
create or replace function public.ryzon_landing_local_10am(p_base timestamptz, p_days int, p_tz text) returns timestamptz
language plpgsql stable set search_path = '' as $$
declare
  v_tz text := public.ryzon_landing_tz(p_tz);
  v_date date := (p_base at time zone v_tz)::date + p_days;
  v_dow int := extract(isodow from v_date);
begin
  if v_dow = 6 then v_date := v_date + 2; elsif v_dow = 7 then v_date := v_date + 1; end if;
  return (v_date + time '10:00') at time zone v_tz;
end $$;

create or replace function public.ryzon_landing_first_name(p_name text) returns text
language sql immutable set search_path = '' as $$
  select coalesce(nullif(split_part(btrim(coalesce(p_name, '')), ' ', 1), ''), 'there');
$$;

-- Queue an email unless an identical one is already pending.
create or replace function public.ryzon_landing_enqueue(
  p_submission uuid, p_template text, p_send_at timestamptz,
  p_requires text[] default null, p_vars jsonb default '{}'::jsonb, p_change_request bigint default null
) returns bigint
language plpgsql security definer set search_path = '' as $$
declare v_id bigint;
begin
  select id into v_id from public.ryzon_landing_email_queue
   where submission_id = p_submission and template_key = p_template and state = 'pending'
     and change_request_id is not distinct from p_change_request;
  if v_id is not null then return v_id; end if;
  insert into public.ryzon_landing_email_queue (submission_id, template_key, send_at, requires_status, vars, change_request_id)
  values (p_submission, p_template, greatest(p_send_at, now()), p_requires, coalesce(p_vars, '{}'::jsonb), p_change_request)
  returning id into v_id;
  return v_id;
end $$;

-- The one place a status changes. Logs history, cancels emails that no longer fit,
-- and queues the emails a status starts.
create or replace function public.ryzon_landing_set_status(
  p_submission uuid, p_status text, p_by text, p_note text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare v_from text;
begin
  select status into v_from from public.ryzon_landing_submissions where id = p_submission for update;
  if not found then raise exception 'submission not found'; end if;
  if v_from = p_status then
    if p_note is not null then
      insert into public.ryzon_landing_status_history (submission_id, from_status, to_status, changed_by, note)
      values (p_submission, v_from, p_status, p_by, p_note);
    end if;
    return;
  end if;

  update public.ryzon_landing_submissions set status = p_status, last_status_at = now() where id = p_submission;
  insert into public.ryzon_landing_status_history (submission_id, from_status, to_status, changed_by, note)
  values (p_submission, v_from, p_status, p_by, p_note);

  update public.ryzon_landing_email_queue
     set state = 'cancelled', cancel_reason = 'status changed to ' || p_status
   where submission_id = p_submission and state = 'pending'
     and requires_status is not null and not (p_status = any (requires_status));

  if p_status = 'ready_to_launch' then
    perform public.ryzon_landing_enqueue(p_submission, 'prelaunch_call', now(), array['ready_to_launch'], jsonb_build_object('purpose', 'launch'));
  elsif p_status = 'live' then
    perform public.ryzon_landing_enqueue(p_submission, 'site_live', now());
  end if;
end $$;

-- ---------------------------------------------------------------- public actions (service role, via edge function)
create or replace function public.ryzon_landing_submit(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_type text := coalesce(p->>'form_type', 'demo');
  v_email text := lower(btrim(coalesce(p->>'email', '')));
  v_name text := btrim(coalesce(p->>'name', ''));
  v_existing public.ryzon_landing_submissions;
  v_id uuid;
  v_token text;
begin
  if v_type not in ('demo', 'contact') then raise exception 'invalid form_type'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' or v_name = '' then raise exception 'name and valid email required'; end if;

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
        form_answers = form_answers || coalesce(p->'form_answers', '{}'::jsonb)
      where id = v_existing.id;
      insert into public.ryzon_landing_status_history (submission_id, from_status, to_status, changed_by, note)
      values (v_existing.id, v_existing.status, v_existing.status, 'form', 'Submitted the form again within 7 days; details updated');
      return jsonb_build_object('id', v_existing.id, 'token', v_existing.public_token, 'duplicate', true);
    end if;
  end if;

  insert into public.ryzon_landing_submissions (
    form_type, name, email, phone, business_name, industry, current_site, goals, style, message,
    form_answers, timezone, status, source_page, referrer, utm_source, utm_medium, utm_campaign, utm_term, utm_content
  ) values (
    v_type, v_name, v_email, nullif(p->>'phone', ''), nullif(p->>'business_name', ''), nullif(p->>'industry', ''),
    nullif(p->>'current_site', ''), nullif(p->>'goals', ''), nullif(p->>'style', ''), nullif(p->>'message', ''),
    coalesce(p->'form_answers', '{}'::jsonb), public.ryzon_landing_tz(p->>'timezone'),
    case when v_type = 'demo' then 'demo_in_progress' else 'contact' end,
    nullif(p->>'source_page', ''), nullif(p->>'referrer', ''), nullif(p->>'utm_source', ''), nullif(p->>'utm_medium', ''),
    nullif(p->>'utm_campaign', ''), nullif(p->>'utm_term', ''), nullif(p->>'utm_content', '')
  ) returning id, public_token into v_id, v_token;

  insert into public.ryzon_landing_status_history (submission_id, from_status, to_status, changed_by, note)
  values (v_id, null, case when v_type = 'demo' then 'demo_in_progress' else 'contact' end, 'form', 'Form submitted');

  if v_type = 'demo' then
    perform public.ryzon_landing_enqueue(v_id, 'request_received', now());
    perform public.ryzon_landing_enqueue(v_id, 'new_request_alert', now());
  else
    perform public.ryzon_landing_enqueue(v_id, 'contact_alert', now());
  end if;
  return jsonb_build_object('id', v_id, 'token', v_token, 'duplicate', false);
end $$;

-- Offer windows, counted from the demo upload in the customer's timezone.
-- standard: always while in review. host50-month: day 5 -> 10. host50-year: day 10 -> 15. files99: day 15 -> 21.
create or replace function public.ryzon_landing_offer_window(p_sub public.ryzon_landing_submissions, p_offer text)
returns table (starts_at timestamptz, ends_at timestamptz)
language sql stable set search_path = '' as $$
  select
    case p_offer
      when 'standard' then p_sub.demo_uploaded_at
      when 'host50-month' then public.ryzon_landing_local_10am(p_sub.demo_uploaded_at, 5, p_sub.timezone)
      when 'host50-year' then public.ryzon_landing_local_10am(p_sub.demo_uploaded_at, 10, p_sub.timezone)
      when 'files99' then public.ryzon_landing_local_10am(p_sub.demo_uploaded_at, 15, p_sub.timezone)
    end,
    case p_offer
      when 'standard' then p_sub.demo_uploaded_at + interval '21 days'
      when 'host50-month' then public.ryzon_landing_local_10am(p_sub.demo_uploaded_at, 10, p_sub.timezone)
      when 'host50-year' then public.ryzon_landing_local_10am(p_sub.demo_uploaded_at, 15, p_sub.timezone)
      when 'files99' then p_sub.demo_uploaded_at + interval '21 days'
    end;
$$;

create or replace function public.ryzon_landing_lookup(p_token text, p_offer text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  s public.ryzon_landing_submissions;
  w record;
  v_active boolean := null;
  v_reason text := null;
begin
  select * into s from public.ryzon_landing_submissions where public_token = p_token;
  if not found then return jsonb_build_object('found', false); end if;

  if p_offer is not null then
    if p_offer not in ('standard', 'host50-month', 'host50-year', 'files99') then
      v_active := false; v_reason := 'unknown_offer';
    elsif s.paid_at is not null then
      v_active := false; v_reason := 'already_paid';
    elsif s.status <> 'demo_review' or s.demo_uploaded_at is null then
      v_active := false; v_reason := 'not_available';
    else
      select * into w from public.ryzon_landing_offer_window(s, p_offer);
      if now() < w.starts_at then v_active := false; v_reason := 'not_started';
      elsif now() >= w.ends_at then v_active := false; v_reason := 'expired';
      else v_active := true; end if;
    end if;
  end if;

  return jsonb_build_object(
    'found', true,
    'id', s.id,
    'first_name', public.ryzon_landing_first_name(s.name),
    'name', s.name,
    'email', s.email,
    'phone', s.phone,
    'business_name', coalesce(s.business_name, s.name),
    'status', s.status,
    'demo_url', s.demo_url,
    'demo_image_url', s.demo_image_url,
    'plan', s.plan,
    'offer', s.offer,
    'paid', s.paid_at is not null,
    'files_url', case when s.files_url_expires_at > now() then s.files_url end,
    'timezone', s.timezone,
    'offer_active', v_active,
    'offer_reason', v_reason,
    'offer_ends_at', case when v_active then (select ends_at from public.ryzon_landing_offer_window(s, p_offer)) end
  );
end $$;

create or replace function public.ryzon_landing_record_payment(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  s public.ryzon_landing_submissions;
  v_offer text := p->>'offer_code';
  v_product text := p->>'product';
  v_status text;
  v_payment bigint;
begin
  select * into s from public.ryzon_landing_submissions
   where id = (p->>'submission_id')::uuid and public_token = p->>'token' for update;
  if not found then raise exception 'submission not found or token mismatch'; end if;

  insert into public.ryzon_landing_payments (submission_id, stripe_session_id, stripe_customer_id, stripe_subscription_id,
    product, billing_interval, offer_code, amount_total, currency)
  values (s.id, p->>'stripe_session_id', nullif(p->>'stripe_customer_id', ''), nullif(p->>'stripe_subscription_id', ''),
    v_product, nullif(p->>'billing_interval', ''), v_offer, nullif(p->>'amount_total', '')::int, nullif(p->>'currency', ''))
  on conflict (stripe_session_id) do nothing
  returning id into v_payment;
  if v_payment is null then return jsonb_build_object('duplicate', true, 'id', s.id); end if;

  v_status := case v_offer
    when 'standard' then 'converted_full'
    when 'host50-month' then 'converted_50_month'
    when 'host50-year' then 'converted_50_year'
    when 'files99' then 'design_files'
  end;

  update public.ryzon_landing_submissions
     set plan = v_product, billing_interval = nullif(p->>'billing_interval', ''), offer = v_offer, paid_at = coalesce(paid_at, now())
   where id = s.id;
  perform public.ryzon_landing_set_status(s.id, v_status, 'stripe', 'Paid: ' || v_product || ' (' || v_offer || ')');

  -- Belt and braces: no sales email survives a payment.
  update public.ryzon_landing_email_queue set state = 'cancelled', cancel_reason = 'paid'
   where submission_id = s.id and state = 'pending'
     and template_key in ('reminder_1', 'reminder_2', 'offer_1', 'offer_2', 'offer_3');

  perform public.ryzon_landing_enqueue(s.id, 'payment_alert', now());
  if v_offer = 'files99' then
    perform public.ryzon_landing_enqueue(s.id, 'files_preparing', now());
  else
    perform public.ryzon_landing_enqueue(s.id, 'payment_confirmed', now());
    perform public.ryzon_landing_enqueue(s.id, 'changes_reminder_1', public.ryzon_landing_local_10am(now(), 1, s.timezone),
      array['converted_full', 'converted_50_month', 'converted_50_year']);
    perform public.ryzon_landing_enqueue(s.id, 'changes_reminder_2', public.ryzon_landing_local_10am(now(), 3, s.timezone),
      array['converted_full', 'converted_50_month', 'converted_50_year']);
  end if;
  return jsonb_build_object('duplicate', false, 'id', s.id, 'status', v_status);
end $$;

create or replace function public.ryzon_landing_submit_changes(p_token text, p_details text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.ryzon_landing_submissions; v_cr bigint;
begin
  select * into s from public.ryzon_landing_submissions where public_token = p_token for update;
  if not found then raise exception 'not found'; end if;
  if s.paid_at is null or s.offer = 'files99' then raise exception 'changes are for paid plans'; end if;
  if btrim(coalesce(p_details, '')) = '' then raise exception 'details required'; end if;

  insert into public.ryzon_landing_change_requests (submission_id, kind, details)
  values (s.id, 'form', left(p_details, 5000)) returning id into v_cr;
  if s.status in ('converted_full', 'converted_50_month', 'converted_50_year', 'call_scheduled') then
    perform public.ryzon_landing_set_status(s.id, 'changes_received', 'form', 'Change form submitted');
  end if;
  perform public.ryzon_landing_enqueue(s.id, 'changes_received', now(), null, '{}'::jsonb, v_cr);
  perform public.ryzon_landing_enqueue(s.id, 'changes_alert', now(), null, '{}'::jsonb, v_cr);
  return jsonb_build_object('ok', true);
end $$;

-- Own calendar: 30-minute slots, 9:00 AM to 10:00 PM Detroit time, 7 days a week,
-- at least 4 hours' notice, up to 21 days ahead.
create or replace function public.ryzon_landing_slots(p_days int default 14) returns setof timestamptz
language sql stable security definer set search_path = '' as $$
  with days as (
    select ((now() at time zone 'America/Detroit')::date + d) as day
    from generate_series(0, least(greatest(p_days, 1), 21)) d
  ), slots as (
    select ((day + time '09:00') + make_interval(mins => 30 * i)) at time zone 'America/Detroit' as t
    from days, generate_series(0, 25) i
  )
  select t from slots
  where t >= now() + interval '4 hours'
    and not exists (
      select 1 from public.ryzon_landing_change_requests c
      where c.kind = 'call' and c.call_status = 'scheduled' and c.call_time = slots.t
    )
  order by t;
$$;

create or replace function public.ryzon_landing_book_call(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  s public.ryzon_landing_submissions;
  v_time timestamptz := (p->>'call_time')::timestamptz;
  v_method text := p->>'call_method';
  v_purpose text := coalesce(nullif(p->>'call_purpose', ''), 'question');
  v_phone text := nullif(btrim(coalesce(p->>'phone', '')), '');
  v_cr bigint;
  v_local text;
  v_res jsonb;
begin
  if v_method not in ('meet', 'phone') then raise exception 'call_method must be meet or phone'; end if;
  if v_purpose not in ('changes', 'launch', 'question') then raise exception 'invalid purpose'; end if;
  if not exists (select 1 from public.ryzon_landing_slots(21) t where t = v_time) then
    raise exception 'slot_unavailable';
  end if;

  if nullif(p->>'token', '') is not null then
    select * into s from public.ryzon_landing_submissions where public_token = p->>'token' for update;
    if not found then raise exception 'not found'; end if;
  else
    -- Booking from the public page without a link: record it as a contact submission.
    v_res := public.ryzon_landing_submit(jsonb_build_object(
      'form_type', 'contact', 'name', p->>'name', 'email', p->>'email', 'phone', v_phone,
      'business_name', p->>'business_name', 'message', 'Booked a call: ' || coalesce(p->>'notes', ''),
      'timezone', p->>'timezone', 'source_page', p->>'source_page'));
    select * into s from public.ryzon_landing_submissions where id = (v_res->>'id')::uuid;
    -- The contact alert would duplicate the booking alert.
    update public.ryzon_landing_email_queue set state = 'cancelled', cancel_reason = 'covered by booking alert'
     where submission_id = s.id and template_key = 'contact_alert' and state = 'pending';
  end if;

  if v_method = 'phone' and coalesce(v_phone, s.phone) is null then raise exception 'phone required for a phone call'; end if;

  begin
    insert into public.ryzon_landing_change_requests (submission_id, kind, details, call_time, call_method, call_purpose, call_phone, call_status)
    values (s.id, 'call', left(nullif(p->>'notes', ''), 2000), v_time, v_method, v_purpose, coalesce(v_phone, s.phone), 'scheduled')
    returning id into v_cr;
  exception when unique_violation then
    raise exception 'slot_unavailable';
  end;

  if v_purpose = 'changes' and s.status in ('converted_full', 'converted_50_month', 'converted_50_year') then
    perform public.ryzon_landing_set_status(s.id, 'call_scheduled', 'form', 'Booked a changes call');
  end if;

  v_local := to_char(v_time at time zone s.timezone, 'FMDay, FMMonth FMDD "at" FMHH12:MI AM') || ' (' || s.timezone || ')';
  perform public.ryzon_landing_enqueue(s.id, 'booking_confirmed', now(), null,
    jsonb_build_object('call_time_local', v_local, 'call_method_label', case v_method when 'meet' then 'Google Meet' else 'Phone call' end), v_cr);
  perform public.ryzon_landing_enqueue(s.id, 'booking_alert', now(), null,
    jsonb_build_object('call_time_local', to_char(v_time at time zone 'America/Detroit', 'FMDay, FMMonth FMDD "at" FMHH12:MI AM') || ' Detroit time',
      'call_method_label', case v_method when 'meet' then 'Google Meet' else 'Phone call' end, 'call_purpose', v_purpose), v_cr);
  if v_time - interval '1 hour' > now() then
    perform public.ryzon_landing_enqueue(s.id, 'booking_reminder', v_time - interval '1 hour', null,
      jsonb_build_object('call_time_local', v_local, 'call_method_label', case v_method when 'meet' then 'Google Meet' else 'Phone call' end), v_cr);
    perform public.ryzon_landing_enqueue(s.id, 'booking_reminder_admin', v_time - interval '1 hour', null,
      jsonb_build_object('call_time_local', to_char(v_time at time zone 'America/Detroit', 'FMHH12:MI AM') || ' Detroit time',
        'call_method_label', case v_method when 'meet' then 'Google Meet' else 'Phone call' end, 'call_purpose', v_purpose), v_cr);
  end if;
  return jsonb_build_object('ok', true, 'call_id', v_cr);
end $$;

create or replace function public.ryzon_landing_unsubscribe(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_n int;
begin
  update public.ryzon_landing_submissions set unsubscribed_at = coalesce(unsubscribed_at, now())
   where public_token = p_token returning id into v_id;
  if v_id is null then return jsonb_build_object('found', false); end if;
  update public.ryzon_landing_email_queue q set state = 'cancelled', cancel_reason = 'unsubscribed'
    from public.ryzon_landing_email_templates t
   where q.template_key = t.key and t.is_promotional and q.submission_id = v_id and q.state = 'pending';
  get diagnostics v_n = row_count;
  insert into public.ryzon_landing_status_history (submission_id, from_status, to_status, changed_by, note)
  select id, status, status, 'form', 'Unsubscribed from sales emails (' || v_n || ' cancelled)'
    from public.ryzon_landing_submissions where id = v_id;
  return jsonb_build_object('found', true);
end $$;

-- ---------------------------------------------------------------- scheduler (service role, via n8n)
create or replace function public.ryzon_landing_close_stale() returns int
language plpgsql security definer set search_path = '' as $$
declare r record; v_n int := 0;
begin
  for r in select id from public.ryzon_landing_submissions
            where status = 'demo_review' and paid_at is null and demo_uploaded_at < now() - interval '21 days'
  loop
    perform public.ryzon_landing_set_status(r.id, 'closed_no_response', 'system', 'Day 21 with no payment');
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;

create or replace function public.ryzon_landing_render(p_template text, p_vars jsonb, p_html boolean) returns text
language plpgsql immutable set search_path = '' as $$
declare v_out text := coalesce(p_template, ''); r record; v_val text;
begin
  for r in select key, value from jsonb_each_text(coalesce(p_vars, '{}'::jsonb)) loop
    v_val := coalesce(r.value, '');
    if p_html and r.key not like '%\_html' then
      v_val := replace(replace(replace(replace(v_val, '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;');
    end if;
    v_out := replace(v_out, '{{' || r.key || '}}', v_val);
  end loop;
  -- Unknown placeholders render empty rather than leaking braces to customers.
  return regexp_replace(v_out, '\{\{[a-z0-9_]+\}\}', '', 'g');
end $$;

create or replace function public.ryzon_landing_email_vars(s public.ryzon_landing_submissions, q public.ryzon_landing_email_queue) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_base text := rtrim(coalesce(public.ryzon_landing_cfg('site_url'), ''), '/');
  v_offer text := coalesce(q.vars->>'offer', 'standard');
  v_end timestamptz;
  v_cr public.ryzon_landing_change_requests;
begin
  if q.vars ? 'offer' and s.demo_uploaded_at is not null then
    select ends_at into v_end from public.ryzon_landing_offer_window(s, v_offer);
  end if;
  if q.change_request_id is not null then
    select * into v_cr from public.ryzon_landing_change_requests where id = q.change_request_id;
  end if;
  return jsonb_build_object(
    'first_name', public.ryzon_landing_first_name(s.name),
    'name', s.name,
    'email', s.email,
    'phone', coalesce(s.phone, ''),
    'business_name', coalesce(s.business_name, s.name),
    'industry', coalesce(s.industry, ''),
    'style', coalesce(s.style, 'Not sure yet'),
    'current_site', coalesce(s.current_site, 'None yet'),
    'goals', coalesce(s.goals, s.message, ''),
    'message', coalesce(s.message, ''),
    'form_type', s.form_type,
    'status', s.status,
    'plan', coalesce(s.plan, ''),
    'offer_code', coalesce(s.offer, ''),
    'site_url', v_base,
    'demo_url', coalesce(s.demo_url, v_base),
    'go_live_url', v_base || '/go-live?t=' || s.public_token || '&offer=' || v_offer,
    'changes_url', v_base || '/changes?t=' || s.public_token,
    'book_url', v_base || '/book?t=' || s.public_token || '&purpose=' || coalesce(q.vars->>'purpose', 'changes'),
    'admin_url', v_base || '/admin/s/' || s.id,
    'unsubscribe_url', v_base || '/unsubscribe?t=' || s.public_token,
    'files_url', coalesce(s.files_url, ''),
    'live_url', coalesce(s.live_url, v_base),
    'offer_end', case when v_end is not null then to_char(v_end at time zone s.timezone, 'FMDay, FMMonth FMDD') else '' end,
    'business_address', coalesce(public.ryzon_landing_cfg('business_address'), ''),
    'owner_name', coalesce(public.ryzon_landing_cfg('owner_name'), 'Ryzon Automation'),
    'owner_phone', coalesce(public.ryzon_landing_cfg('owner_phone'), ''),
    'change_details', coalesce(v_cr.details, ''),
    'call_phone', coalesce(v_cr.call_phone, ''),
    'demo_image_html', case when s.demo_image_url is not null then
      '<a href="' || replace(coalesce(s.demo_url, v_base), '"', '%22') || '"><img src="' || replace(s.demo_image_url, '"', '%22')
      || '" width="520" alt="Preview of your new website" style="display:block;width:100%;max-width:520px;height:auto;border:1px solid #d5dce6;border-radius:8px;"></a>'
      else '' end
  ) || coalesce(q.vars, '{}'::jsonb);
end $$;

-- Claim due emails for sending. Re-checks pause, status, unsubscribe and booking state,
-- cancels what no longer fits, and returns fully rendered emails for the rest.
create or replace function public.ryzon_landing_claim_due(p_limit int default 25)
returns table (queue_id bigint, template_key text, to_email text, reply_to text, from_name text, subject text, html text, text_body text)
language plpgsql security definer set search_path = '' as $$
declare
  q public.ryzon_landing_email_queue;
  s public.ryzon_landing_submissions;
  t public.ryzon_landing_email_templates;
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
    select * into s from public.ryzon_landing_submissions where id = q.submission_id;
    select * into t from public.ryzon_landing_email_templates where key = q.template_key;

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

    v_vars := public.ryzon_landing_email_vars(s, q) || jsonb_build_object('preheader', t.preheader);
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
end $$;

create or replace function public.ryzon_landing_mark_sent(p_queue_id bigint, p_message_id text default null) returns void
language sql security definer set search_path = '' as $$
  update public.ryzon_landing_email_queue
     set state = 'sent', sent_at = now(), provider_message_id = p_message_id, last_error = null
   where id = p_queue_id;
  update public.ryzon_landing_submissions s set webhook_synced = true
    from public.ryzon_landing_email_queue q
   where q.id = p_queue_id and s.id = q.submission_id and q.template_key in ('request_received', 'contact_alert');
$$;

create or replace function public.ryzon_landing_mark_failed(p_queue_id bigint, p_error text) returns void
language sql security definer set search_path = '' as $$
  update public.ryzon_landing_email_queue
     set state = case when attempts >= 3 then 'failed' else 'pending' end,
         send_at = case when attempts >= 3 then send_at else now() + interval '10 minutes' end,
         last_error = left(p_error, 1000)
   where id = p_queue_id;
$$;

-- ---------------------------------------------------------------- admin actions (dashboard, signed-in admin)
create or replace function public.ryzon_landing_require_admin() returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.ryzon_landing_is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
end $$;

create or replace function public.ryzon_landing_admin_upload_demo(p_id uuid, p_demo_url text, p_demo_image_url text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare s public.ryzon_landing_submissions;
begin
  perform public.ryzon_landing_require_admin();
  if p_demo_url !~ '^https?://' then raise exception 'demo URL must start with http:// or https://'; end if;
  select * into s from public.ryzon_landing_submissions where id = p_id for update;
  if not found or s.form_type <> 'demo' then raise exception 'not a demo request'; end if;
  if s.status not in ('demo_in_progress', 'demo_review', 'closed_no_response') then raise exception 'demo already converted'; end if;

  -- A new upload restarts the review sequence from today.
  update public.ryzon_landing_email_queue set state = 'cancelled', cancel_reason = 'demo re-uploaded'
   where submission_id = p_id and state = 'pending'
     and template_key in ('demo_ready', 'reminder_1', 'reminder_2', 'offer_1', 'offer_2', 'offer_3');
  update public.ryzon_landing_submissions
     set demo_url = p_demo_url, demo_image_url = nullif(p_demo_image_url, ''), demo_uploaded_at = now()
   where id = p_id;
  perform public.ryzon_landing_set_status(p_id, 'demo_review', 'admin', 'Demo uploaded: ' || p_demo_url);

  perform public.ryzon_landing_enqueue(p_id, 'demo_ready', now(), array['demo_review'], '{"offer":"standard"}');
  perform public.ryzon_landing_enqueue(p_id, 'reminder_1', public.ryzon_landing_local_10am(now(), 1, s.timezone), array['demo_review'], '{"offer":"standard"}');
  perform public.ryzon_landing_enqueue(p_id, 'reminder_2', public.ryzon_landing_local_10am(now(), 3, s.timezone), array['demo_review'], '{"offer":"standard"}');
  perform public.ryzon_landing_enqueue(p_id, 'offer_1', public.ryzon_landing_local_10am(now(), 5, s.timezone), array['demo_review'], '{"offer":"host50-month"}');
  perform public.ryzon_landing_enqueue(p_id, 'offer_2', public.ryzon_landing_local_10am(now(), 10, s.timezone), array['demo_review'], '{"offer":"host50-year"}');
  perform public.ryzon_landing_enqueue(p_id, 'offer_3', public.ryzon_landing_local_10am(now(), 15, s.timezone), array['demo_review'], '{"offer":"files99"}');
end $$;

create or replace function public.ryzon_landing_admin_set_status(p_id uuid, p_status text, p_note text default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.ryzon_landing_require_admin();
  perform public.ryzon_landing_set_status(p_id, p_status, 'admin', nullif(p_note, ''));
end $$;

create or replace function public.ryzon_landing_admin_set_paused(p_id uuid, p_paused boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.ryzon_landing_require_admin();
  update public.ryzon_landing_submissions set automations_paused = p_paused where id = p_id;
  insert into public.ryzon_landing_status_history (submission_id, from_status, to_status, changed_by, note)
  select id, status, status, 'admin', case when p_paused then 'Automations paused' else 'Automations resumed' end
    from public.ryzon_landing_submissions where id = p_id;
end $$;

create or replace function public.ryzon_landing_admin_set_notes(p_id uuid, p_notes text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.ryzon_landing_require_admin();
  update public.ryzon_landing_submissions set admin_notes = p_notes where id = p_id;
end $$;

create or replace function public.ryzon_landing_admin_set_live_url(p_id uuid, p_url text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.ryzon_landing_require_admin();
  update public.ryzon_landing_submissions set live_url = nullif(p_url, '') where id = p_id;
end $$;

create or replace function public.ryzon_landing_admin_send_now(p_queue_id bigint) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.ryzon_landing_require_admin();
  update public.ryzon_landing_email_queue set send_at = now() where id = p_queue_id and state = 'pending';
end $$;

create or replace function public.ryzon_landing_admin_resend(p_queue_id bigint) returns bigint
language plpgsql security definer set search_path = '' as $$
declare q public.ryzon_landing_email_queue; v_id bigint;
begin
  perform public.ryzon_landing_require_admin();
  select * into q from public.ryzon_landing_email_queue where id = p_queue_id;
  if not found then raise exception 'not found'; end if;
  insert into public.ryzon_landing_email_queue (submission_id, template_key, send_at, vars, change_request_id)
  values (q.submission_id, q.template_key, now(), q.vars, q.change_request_id) returning id into v_id;
  return v_id;
end $$;

create or replace function public.ryzon_landing_admin_cancel_email(p_queue_id bigint) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.ryzon_landing_require_admin();
  update public.ryzon_landing_email_queue set state = 'cancelled', cancel_reason = 'cancelled by admin'
   where id = p_queue_id and state = 'pending';
end $$;

create or replace function public.ryzon_landing_admin_set_files(p_id uuid, p_path text, p_url text, p_expires timestamptz) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.ryzon_landing_require_admin();
  update public.ryzon_landing_submissions
     set files_path = p_path, files_url = p_url, files_url_expires_at = p_expires
   where id = p_id;
  perform public.ryzon_landing_set_status(p_id, 'files_delivered', 'admin', 'Design files uploaded');
  perform public.ryzon_landing_enqueue(p_id, 'files_delivered', now());
end $$;

create or replace function public.ryzon_landing_admin_set_call_status(p_call_id bigint, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.ryzon_landing_require_admin();
  if p_status not in ('scheduled', 'done', 'cancelled') then raise exception 'invalid call status'; end if;
  update public.ryzon_landing_change_requests set call_status = p_status where id = p_call_id and kind = 'call';
  if p_status = 'cancelled' then
    update public.ryzon_landing_email_queue set state = 'cancelled', cancel_reason = 'call cancelled'
     where change_request_id = p_call_id and state = 'pending';
  end if;
end $$;

-- ---------------------------------------------------------------- security
alter table public.ryzon_landing_config enable row level security;
alter table public.ryzon_landing_admins enable row level security;
alter table public.ryzon_landing_submissions enable row level security;
alter table public.ryzon_landing_status_history enable row level security;
alter table public.ryzon_landing_change_requests enable row level security;
alter table public.ryzon_landing_email_templates enable row level security;
alter table public.ryzon_landing_email_queue enable row level security;
alter table public.ryzon_landing_payments enable row level security;

-- Config: no policies at all (service role only).
create policy "admins read own row" on public.ryzon_landing_admins for select to authenticated using (user_id = (select auth.uid()));
create policy "admins read submissions" on public.ryzon_landing_submissions for select to authenticated using ((select public.ryzon_landing_is_admin()));
create policy "admins read history" on public.ryzon_landing_status_history for select to authenticated using ((select public.ryzon_landing_is_admin()));
create policy "admins read changes" on public.ryzon_landing_change_requests for select to authenticated using ((select public.ryzon_landing_is_admin()));
create policy "admins read templates" on public.ryzon_landing_email_templates for select to authenticated using ((select public.ryzon_landing_is_admin()));
create policy "admins read queue" on public.ryzon_landing_email_queue for select to authenticated using ((select public.ryzon_landing_is_admin()));
create policy "admins read payments" on public.ryzon_landing_payments for select to authenticated using ((select public.ryzon_landing_is_admin()));

-- Functions: nothing is callable by default; grant per role below.
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname like 'ryzon\_landing\_%'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;

grant execute on function public.ryzon_landing_is_admin() to authenticated;
grant execute on function public.ryzon_landing_admin_upload_demo(uuid, text, text) to authenticated;
grant execute on function public.ryzon_landing_admin_set_status(uuid, text, text) to authenticated;
grant execute on function public.ryzon_landing_admin_set_paused(uuid, boolean) to authenticated;
grant execute on function public.ryzon_landing_admin_set_notes(uuid, text) to authenticated;
grant execute on function public.ryzon_landing_admin_set_live_url(uuid, text) to authenticated;
grant execute on function public.ryzon_landing_admin_send_now(bigint) to authenticated;
grant execute on function public.ryzon_landing_admin_resend(bigint) to authenticated;
grant execute on function public.ryzon_landing_admin_cancel_email(bigint) to authenticated;
grant execute on function public.ryzon_landing_admin_set_files(uuid, text, text, timestamptz) to authenticated;
grant execute on function public.ryzon_landing_admin_set_call_status(bigint, text) to authenticated;

-- Private bucket for $99 design files. Admins upload and create signed links.
insert into storage.buckets (id, name, public, file_size_limit)
values ('ryzon-landing-files', 'ryzon-landing-files', false, 524288000)
on conflict (id) do nothing;

create policy "ryzon landing admins read files" on storage.objects for select to authenticated
  using (bucket_id = 'ryzon-landing-files' and (select public.ryzon_landing_is_admin()));
create policy "ryzon landing admins upload files" on storage.objects for insert to authenticated
  with check (bucket_id = 'ryzon-landing-files' and (select public.ryzon_landing_is_admin()));
create policy "ryzon landing admins update files" on storage.objects for update to authenticated
  using (bucket_id = 'ryzon-landing-files' and (select public.ryzon_landing_is_admin()));
create policy "ryzon landing admins delete files" on storage.objects for delete to authenticated
  using (bucket_id = 'ryzon-landing-files' and (select public.ryzon_landing_is_admin()));
