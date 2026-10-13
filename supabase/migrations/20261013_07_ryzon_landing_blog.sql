-- Blog posts for the Ryzon landing site. Same format as the blogs table in the
-- owner's other project (cwlsttyjtxqhasirnxut.public.blogs), so posts and tools move
-- between them unchanged. Public can read published posts; only Ryzon admins write.
create table if not exists public.ryzon_landing_blog (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text,
  content text not null default '',
  reading_time_minutes smallint,
  meta_title text,
  meta_description text,
  focus_keyword text,
  secondary_keywords text[],
  canonical_url text,
  og_title text,
  og_description text,
  og_image text,
  featured_image_url text,
  featured_image_alt text,
  category text not null default 'general',
  tags text[],
  author_name text not null default 'Ryzon Automation Team',
  author_slug text,
  author_avatar_url text,
  author_bio text,
  schema_markup jsonb,
  table_of_contents jsonb,
  internal_links jsonb,
  related_service_slugs text[],
  related_state_slugs text[],
  related_city_slugs text[],
  cta_text text,
  cta_href text,
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  views_count integer default 0,
  related_service_state text,
  constraint ryzon_landing_blog_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create index if not exists ryzon_landing_blog_published_at_idx
  on public.ryzon_landing_blog (published_at desc) where is_published;
create index if not exists ryzon_landing_blog_category_published_idx
  on public.ryzon_landing_blog (category, published_at desc) where is_published;
create index if not exists ryzon_landing_blog_tags_gin on public.ryzon_landing_blog using gin (tags);
create index if not exists ryzon_landing_blog_secondary_keywords_gin on public.ryzon_landing_blog using gin (secondary_keywords);
create index if not exists ryzon_landing_blog_related_services_gin on public.ryzon_landing_blog using gin (related_service_slugs);

create or replace function public.ryzon_landing_blog_touch()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  -- Publishing for the first time stamps the date the post goes live.
  if new.is_published and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end $$;

drop trigger if exists ryzon_landing_blog_touch on public.ryzon_landing_blog;
create trigger ryzon_landing_blog_touch
  before insert or update on public.ryzon_landing_blog
  for each row execute function public.ryzon_landing_blog_touch();

alter table public.ryzon_landing_blog enable row level security;

drop policy if exists "Public reads published posts" on public.ryzon_landing_blog;
-- Separate policies: anon can't execute ryzon_landing_is_admin(), so calling it in an
-- anon policy fails every public read.
create policy "Public reads published posts" on public.ryzon_landing_blog
  for select to anon using (is_published);

drop policy if exists "Signed-in users read published posts" on public.ryzon_landing_blog;
create policy "Signed-in users read published posts" on public.ryzon_landing_blog
  for select to authenticated using (is_published or public.ryzon_landing_is_admin());

drop policy if exists "Admins write posts" on public.ryzon_landing_blog;
create policy "Admins write posts" on public.ryzon_landing_blog
  for all to authenticated using (public.ryzon_landing_is_admin()) with check (public.ryzon_landing_is_admin());

grant select on public.ryzon_landing_blog to anon, authenticated;
grant insert, update, delete on public.ryzon_landing_blog to authenticated;
