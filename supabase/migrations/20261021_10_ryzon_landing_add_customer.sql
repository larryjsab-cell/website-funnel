-- Ryzon landing: add a person straight into any stage from the dashboard (existing customers, phone leads).
-- Nothing is emailed unless asked: no welcome email, and automations start paused by default.
-- Inserting never fires ryzon_landing_review_on_convert (that trigger is AFTER UPDATE only), so a
-- review request goes out only when p.send_review is true.

create or replace function public.ryzon_landing_admin_add_customer(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $fn$
declare
  v_name text := btrim(coalesce(p->>'name', ''));
  v_email text := lower(btrim(coalesce(p->>'email', '')));
  v_status text := coalesce(nullif(p->>'status', ''), 'live');
  v_plan text := nullif(p->>'plan', '');
  v_interval text := nullif(p->>'billing_interval', '');
  v_paid timestamptz;
  v_demo text := nullif(btrim(coalesce(p->>'demo_url', '')), '');
  v_existing text;
  v_id uuid;
  v_note text;
begin
  perform public.ryzon_landing_require_admin();
  if v_name = '' then raise exception 'Add their name'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' then raise exception 'That email doesn''t look right: %', v_email; end if;
  if v_status not in ('demo_in_progress', 'demo_review', 'converted_full', 'converted_50_month', 'converted_50_year',
                      'design_files', 'files_delivered', 'closed_no_response', 'changes_received', 'call_scheduled',
                      'in_build', 'ready_to_launch', 'live') then
    raise exception 'Unknown stage: %', v_status;
  end if;
  if v_plan is not null and v_plan not in ('starter', 'growth', 'complete', 'files99') then raise exception 'Unknown plan: %', v_plan; end if;
  if v_interval is not null and v_interval not in ('month', 'year', 'once') then raise exception 'Unknown billing: %', v_interval; end if;
  -- A paid date is a calendar day; store it as noon in Detroit so it shows on that day.
  if nullif(p->>'paid_on', '') is not null then
    v_paid := ((p->>'paid_on')::date + time '12:00') at time zone 'America/Detroit';
  end if;

  select status into v_existing from public.ryzon_landing_submissions
   where form_type = 'demo' and lower(email) = v_email order by created_at desc limit 1;
  if found and not coalesce((p->>'allow_duplicate')::boolean, false) then
    raise exception '% is already in your pipeline (%). Open them from All submissions instead.', v_email, v_existing;
  end if;

  insert into public.ryzon_landing_submissions (
    form_type, name, email, phone, business_name, industry, current_site, status,
    demo_url, demo_uploaded_at, plan, billing_interval, offer, paid_at, live_url,
    source_page, admin_notes, automations_paused, webhook_synced, form_answers
  ) values (
    'demo', v_name, v_email, nullif(btrim(coalesce(p->>'phone', '')), ''), nullif(btrim(coalesce(p->>'business_name', '')), ''),
    nullif(btrim(coalesce(p->>'industry', '')), ''), nullif(btrim(coalesce(p->>'current_site', '')), ''), v_status,
    v_demo, case when v_demo is not null then now() end,
    v_plan, case when v_plan = 'files99' then 'once' else v_interval end,
    case when v_plan = 'files99' then 'files99' when v_paid is not null then 'standard' end,
    v_paid, nullif(btrim(coalesce(p->>'live_url', '')), ''),
    'dashboard', nullif(btrim(coalesce(p->>'notes', '')), ''),
    not coalesce((p->>'send_emails')::boolean, false), true,
    jsonb_build_object('added_manually', true)
  ) returning id into v_id;

  v_note := 'Added manually from the dashboard'
    || case when coalesce((p->>'send_emails')::boolean, false) then '' else '; automatic emails paused' end;
  insert into public.ryzon_landing_status_history (submission_id, from_status, to_status, changed_by, note)
  values (v_id, null, v_status, 'admin', v_note);

  if coalesce((p->>'send_review')::boolean, false) then
    perform public.ryzon_landing_create_review(v_name, v_email, 'converted', v_id);
  end if;

  return jsonb_build_object('id', v_id);
end $fn$;

revoke all on function public.ryzon_landing_admin_add_customer(jsonb) from public, anon;
grant execute on function public.ryzon_landing_admin_add_customer(jsonb) to authenticated;
