-- Ryzon landing: affiliate data is never deleted (owner's rule).
-- Affiliates, their link clicks and their commissions can be paused, voided or edited, but a
-- delete on any of these tables is refused. "Delete person" in the dashboard leaves them alone;
-- if the person was a customer, their commissions stay (submission_id becomes null).
create or replace function public.ryzon_landing_affiliate_keep() returns trigger
language plpgsql security definer set search_path = '' as $fn$
begin
  raise exception 'Affiliate records are kept permanently. Pause the affiliate or void the commission instead.';
end $fn$;

drop trigger if exists ryzon_landing_affiliates_keep on public.ryzon_landing_affiliates;
create trigger ryzon_landing_affiliates_keep before delete on public.ryzon_landing_affiliates
  for each row execute function public.ryzon_landing_affiliate_keep();
drop trigger if exists ryzon_landing_affiliate_clicks_keep on public.ryzon_landing_affiliate_clicks;
create trigger ryzon_landing_affiliate_clicks_keep before delete on public.ryzon_landing_affiliate_clicks
  for each row execute function public.ryzon_landing_affiliate_keep();
drop trigger if exists ryzon_landing_affiliate_commissions_keep on public.ryzon_landing_affiliate_commissions;
create trigger ryzon_landing_affiliate_commissions_keep before delete on public.ryzon_landing_affiliate_commissions
  for each row execute function public.ryzon_landing_affiliate_keep();

revoke all on function public.ryzon_landing_affiliate_keep() from public, anon, authenticated;
