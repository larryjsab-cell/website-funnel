-- Review requests. The owner sends them from the dashboard, and every customer gets one the
-- moment they become a paying customer. The email links to /review?t=<token>:
--   4-5 stars -> buttons to post the review on Google (and other platforms set in the dashboard)
--   1-3 stars -> "what could we have done better?" and "would you like us to contact you?"
--                yes -> listed in the dashboard and the owner gets an alert email.

create table if not exists public.ryzon_landing_reviews (
  id uuid primary key default gen_random_uuid(),
  token text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  submission_id uuid references public.ryzon_landing_submissions (id) on delete set null,
  source text not null check (source in ('manual', 'converted')),
  name text,
  email text not null check (position('@' in email) > 1),
  status text not null default 'sent' check (status in ('sent', 'rated', 'feedback', 'resolved')),
  rating smallint check (rating between 1 and 5),
  feedback text,
  wants_contact boolean,
  platform_clicked text,
  platform_clicked_at timestamptz,
  rated_at timestamptz,
  feedback_at timestamptz,
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.ryzon_landing_reviews is 'Ryzon landing: review requests and answers. token is the only identifier used in links.';
create unique index if not exists ryzon_landing_reviews_converted_uidx on public.ryzon_landing_reviews (submission_id) where source = 'converted';
create index if not exists ryzon_landing_reviews_email_idx on public.ryzon_landing_reviews (lower(email), created_at desc);

drop trigger if exists ryzon_landing_reviews_touch on public.ryzon_landing_reviews;
create trigger ryzon_landing_reviews_touch before update on public.ryzon_landing_reviews
  for each row execute function public.ryzon_landing_touch();

alter table public.ryzon_landing_reviews enable row level security;
revoke all on public.ryzon_landing_reviews from anon, authenticated;
grant select on public.ryzon_landing_reviews to authenticated;
drop policy if exists "Admins read reviews" on public.ryzon_landing_reviews;
create policy "Admins read reviews" on public.ryzon_landing_reviews for select to authenticated using (public.ryzon_landing_is_admin());

-- Email queue: rows for a review (request to the customer, or an alert to the owner).
alter table public.ryzon_landing_email_queue add column if not exists review_id uuid references public.ryzon_landing_reviews (id) on delete cascade;
alter table public.ryzon_landing_email_queue drop constraint if exists ryzon_landing_email_queue_one_recipient;
alter table public.ryzon_landing_email_queue add constraint ryzon_landing_email_queue_one_recipient check (num_nonnulls(submission_id, referrer_id, review_id) = 1);
create index if not exists ryzon_landing_email_queue_review_idx on public.ryzon_landing_email_queue (review_id) where review_id is not null;

alter table public.ryzon_landing_email_templates drop constraint if exists ryzon_landing_email_templates_recipient_check;
alter table public.ryzon_landing_email_templates add constraint ryzon_landing_email_templates_recipient_check check (recipient in ('customer', 'admin', 'referrer', 'reviewer'));

-- ---------------------------------------------------------------- helpers
create or replace function public.ryzon_landing_review_links() returns jsonb
language sql stable security definer set search_path = '' as $fn$
  select jsonb_strip_nulls(jsonb_build_object(
    'google', nullif(public.ryzon_landing_cfg('review_link_google'), ''),
    'facebook', nullif(public.ryzon_landing_cfg('review_link_facebook'), ''),
    'yelp', nullif(public.ryzon_landing_cfg('review_link_yelp'), '')));
$fn$;

create or replace function public.ryzon_landing_review_vars(r public.ryzon_landing_reviews) returns jsonb
language plpgsql stable security definer set search_path = '' as $fn$
declare v_base text := rtrim(coalesce(public.ryzon_landing_cfg('site_url'), ''), '/'); v_url text;
begin
  v_url := v_base || '/review?t=' || r.token;
  return jsonb_build_object(
    'first_name', coalesce(nullif(public.ryzon_landing_first_name(r.name), ''), 'there'),
    'name', coalesce(r.name, r.email),
    'email', r.email,
    'review_url', v_url,
    'star_1_url', v_url || '&r=1', 'star_2_url', v_url || '&r=2', 'star_3_url', v_url || '&r=3',
    'star_4_url', v_url || '&r=4', 'star_5_url', v_url || '&r=5',
    'rating', coalesce(r.rating::text, ''),
    'rating_stars', case when r.rating is null then '' else repeat('★', r.rating) || repeat('☆', 5 - r.rating) end,
    'feedback', coalesce(r.feedback, ''),
    'admin_url', v_base || '/admin/reviews',
    'site_url', v_base,
    'business_address', coalesce(public.ryzon_landing_cfg('business_address'), ''),
    'owner_name', coalesce(public.ryzon_landing_cfg('owner_name'), 'Ryzon Automation'),
    'owner_phone', coalesce(public.ryzon_landing_cfg('owner_phone'), ''));
end $fn$;

create or replace function public.ryzon_landing_queue_review_email(p_review uuid, p_template text) returns bigint
language plpgsql security definer set search_path = '' as $fn$
declare v_id bigint;
begin
  insert into public.ryzon_landing_email_queue (review_id, template_key, send_at)
  values (p_review, p_template, now()) returning id into v_id;
  perform public.ryzon_landing_kick();
  return v_id;
end $fn$;

create or replace function public.ryzon_landing_create_review(p_name text, p_email text, p_source text, p_submission uuid default null) returns uuid
language plpgsql security definer set search_path = '' as $fn$
declare v_id uuid;
begin
  insert into public.ryzon_landing_reviews (name, email, source, submission_id)
  values (nullif(trim(coalesce(p_name, '')), ''), lower(trim(p_email)), p_source, p_submission)
  returning id into v_id;
  perform public.ryzon_landing_queue_review_email(v_id, 'review_request');
  return v_id;
end $fn$;

-- Every customer gets a review request the moment they pay (or are marked as paid).
create or replace function public.ryzon_landing_review_on_convert() returns trigger
language plpgsql security definer set search_path = '' as $fn$
declare v_paid text[] := array['converted_full', 'converted_50_month', 'converted_50_year', 'design_files'];
begin
  if new.form_type = 'demo'
     and ((old.paid_at is null and new.paid_at is not null) or (new.status = any (v_paid) and not (old.status = any (v_paid))))
     and not exists (select 1 from public.ryzon_landing_reviews where submission_id = new.id and source = 'converted') then
    perform public.ryzon_landing_create_review(new.name, new.email, 'converted', new.id);
  end if;
  return new;
end $fn$;
drop trigger if exists ryzon_landing_review_on_convert on public.ryzon_landing_submissions;
create trigger ryzon_landing_review_on_convert after update of paid_at, status on public.ryzon_landing_submissions
  for each row execute function public.ryzon_landing_review_on_convert();

-- ---------------------------------------------------------------- admin
create or replace function public.ryzon_landing_admin_send_review_requests(p_people jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $fn$
declare v_person jsonb; v_email text; v_sent int := 0; v_skipped jsonb := '[]'::jsonb;
begin
  perform public.ryzon_landing_require_admin();
  if jsonb_typeof(p_people) <> 'array' or jsonb_array_length(p_people) = 0 then raise exception 'Add at least one email'; end if;
  if jsonb_array_length(p_people) > 200 then raise exception 'Send at most 200 at a time'; end if;
  for v_person in select * from jsonb_array_elements(p_people) loop
    v_email := lower(trim(coalesce(v_person->>'email', '')));
    if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
      v_skipped := v_skipped || jsonb_build_object('email', v_email, 'reason', 'not a valid email');
    elsif exists (select 1 from public.ryzon_landing_reviews where lower(email) = v_email and created_at > now() - interval '30 days') then
      v_skipped := v_skipped || jsonb_build_object('email', v_email, 'reason', 'already asked in the last 30 days');
    else
      perform public.ryzon_landing_create_review(v_person->>'name', v_email, 'manual');
      v_sent := v_sent + 1;
    end if;
  end loop;
  return jsonb_build_object('sent', v_sent, 'skipped', v_skipped);
end $fn$;

create or replace function public.ryzon_landing_admin_resend_review(p_id uuid) returns bigint
language plpgsql security definer set search_path = '' as $fn$
begin
  perform public.ryzon_landing_require_admin();
  if not exists (select 1 from public.ryzon_landing_reviews where id = p_id and status = 'sent') then
    raise exception 'They already answered, so there is nothing to resend';
  end if;
  return public.ryzon_landing_queue_review_email(p_id, 'review_request');
end $fn$;

create or replace function public.ryzon_landing_admin_resolve_review(p_id uuid, p_note text default null) returns void
language plpgsql security definer set search_path = '' as $fn$
begin
  perform public.ryzon_landing_require_admin();
  update public.ryzon_landing_reviews
     set status = 'resolved', resolved_at = now(), resolution_note = nullif(trim(coalesce(p_note, '')), '')
   where id = p_id and status = 'feedback';
  if not found then raise exception 'Nothing to resolve on this review'; end if;
end $fn$;

create or replace function public.ryzon_landing_admin_review_settings() returns jsonb
language plpgsql stable security definer set search_path = '' as $fn$
begin
  perform public.ryzon_landing_require_admin();
  return public.ryzon_landing_review_links();
end $fn$;

create or replace function public.ryzon_landing_admin_set_review_links(p_google text, p_facebook text default null, p_yelp text default null) returns jsonb
language plpgsql security definer set search_path = '' as $fn$
declare v_key text; v_val text;
begin
  perform public.ryzon_landing_require_admin();
  for v_key, v_val in select * from (values ('review_link_google', p_google), ('review_link_facebook', p_facebook), ('review_link_yelp', p_yelp)) as t(k, v) loop
    v_val := nullif(trim(coalesce(v_val, '')), '');
    if v_val is not null and v_val !~ '^https://[^\s]+$' then raise exception 'Links must start with https://'; end if;
    insert into public.ryzon_landing_config (key, value) values (v_key, coalesce(v_val, ''))
    on conflict (key) do update set value = excluded.value, updated_at = now();
  end loop;
  return public.ryzon_landing_review_links();
end $fn$;

-- ---------------------------------------------------------------- public (token-gated)
create or replace function public.ryzon_landing_review_state(r public.ryzon_landing_reviews) returns jsonb
language sql stable security definer set search_path = '' as $fn$
  select jsonb_build_object(
    'first_name', coalesce(nullif(public.ryzon_landing_first_name(r.name), ''), ''),
    'status', r.status, 'rating', r.rating, 'wants_contact', r.wants_contact,
    'links', case when r.rating >= 4 then public.ryzon_landing_review_links() else '{}'::jsonb end);
$fn$;

create or replace function public.ryzon_landing_review_lookup(p_token text) returns jsonb
language sql stable security definer set search_path = '' as $fn$
  select public.ryzon_landing_review_state(r) from public.ryzon_landing_reviews r where r.token = p_token;
$fn$;

create or replace function public.ryzon_landing_review_rate(p_token text, p_rating int) returns jsonb
language plpgsql security definer set search_path = '' as $fn$
declare r public.ryzon_landing_reviews;
begin
  if p_rating is null or p_rating < 1 or p_rating > 5 then raise exception 'Pick from 1 to 5 stars'; end if;
  update public.ryzon_landing_reviews set rating = p_rating, status = 'rated', rated_at = now()
   where token = p_token and status = 'sent' returning * into r;
  if not found then select * into r from public.ryzon_landing_reviews where token = p_token; end if;
  if r.id is null then return null; end if;
  return public.ryzon_landing_review_state(r);
end $fn$;

create or replace function public.ryzon_landing_review_feedback(p_token text, p_feedback text, p_contact boolean) returns jsonb
language plpgsql security definer set search_path = '' as $fn$
declare r public.ryzon_landing_reviews;
begin
  update public.ryzon_landing_reviews
     set feedback = left(nullif(trim(coalesce(p_feedback, '')), ''), 5000), wants_contact = coalesce(p_contact, false),
         status = 'feedback', feedback_at = now()
   where token = p_token and status = 'rated' and rating <= 3
  returning * into r;
  if found and r.wants_contact then perform public.ryzon_landing_queue_review_email(r.id, 'review_contact_admin'); end if;
  if not found then select * into r from public.ryzon_landing_reviews where token = p_token; end if;
  if r.id is null then return null; end if;
  return public.ryzon_landing_review_state(r);
end $fn$;

create or replace function public.ryzon_landing_review_clicked(p_token text, p_platform text) returns void
language sql security definer set search_path = '' as $fn$
  update public.ryzon_landing_reviews set platform_clicked = p_platform, platform_clicked_at = now()
   where token = p_token and rating >= 4 and p_platform in ('google', 'facebook', 'yelp');
$fn$;

-- ---------------------------------------------------------------- sender
create or replace function public.ryzon_landing_admin_resend(p_queue_id bigint) returns bigint
language plpgsql security definer set search_path = '' as $fn$
declare q public.ryzon_landing_email_queue; v_id bigint;
begin
  perform public.ryzon_landing_require_admin();
  select * into q from public.ryzon_landing_email_queue where id = p_queue_id;
  if not found then raise exception 'not found'; end if;
  insert into public.ryzon_landing_email_queue (submission_id, referrer_id, review_id, template_key, send_at, vars, change_request_id)
  values (q.submission_id, q.referrer_id, q.review_id, q.template_key, now(), q.vars, q.change_request_id) returning id into v_id;
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
  rv public.ryzon_landing_reviews;
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

-- ---------------------------------------------------------------- permissions
revoke all on function public.ryzon_landing_review_links() from public, anon, authenticated;
revoke all on function public.ryzon_landing_review_vars(public.ryzon_landing_reviews) from public, anon, authenticated;
revoke all on function public.ryzon_landing_review_state(public.ryzon_landing_reviews) from public, anon, authenticated;
revoke all on function public.ryzon_landing_queue_review_email(uuid, text) from public, anon, authenticated;
revoke all on function public.ryzon_landing_create_review(text, text, text, uuid) from public, anon, authenticated;
revoke all on function public.ryzon_landing_review_on_convert() from public, anon, authenticated;
revoke all on function public.ryzon_landing_admin_send_review_requests(jsonb) from public, anon;
revoke all on function public.ryzon_landing_admin_resend_review(uuid) from public, anon;
revoke all on function public.ryzon_landing_admin_resolve_review(uuid, text) from public, anon;
revoke all on function public.ryzon_landing_admin_review_settings() from public, anon;
revoke all on function public.ryzon_landing_admin_set_review_links(text, text, text) from public, anon;
grant execute on function public.ryzon_landing_admin_send_review_requests(jsonb) to authenticated;
grant execute on function public.ryzon_landing_admin_resend_review(uuid) to authenticated;
grant execute on function public.ryzon_landing_admin_resolve_review(uuid, text) to authenticated;
grant execute on function public.ryzon_landing_admin_review_settings() to authenticated;
grant execute on function public.ryzon_landing_admin_set_review_links(text, text, text) to authenticated;
revoke all on function public.ryzon_landing_review_lookup(text) from public;
revoke all on function public.ryzon_landing_review_rate(text, int) from public;
revoke all on function public.ryzon_landing_review_feedback(text, text, boolean) from public;
revoke all on function public.ryzon_landing_review_clicked(text, text) from public;
grant execute on function public.ryzon_landing_review_lookup(text) to anon, authenticated;
grant execute on function public.ryzon_landing_review_rate(text, int) to anon, authenticated;
grant execute on function public.ryzon_landing_review_feedback(text, text, boolean) to anon, authenticated;
grant execute on function public.ryzon_landing_review_clicked(text, text) to anon, authenticated;

-- ---------------------------------------------------------------- emails
insert into public.ryzon_landing_email_templates (key, recipient, is_promotional, subject, preheader, description, html, text_body)
values (
'review_request', 'reviewer', false,
'How did we do, {{first_name}}?',
'One tap to tell us how your experience with Ryzon Automation went.',
'Review request. Sent from the dashboard, and to every customer the moment they pay.',
$t$<h1 style="{{st_h1}}">How did we do?</h1><p style="{{st_p}}">Hi {{first_name}},</p><p style="{{st_p}}">Thanks for choosing Ryzon Automation. We'd love to know how your experience has been so far. It takes one tap.</p><p style="{{st_p}}"><strong>How would you rate us?</strong> (5 is excellent)</p><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;"><tr><td style="padding:0 6px 0 0;"><a href="{{star_1_url}}" style="display:inline-block;width:52px;padding:10px 0;border:2px solid #0B1220;border-radius:8px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;line-height:20px;color:#0B1220;text-decoration:none;">1<br><span style="color:#F5A623;font-size:18px;">&#9733;</span></a></td><td style="padding:0 6px 0 0;"><a href="{{star_2_url}}" style="display:inline-block;width:52px;padding:10px 0;border:2px solid #0B1220;border-radius:8px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;line-height:20px;color:#0B1220;text-decoration:none;">2<br><span style="color:#F5A623;font-size:18px;">&#9733;</span></a></td><td style="padding:0 6px 0 0;"><a href="{{star_3_url}}" style="display:inline-block;width:52px;padding:10px 0;border:2px solid #0B1220;border-radius:8px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;line-height:20px;color:#0B1220;text-decoration:none;">3<br><span style="color:#F5A623;font-size:18px;">&#9733;</span></a></td><td style="padding:0 6px 0 0;"><a href="{{star_4_url}}" style="display:inline-block;width:52px;padding:10px 0;border:2px solid #0B1220;border-radius:8px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;line-height:20px;color:#0B1220;text-decoration:none;">4<br><span style="color:#F5A623;font-size:18px;">&#9733;</span></a></td><td><a href="{{star_5_url}}" style="display:inline-block;width:52px;padding:10px 0;border:2px solid #0B1220;border-radius:8px;background:#0B1220;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;line-height:20px;color:#ffffff;text-decoration:none;">5<br><span style="color:#F5A623;font-size:18px;">&#9733;</span></a></td></tr></table><p style="{{st_small}}">Buttons not working? <a href="{{review_url}}" style="{{st_link}}">Open the rating page</a>.</p>$t$,
$t$Hi {{first_name}},

Thanks for choosing Ryzon Automation. We'd love to know how your experience has been so far. It takes one tap.

How would you rate us? (5 is excellent)
5 stars: {{star_5_url}}
4 stars: {{star_4_url}}
3 stars: {{star_3_url}}
2 stars: {{star_2_url}}
1 star: {{star_1_url}}

Talk soon,
{{owner_name}}
Ryzon Automation · {{owner_phone}}

{{business_address}}$t$
) on conflict (key) do update set recipient = excluded.recipient, subject = excluded.subject, preheader = excluded.preheader,
  description = excluded.description, html = excluded.html, text_body = excluded.text_body, updated_at = now();

insert into public.ryzon_landing_email_templates (key, recipient, is_promotional, subject, preheader, description, html, text_body)
values (
'review_contact_admin', 'admin', false,
'Unhappy customer wants a call: {{name}} ({{rating}} stars)',
'They rated us {{rating}} out of 5 and asked to be contacted.',
'Sent to you when someone rates 1-3 stars and says yes to being contacted.',
$t$<h1 style="{{st_h1}}">{{name}} wants to be contacted</h1><p style="{{st_p}}">They rated us <strong>{{rating_stars}} ({{rating}} out of 5)</strong> and said yes when we asked if we could reach out and make it right.</p><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="{{st_tbl}}"><tr><td style="{{st_k}}">Name</td><td style="{{st_v}}">{{name}}</td></tr><tr><td style="{{st_k2}}">Email</td><td style="{{st_v2}}">{{email}}</td></tr><tr><td style="{{st_k2}}">Rating</td><td style="{{st_v2}}">{{rating}} out of 5</td></tr></table><p style="{{st_p}}"><strong>What they said we could have done better:</strong></p><p style="{{st_box}}">{{feedback}}</p><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="{{st_btn_tbl}}"><tr><td bgcolor="#2F6BFF" style="{{st_btn_td}}"><a href="{{admin_url}}" style="{{st_btn_a}}">Open reviews in the dashboard</a></td></tr></table><p style="{{st_small}}">Reply to this email to write to them directly.</p>$t$,
$t${{name}} wants to be contacted.

They rated us {{rating}} out of 5 and said yes when we asked if we could reach out and make it right.

Email: {{email}}

What they said we could have done better:
{{feedback}}

Open reviews in the dashboard: {{admin_url}}
Reply to this email to write to them directly.$t$
) on conflict (key) do update set recipient = excluded.recipient, subject = excluded.subject, preheader = excluded.preheader,
  description = excluded.description, html = excluded.html, text_body = excluded.text_body, updated_at = now();
