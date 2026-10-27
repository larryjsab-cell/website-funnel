-- Featured/OG images for the three blog-queue posts (files in public/images/blog/, 1024x640 webp).
update public.ryzon_landing_blog b set
  featured_image_url = 'https://ryzonautomationllc.com/images/blog/' || b.slug || '.webp',
  og_image = 'https://ryzonautomationllc.com/images/blog/' || b.slug || '.webp',
  featured_image_alt = v.alt,
  schema_markup = b.schema_markup || jsonb_build_object('primaryImageOfPage', jsonb_build_object('@type', 'ImageObject', 'url', 'https://ryzonautomationllc.com/images/blog/' || b.slug || '.webp', 'width', 1024, 'height', 640))
from (values
  ('thirty-dollar-website-small-business-costs', 'Landscaping business owner smiling at her new lawn and garden website on a laptop in her home office'),
  ('digital-marketing-platform-for-small-businesses', 'Small business owner taking notes while reviewing website analytics on two laptops in her home office'),
  ('local-seo-agency-vs-diy-small-business-guide', 'Business owner by a window checking a map of where her website visitors come from, with traffic charts')
) as v(slug, alt)
where b.slug = v.slug;
