-- Tell n8n when there is email to send. The database decides what is due, so n8n only
-- runs when it has work: right away when an instant email is queued, and once a minute
-- (pg_cron) for scheduled ones. pg_net sends the request after the transaction commits.
create extension if not exists pg_net;
create extension if not exists pg_cron;

insert into public.ryzon_landing_config (key, value) values
  ('n8n_send_url', 'https://ryzonmedia.app.n8n.cloud/webhook/ryzon-landing-send'),
  ('n8n_hook_token', encode(extensions.gen_random_bytes(24), 'hex'))
on conflict (key) do nothing;

create or replace function public.ryzon_landing_has_due() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.ryzon_landing_email_queue q
      join public.ryzon_landing_email_templates t on t.key = q.template_key
      join public.ryzon_landing_submissions s on s.id = q.submission_id
     where q.state = 'pending' and q.send_at <= now()
       and not (t.recipient = 'customer' and s.automations_paused)
  ) or exists (
    select 1 from public.ryzon_landing_email_queue
     where state = 'sending' and updated_at < now() - interval '30 minutes'
  );
$$;

-- At most one request per transaction, however many emails it queued.
create or replace function public.ryzon_landing_kick() returns bigint
language plpgsql security definer set search_path = '' as $$
declare v_url text := public.ryzon_landing_cfg('n8n_send_url');
begin
  if v_url is null or current_setting('ryzon_landing.kicked', true) = 'on' then return null; end if;
  perform set_config('ryzon_landing.kicked', 'on', true);
  return net.http_post(
    url := v_url,
    body := jsonb_build_object('source', 'supabase'),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-ryzon-hook', public.ryzon_landing_cfg('n8n_hook_token')),
    timeout_milliseconds := 10000);
end $$;

create or replace function public.ryzon_landing_kick_if_due() returns bigint
language plpgsql security definer set search_path = '' as $$
begin
  if not public.ryzon_landing_has_due() then return null; end if;
  return public.ryzon_landing_kick();
end $$;

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
  if p_send_at <= now() then perform public.ryzon_landing_kick(); end if;
  return v_id;
end $$;

create or replace function public.ryzon_landing_admin_send_now(p_queue_id bigint) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.ryzon_landing_require_admin();
  update public.ryzon_landing_email_queue set send_at = now() where id = p_queue_id and state = 'pending';
  if found then perform public.ryzon_landing_kick(); end if;
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
  perform public.ryzon_landing_kick();
  return v_id;
end $$;

create or replace function public.ryzon_landing_admin_set_paused(p_id uuid, p_paused boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.ryzon_landing_require_admin();
  update public.ryzon_landing_submissions set automations_paused = p_paused where id = p_id;
  insert into public.ryzon_landing_status_history (submission_id, from_status, to_status, changed_by, note)
  select id, status, status, 'admin', case when p_paused then 'Automations paused' else 'Automations resumed' end
    from public.ryzon_landing_submissions where id = p_id;
  if not p_paused then perform public.ryzon_landing_kick_if_due(); end if;
end $$;

revoke all on function public.ryzon_landing_has_due() from public, anon, authenticated;
revoke all on function public.ryzon_landing_kick() from public, anon, authenticated;
revoke all on function public.ryzon_landing_kick_if_due() from public, anon, authenticated;
grant execute on function public.ryzon_landing_has_due() to service_role;
grant execute on function public.ryzon_landing_kick() to service_role;
grant execute on function public.ryzon_landing_kick_if_due() to service_role;

-- Scheduled emails (10 AM local, booking reminders) and the day-21 close.
select cron.schedule('ryzon-landing-send', '* * * * *', 'select public.ryzon_landing_kick_if_due()');
select cron.schedule('ryzon-landing-close-stale', '7 * * * *', 'select public.ryzon_landing_close_stale()');
