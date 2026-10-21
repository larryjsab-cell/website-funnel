-- Featured images for the blog posts (files in public/images/blog/, 1024x640 WebP).
-- Generated with Higgsfield GPT Image 2.5; prompts are in docs/seo/blog-image-prompts.md.
update public.ryzon_landing_blog as b set featured_image_url = v.url, featured_image_alt = v.alt
from (values
  ('local-seo-for-small-business', 'https://ryzonautomationllc.com/images/blog/local-seo-for-small-business.webp', 'Shop owner in her doorway holding a phone that shows a map of nearby businesses'),
  ('contractor-website-design', 'https://ryzonautomationllc.com/images/blog/contractor-website-design.webp', 'Plumber kneeling by his toolbox and van, checking a new job request on his phone'),
  ('website-maintenance-cost', 'https://ryzonautomationllc.com/images/blog/website-maintenance-cost.webp', 'Laptop, notebook, calculator and coffee on a café table while planning website costs'),
  ('local-service-business-website-checklist', 'https://ryzonautomationllc.com/images/blog/local-service-business-website-checklist.webp', 'Landscaper showing a homeowner his business website on a phone'),
  ('do-i-need-a-website-if-i-have-a-facebook-page', 'https://ryzonautomationllc.com/images/blog/do-i-need-a-website-if-i-have-a-facebook-page.webp', 'Salon owner at her front desk thinking it over, with a tablet and phone in front of her'),
  ('how-much-does-a-small-business-website-cost', 'https://ryzonautomationllc.com/images/blog/how-much-does-a-small-business-website-cost.webp', 'Auto repair shop owner reviewing website options on a laptop in his office, with a car on a lift behind him')
) as v(slug, url, alt)
where b.slug = v.slug;
