-- Referral program: people the owner adds in the dashboard get a personal link
-- (/r/<code>) and an email explaining how to use it. Leads from the link carry
-- utm_source=referral, utm_medium=referrer, utm_campaign=<code>.

create table if not exists public.ryzon_landing_referrers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(code) between 3 and 40),
  name text not null,
  email text not null check (position('@' in email) > 1),
  phone text,
  business_name text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.ryzon_landing_referrers is 'Ryzon landing: people who refer business owners. Their link is /r/<code>; leads are matched by utm_campaign = code.';

drop trigger if exists ryzon_landing_referrers_touch on public.ryzon_landing_referrers;
create trigger ryzon_landing_referrers_touch before update on public.ryzon_landing_referrers
  for each row execute function public.ryzon_landing_touch();

alter table public.ryzon_landing_referrers enable row level security;
drop policy if exists "Admins read referrers" on public.ryzon_landing_referrers;
create policy "Admins read referrers" on public.ryzon_landing_referrers
  for select to authenticated using (public.ryzon_landing_is_admin());
revoke all on public.ryzon_landing_referrers from anon, authenticated;
grant select on public.ryzon_landing_referrers to authenticated;

-- Referral leads are looked up by code.
create index if not exists ryzon_landing_submissions_referral_idx on public.ryzon_landing_submissions (utm_campaign) where utm_source = 'referral';

-- ---------------------------------------------------------------- email queue: rows for a referrer
alter table public.ryzon_landing_email_queue alter column submission_id drop not null;
alter table public.ryzon_landing_email_queue add column if not exists referrer_id uuid references public.ryzon_landing_referrers (id) on delete cascade;
alter table public.ryzon_landing_email_queue drop constraint if exists ryzon_landing_email_queue_one_recipient;
alter table public.ryzon_landing_email_queue add constraint ryzon_landing_email_queue_one_recipient check (num_nonnulls(submission_id, referrer_id) = 1);
create index if not exists ryzon_landing_email_queue_ref_idx on public.ryzon_landing_email_queue (referrer_id, created_at) where referrer_id is not null;

alter table public.ryzon_landing_email_templates drop constraint if exists ryzon_landing_email_templates_recipient_check;
alter table public.ryzon_landing_email_templates add constraint ryzon_landing_email_templates_recipient_check check (recipient in ('customer', 'admin', 'referrer'));

-- ---------------------------------------------------------------- functions
create or replace function public.ryzon_landing_new_referral_code(p_name text) returns text
language plpgsql volatile security definer set search_path = '' as $fn$
declare
  v_base text := left(regexp_replace(lower(split_part(trim(coalesce(p_name, '')), ' ', 1)), '[^a-z0-9]', '', 'g'), 16);
  v_chars text := 'abcdefghjkmnpqrstuvwxyz23456789';
  v_code text;
begin
  if length(v_base) < 2 then v_base := 'friend'; end if;
  loop
    v_code := v_base || '-' || (select string_agg(substr(v_chars, 1 + floor(random() * length(v_chars))::int, 1), '') from generate_series(1, 4));
    exit when not exists (select 1 from public.ryzon_landing_referrers where code = v_code);
  end loop;
  return v_code;
end $fn$;

-- Public: the referral page shows who sent the visitor. First name and business only.
create or replace function public.ryzon_landing_referrer_public(p_code text) returns jsonb
language sql stable security definer set search_path = '' as $fn$
  select jsonb_build_object('code', r.code, 'first_name', public.ryzon_landing_first_name(r.name), 'business_name', coalesce(r.business_name, ''))
    from public.ryzon_landing_referrers r
   where r.code = lower(trim(p_code)) and r.is_active;
$fn$;

create or replace function public.ryzon_landing_admin_send_referral_link(p_id uuid) returns bigint
language plpgsql security definer set search_path = '' as $fn$
declare v_id bigint;
begin
  perform public.ryzon_landing_require_admin();
  if not exists (select 1 from public.ryzon_landing_referrers where id = p_id and is_active) then
    raise exception 'Referrer not found or turned off';
  end if;
  insert into public.ryzon_landing_email_queue (referrer_id, template_key, send_at)
  values (p_id, 'referral_link', now()) returning id into v_id;
  perform public.ryzon_landing_kick();
  return v_id;
end $fn$;

