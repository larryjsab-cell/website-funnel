-- Friendly timezone names in booking emails ("Pacific time" instead of "America/Los_Angeles").
create or replace function public.ryzon_landing_tz_label(p_tz text) returns text
language sql immutable set search_path = '' as $$
  select case p_tz
    when 'America/New_York' then 'Eastern time'
    when 'America/Detroit' then 'Eastern time'
    when 'America/Indiana/Indianapolis' then 'Eastern time'
    when 'America/Kentucky/Louisville' then 'Eastern time'
    when 'America/Chicago' then 'Central time'
    when 'America/Denver' then 'Mountain time'
    when 'America/Boise' then 'Mountain time'
    when 'America/Phoenix' then 'Arizona time'
    when 'America/Los_Angeles' then 'Pacific time'
    when 'America/Anchorage' then 'Alaska time'
    when 'Pacific/Honolulu' then 'Hawaii time'
    else replace(coalesce(nullif(regexp_replace(coalesce(p_tz, ''), '^.*/', ''), ''), 'local'), '_', ' ') || ' time'
  end;
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

  v_local := to_char(v_time at time zone s.timezone, 'FMDay, FMMonth FMDD "at" FMHH12:MI AM') || ' ' || public.ryzon_landing_tz_label(s.timezone);
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

revoke all on function public.ryzon_landing_tz_label(text) from public, anon, authenticated;
grant execute on function public.ryzon_landing_tz_label(text) to service_role;
