-- Cover the foreign keys the performance advisor flagged.
create index if not exists ryzon_landing_change_requests_sub_idx on public.ryzon_landing_change_requests (submission_id);
create index if not exists ryzon_landing_email_queue_cr_idx on public.ryzon_landing_email_queue (change_request_id);
create index if not exists ryzon_landing_email_queue_tpl_idx on public.ryzon_landing_email_queue (template_key);
create index if not exists ryzon_landing_payments_sub_idx on public.ryzon_landing_payments (submission_id);