create or replace function public.ryzon_landing_admin_add_referrer(
  p_name text, p_email text, p_phone text default null, p_business text default null,
  p_notes text default null, p_code text default null, p_send boolean default true
) returns jsonb
language plpgsql security definer set search_path = '' as $fn$
declare r public.ryzon_landing_referrers; v_code text := nullif(lower(trim(coalesce(p_code, ''))), '');
begin
  perform public.ryzon_landing_require_admin();
  if nullif(trim(coalesce(p_name, '')), '') is null then raise exception 'Add their name'; end if;
  if trim(coalesce(p_email, '')) !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'That email doesn''t look right'; end if;
  if v_code is not null and v_code !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then raise exception 'Links can use letters, numbers and dashes only'; end if;
  if v_code is not null and exists (select 1 from public.ryzon_landing_referrers where code = v_code) then raise exception 'That link is already taken'; end if;
  insert into public.ryzon_landing_referrers (code, name, email, phone, business_name, notes)
  values (coalesce(v_code, public.ryzon_landing_new_referral_code(p_name)), trim(p_name), lower(trim(p_email)),
          nullif(trim(coalesce(p_phone, '')), ''), nullif(trim(coalesce(p_business, '')), ''), nullif(trim(coalesce(p_notes, '')), ''))
  returning * into r;
  if p_send then perform public.ryzon_landing_admin_send_referral_link(r.id); end if;
  return jsonb_build_object('id', r.id, 'code', r.code);
end $fn$;

create or replace function public.ryzon_landing_admin_update_referrer(
  p_id uuid, p_name text, p_email text, p_phone text, p_business text, p_notes text, p_active boolean
) returns void
language plpgsql security definer set search_path = '' as $fn$
begin
  perform public.ryzon_landing_require_admin();
  if nullif(trim(coalesce(p_name, '')), '') is null then raise exception 'Add their name'; end if;
  if trim(coalesce(p_email, '')) !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'That email doesn''t look right'; end if;
  update public.ryzon_landing_referrers
     set name = trim(p_name), email = lower(trim(p_email)), phone = nullif(trim(coalesce(p_phone, '')), ''),
         business_name = nullif(trim(coalesce(p_business, '')), ''), notes = nullif(trim(coalesce(p_notes, '')), ''), is_active = p_active
   where id = p_id;
  if not found then raise exception 'Referrer not found'; end if;
end $fn$;

create or replace function public.ryzon_landing_referrer_vars(r public.ryzon_landing_referrers) returns jsonb
language sql stable security definer set search_path = '' as $fn$
  select jsonb_build_object(
    'first_name', public.ryzon_landing_first_name(r.name),
    'name', r.name,
    'email', r.email,
    'code', r.code,
    'referral_url', rtrim(coalesce(public.ryzon_landing_cfg('site_url'), ''), '/') || '/r/' || r.code,
    'site_url', rtrim(coalesce(public.ryzon_landing_cfg('site_url'), ''), '/'),
    'business_address', coalesce(public.ryzon_landing_cfg('business_address'), ''),
    'owner_name', coalesce(public.ryzon_landing_cfg('owner_name'), 'Ryzon Automation'),
    'owner_phone', coalesce(public.ryzon_landing_cfg('owner_phone'), '')
  );
$fn$;

create or replace function public.ryzon_landing_has_due() returns boolean
language sql stable security definer set search_path = '' as $fn$
  select exists (
    select 1 from public.ryzon_landing_email_queue q
      join public.ryzon_landing_email_templates t on t.key = q.template_key
      left join public.ryzon_landing_submissions s on s.id = q.submission_id
     where q.state = 'pending' and q.send_at <= now()
       and not (t.recipient = 'customer' and coalesce(s.automations_paused, false))
  ) or exists (
    select 1 from public.ryzon_landing_email_queue
     where state = 'sending' and updated_at < now() - interval '30 minutes'
  );
$fn$;

create or replace function public.ryzon_landing_admin_resend(p_queue_id bigint) returns bigint
language plpgsql security definer set search_path = '' as $fn$
declare q public.ryzon_landing_email_queue; v_id bigint;
begin
  perform public.ryzon_landing_require_admin();
  select * into q from public.ryzon_landing_email_queue where id = p_queue_id;
  if not found then raise exception 'not found'; end if;
  insert into public.ryzon_landing_email_queue (submission_id, referrer_id, template_key, send_at, vars, change_request_id)
  values (q.submission_id, q.referrer_id, q.template_key, now(), q.vars, q.change_request_id) returning id into v_id;
  perform public.ryzon_landing_kick();
  return v_id;
