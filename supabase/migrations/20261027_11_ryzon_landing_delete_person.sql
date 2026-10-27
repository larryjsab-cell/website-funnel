-- Ryzon landing: permanently delete a person and everything stored about them.
-- "A person" is everyone sharing the submission's email: every submission with that email
-- (cascades status history, change requests, calls, queued/sent emails and payments), every
-- review request to that email, and a referrer record with that email.
-- Design files in storage are removed by the dashboard (Storage API) before this runs.

-- What would be deleted, so the dashboard can show it before asking for confirmation.
create or replace function public.ryzon_landing_admin_person_summary(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $fn$
declare v_email text; v_ids uuid[];
begin
  perform public.ryzon_landing_require_admin();
  select lower(email) into v_email from public.ryzon_landing_submissions where id = p_id;
  if v_email is null then raise exception 'Not found. They may already be deleted.'; end if;
  select array_agg(id) into v_ids from public.ryzon_landing_submissions where lower(email) = v_email;
  return jsonb_build_object(
    'email', v_email,
    'submission_ids', to_jsonb(v_ids),
    'submissions', cardinality(v_ids),
    'history', (select count(*) from public.ryzon_landing_status_history where submission_id = any (v_ids)),
    'change_requests', (select count(*) from public.ryzon_landing_change_requests where submission_id = any (v_ids)),
    'payments', (select count(*) from public.ryzon_landing_payments where submission_id = any (v_ids)),
    'reviews', (select count(*) from public.ryzon_landing_reviews where submission_id = any (v_ids) or lower(email) = v_email),
    'referrer', exists (select 1 from public.ryzon_landing_referrers where lower(email) = v_email),
    'emails', (select count(*) from public.ryzon_landing_email_queue q
                where q.submission_id = any (v_ids)
                   or q.review_id in (select id from public.ryzon_landing_reviews where submission_id = any (v_ids) or lower(email) = v_email)
                   or q.referrer_id in (select id from public.ryzon_landing_referrers where lower(email) = v_email)));
end $fn$;

-- The delete itself. p_confirm must be the person's email, typed by the admin.
create or replace function public.ryzon_landing_admin_delete_person(p_id uuid, p_confirm text) returns jsonb
language plpgsql security definer set search_path = '' as $fn$
declare v_email text; v_ids uuid[]; v_reviews int; v_referrers int; v_subs int;
begin
  perform public.ryzon_landing_require_admin();
  select lower(email) into v_email from public.ryzon_landing_submissions where id = p_id;
  if v_email is null then raise exception 'Not found. They may already be deleted.'; end if;
  if lower(btrim(coalesce(p_confirm, ''))) <> v_email then raise exception 'Type their email exactly to confirm: %', v_email; end if;
  select array_agg(id) into v_ids from public.ryzon_landing_submissions where lower(email) = v_email;

  -- Reviews only null their submission link on delete, so remove them explicitly (their emails cascade).
  delete from public.ryzon_landing_reviews where submission_id = any (v_ids) or lower(email) = v_email;
  get diagnostics v_reviews = row_count;
  delete from public.ryzon_landing_referrers where lower(email) = v_email;
  get diagnostics v_referrers = row_count;
  delete from public.ryzon_landing_submissions where id = any (v_ids);
  get diagnostics v_subs = row_count;

  return jsonb_build_object('email', v_email, 'submissions', v_subs, 'reviews', v_reviews, 'referrers', v_referrers);
end $fn$;

revoke all on function public.ryzon_landing_admin_person_summary(uuid) from public, anon;
revoke all on function public.ryzon_landing_admin_delete_person(uuid, text) from public, anon;
grant execute on function public.ryzon_landing_admin_person_summary(uuid) to authenticated;
grant execute on function public.ryzon_landing_admin_delete_person(uuid, text) to authenticated;
