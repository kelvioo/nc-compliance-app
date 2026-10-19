-- New list prices plus a founding-customer offer: the first 20 companies to
-- pay get 30% off, and keep that price for two years from their first
-- payment. The billing function decides the amount; the offer closes on its
-- own once 20 companies have locked it in.

alter table public.plans add column founding_price_kobo bigint;

update public.plans set price_kobo =  50000000, founding_price_kobo =  35000000 where id = 'starter';
update public.plans set price_kobo = 100000000, founding_price_kobo =  70000000 where id = 'operations';
update public.plans set price_kobo = 500000000, founding_price_kobo = 350000000 where id = 'enterprise';

-- Set by the billing function on a company's first founding-price payment.
alter table public.organizations add column founding_until timestamptz;

create function public.founding_offer_open()
returns boolean language sql stable security definer set search_path = '' as $$
  select count(*) < 20 from public.organizations where founding_until is not null;
$$;
grant execute on function public.founding_offer_open() to anon, authenticated;