end $fn$;

create or replace function public.ryzon_landing_claim_due(p_limit integer default 25)
returns table(queue_id bigint, template_key text, to_email text, reply_to text, from_name text, subject text, html text, text_body text)
language plpgsql security definer set search_path = '' as $fn$
declare
  q public.ryzon_landing_email_queue;
  s public.ryzon_landing_submissions;
  t public.ryzon_landing_email_templates;
  r public.ryzon_landing_referrers;
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

revoke all on function public.ryzon_landing_new_referral_code(text) from public, anon, authenticated;
revoke all on function public.ryzon_landing_referrer_vars(public.ryzon_landing_referrers) from public, anon, authenticated;
revoke all on function public.ryzon_landing_referrer_public(text) from public;
grant execute on function public.ryzon_landing_referrer_public(text) to anon, authenticated;
revoke all on function public.ryzon_landing_admin_add_referrer(text, text, text, text, text, text, boolean) from public, anon;
revoke all on function public.ryzon_landing_admin_update_referrer(uuid, text, text, text, text, text, boolean) from public, anon;
revoke all on function public.ryzon_landing_admin_send_referral_link(uuid) from public, anon;
grant execute on function public.ryzon_landing_admin_add_referrer(text, text, text, text, text, text, boolean) to authenticated;
grant execute on function public.ryzon_landing_admin_update_referrer(uuid, text, text, text, text, text, boolean) to authenticated;
grant execute on function public.ryzon_landing_admin_send_referral_link(uuid) to authenticated;

-- ---------------------------------------------------------------- the email
insert into public.ryzon_landing_email_templates (key, recipient, is_promotional, subject, preheader, description, html, text_body)
values (
'referral_link', 'referrer', false,
'Your Ryzon referral link, {{first_name}}',
'Share it with business owners. You get a $50 credit for every one who signs up.',
'Sent to a referrer when they are added in the dashboard (or when you press Send link).',
$t$<h1 style="{{st_h1}}">Your referral link is ready</h1><p style="{{st_p}}">Hi {{first_name}},</p><p style="{{st_p}}">Thanks for helping us find business owners who need a better website. Here is your personal link. Anyone who asks for a free demo through it is automatically counted as yours.</p><p style="{{st_box}}"><a href="{{referral_url}}" style="{{st_link}}">{{referral_url}}</a></p><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="{{st_btn_tbl}}"><tr><td bgcolor="#2F6BFF" style="{{st_btn_td}}"><a href="{{referral_url}}" style="{{st_btn_a}}">See my referral page</a></td></tr></table><p style="{{st_p}}"><strong>How it works</strong></p><ol style="margin:0 0 16px;padding-left:22px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#0B1220;"><li style="margin:0 0 8px;"><strong>Share your link</strong> with business owners who need a new website or don't have one yet. Text it, email it, or post it.</li><li style="margin:0 0 8px;"><strong>They get a free demo.</strong> We design a preview of their new site before they pay anything. No credit card, no pressure.</li><li style="margin:0 0 8px;"><strong>You get a $50 credit</strong> toward any new service from us for every person who signs up.</li></ol><p style="{{st_p}}"><strong>Not sure what to say? Copy this:</strong></p><p style="{{st_box}}">Hey, thought of you. Ryzon Automation builds websites for local businesses, and they'll design a free demo of your new site before you pay anything. Take a look: {{referral_url}}</p><p style="{{st_small}}">Your link only counts for people who use it, so make sure they open it from your message.</p>$t$,
$t$Hi {{first_name}},

Thanks for helping us find business owners who need a better website. Here is your personal link. Anyone who asks for a free demo through it is automatically counted as yours.

Your link: {{referral_url}}

How it works
1. Share your link with business owners who need a new website or don't have one yet. Text it, email it, or post it.
2. They get a free demo. We design a preview of their new site before they pay anything. No credit card, no pressure.
3. You get a $50 credit toward any new service from us for every person who signs up.

Not sure what to say? Copy this:
"Hey, thought of you. Ryzon Automation builds websites for local businesses, and they'll design a free demo of your new site before you pay anything. Take a look: {{referral_url}}"

Talk soon,
{{owner_name}}
Ryzon Automation · {{owner_phone}}

{{business_address}}$t$
) on conflict (key) do update set recipient = excluded.recipient, subject = excluded.subject, preheader = excluded.preheader,
  description = excluded.description, html = excluded.html, text_body = excluded.text_body, updated_at = now();
