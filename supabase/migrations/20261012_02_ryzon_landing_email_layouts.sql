-- Wrap each template body in the shared layout stored in ryzon_landing_config.
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
