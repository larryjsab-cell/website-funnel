-- Ryzon landing: scheduled blog posts and a social promo webhook when a post goes live.
-- A post is live when is_published and published_at <= now(). A future published_at is "scheduled":
-- hidden from the public until then. Every 5 minutes pg_cron sends each newly live post once to the
-- n8n webhook in config 'blog_promo_webhook' (header x-ryzon-hook = config 'n8n_hook_token').
-- promo_status: null = not sent yet, 'sent' = handed to n8n, 'failed', 'skipped' = live before this existed.

alter table public.ryzon_landing_blog
  add column if not exists promo_status text check (promo_status in ('sent', 'failed', 'skipped')),
  add column if not exists promo_sent_at timestamptz,
  add column if not exists promo_error text;

-- Posts already live when this shipped don't get promoted retroactively.
update public.ryzon_landing_blog set promo_status = 'skipped', promo_sent_at = now() where is_published and promo_status is null;

drop policy if exists "Public reads published posts" on public.ryzon_landing_blog;
create policy "Public reads published posts" on public.ryzon_landing_blog
  for select to anon using (is_published and published_at <= now());
drop policy if exists "Signed-in users read published posts" on public.ryzon_landing_blog;
create policy "Signed-in users read published posts" on public.ryzon_landing_blog
  for select to authenticated using ((is_published and published_at <= now()) or public.ryzon_landing_is_admin());

-- What n8n receives about a post.
create or replace function public.ryzon_landing_blog_promo_payload(p_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $fn$
  select jsonb_build_object(
    'event', 'blog_post_live',
    'id', b.id, 'slug', b.slug, 'title', b.title, 'excerpt', b.excerpt,
    'url', rtrim(coalesce(public.ryzon_landing_cfg('site_url'), ''), '/') || '/blog/' || b.slug,
    'image_url', b.featured_image_url, 'image_alt', b.featured_image_alt,
    'meta_description', b.meta_description, 'focus_keyword', b.focus_keyword,
    'secondary_keywords', to_jsonb(b.secondary_keywords), 'category', b.category, 'tags', to_jsonb(b.tags),
    'headings', coalesce((select jsonb_agg(t->>'text') from jsonb_array_elements(coalesce(b.table_of_contents, '[]'::jsonb)) t), '[]'::jsonb),
    'published_at', b.published_at,
    'business', jsonb_build_object('name', 'Ryzon Automation', 'site', public.ryzon_landing_cfg('site_url'),
                                   'offer', 'Websites from $40/month, $0 design fee, free demo ready as soon as the next day'))
  from public.ryzon_landing_blog b where b.id = p_id;
$fn$;

-- Sends one post to n8n. Returns false when no webhook is configured (the post stays pending).
create or replace function public.ryzon_landing_blog_send_promo(p_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $fn$
declare v_url text := nullif(public.ryzon_landing_cfg('blog_promo_webhook'), '');
begin
  if v_url is null then return false; end if;
  perform net.http_post(
    url := v_url,
    body := public.ryzon_landing_blog_promo_payload(p_id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-ryzon-hook', public.ryzon_landing_cfg('n8n_hook_token')),
    timeout_milliseconds := 15000);
  update public.ryzon_landing_blog set promo_status = 'sent', promo_sent_at = now(), promo_error = null where id = p_id;
  return true;
end $fn$;

-- pg_cron, every 5 minutes: posts whose time has come and haven't been promoted yet.
create or replace function public.ryzon_landing_blog_go_live() returns int
language plpgsql security definer set search_path = '' as $fn$
declare r record; v_n int := 0;
begin
  for r in select id from public.ryzon_landing_blog
            where is_published and published_at <= now() and promo_status is null
            order by published_at limit 10 loop
    if public.ryzon_landing_blog_send_promo(r.id) then v_n := v_n + 1; end if;
  end loop;
  return v_n;
end $fn$;

-- Dashboard: publish now, schedule for later, or move back to draft.
create or replace function public.ryzon_landing_admin_blog_schedule(p_id uuid, p_action text, p_at timestamptz default null) returns jsonb
language plpgsql security definer set search_path = '' as $fn$
declare b public.ryzon_landing_blog;
begin
  perform public.ryzon_landing_require_admin();
  select * into b from public.ryzon_landing_blog where id = p_id for update;
  if not found then raise exception 'Post not found'; end if;
  if p_action = 'publish_now' then
    update public.ryzon_landing_blog set is_published = true, published_at = now() where id = p_id;
  elsif p_action = 'schedule' then
    if p_at is null or p_at <= now() + interval '1 minute' then raise exception 'Pick a time in the future'; end if;
    -- Rescheduling a post that hasn't gone live yet keeps it eligible for its promo.
    update public.ryzon_landing_blog set is_published = true, published_at = p_at,
      promo_status = case when promo_status = 'skipped' then null else promo_status end
     where id = p_id;
  elsif p_action = 'draft' then
    update public.ryzon_landing_blog set is_published = false where id = p_id;
  else
    raise exception 'Unknown action: %', p_action;
  end if;
  if p_action = 'publish_now' then perform public.ryzon_landing_blog_go_live(); end if;
  select * into b from public.ryzon_landing_blog where id = p_id;
  return jsonb_build_object('is_published', b.is_published, 'published_at', b.published_at, 'promo_status', b.promo_status);
end $fn$;

-- Dashboard: send a live post to the social promo workflow again.
create or replace function public.ryzon_landing_admin_blog_resend_promo(p_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $fn$
begin
  perform public.ryzon_landing_require_admin();
  if not exists (select 1 from public.ryzon_landing_blog where id = p_id and is_published and published_at <= now()) then
    raise exception 'Only live posts can be promoted';
  end if;
  if not public.ryzon_landing_blog_send_promo(p_id) then raise exception 'The social promo webhook isn''t set up yet'; end if;
  return true;
end $fn$;

revoke all on function public.ryzon_landing_blog_promo_payload(uuid) from public, anon, authenticated;
revoke all on function public.ryzon_landing_blog_send_promo(uuid) from public, anon, authenticated;
revoke all on function public.ryzon_landing_blog_go_live() from public, anon, authenticated;
revoke all on function public.ryzon_landing_admin_blog_schedule(uuid, text, timestamptz) from public, anon;
revoke all on function public.ryzon_landing_admin_blog_resend_promo(uuid) from public, anon;
grant execute on function public.ryzon_landing_admin_blog_schedule(uuid, text, timestamptz) to authenticated;
grant execute on function public.ryzon_landing_admin_blog_resend_promo(uuid) to authenticated;

select cron.schedule('ryzon-landing-blog-go-live', '*/5 * * * *', 'select public.ryzon_landing_blog_go_live()');
