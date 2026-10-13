-- Platform admin console for the product owner: overview, companies,
-- users, payments, activity, and manual plan changes (invoice customers,
-- trial extensions).

-- ------------------------------------------------------------ platform admin

create table public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.platform_admins enable row level security;
revoke all on public.platform_admins from anon, authenticated;

create function private.is_platform_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.platform_admins where user_id = (select auth.uid()));
$$;

-- Lets the app decide whether to show the Admin link.
create function public.am_platform_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_platform_admin();
$$;

create function public.admin_overview()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_platform_admin() then raise exception 'forbidden'; end if;
  return jsonb_build_object(
    'companies', (select count(*) from public.organizations),
    'users', (select count(*) from auth.users),
    'trialing', (select count(*) from public.organizations where subscription_status = 'trialing' and trial_ends_at > now()),
    'paying', (select count(*) from public.organizations where subscription_status = 'active' and coalesce(current_period_end, now()) > now()),
    'lapsed', (select count(*) from public.organizations where not (
                 (subscription_status = 'active' and coalesce(current_period_end, now()) > now())
                 or (subscription_status = 'trialing' and trial_ends_at > now()))),
    'trials_ending_7d', (select count(*) from public.organizations where subscription_status = 'trialing'
                          and trial_ends_at between now() and now() + interval '7 days'),
    'revenue_total_kobo', (select coalesce(sum(amount_kobo), 0) from public.payments where status = 'success'),
    'revenue_30d_kobo', (select coalesce(sum(amount_kobo), 0) from public.payments where status = 'success' and paid_at > now() - interval '30 days'),
    'signups_7d', (select count(*) from public.organizations where created_at > now() - interval '7 days'),
    'active_companies_7d', (select count(distinct org_id) from public.audit_log
                             where action = 'workspace.saved' and created_at > now() - interval '7 days'),
    'saves_7d', (select count(*) from public.audit_log where action = 'workspace.saved' and created_at > now() - interval '7 days')
  );
end;
$$;

create function public.admin_companies()
returns table (
  id uuid, name text, org_type text, ncdmb_reg_no text, plan text, subscription_status text,
  trial_ends_at timestamptz, current_period_end timestamptz, created_at timestamptz,
  owner_email text, members bigint, last_active timestamptz, saves_30d bigint, revenue_kobo bigint
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_platform_admin() then raise exception 'forbidden'; end if;
  return query
    select o.id, o.name, o.org_type, o.ncdmb_reg_no, o.plan, o.subscription_status,
           o.trial_ends_at, o.current_period_end, o.created_at,
           (select u.email::text from public.memberships m join auth.users u on u.id = m.user_id
             where m.org_id = o.id and m.role = 'owner' limit 1),
           (select count(*) from public.memberships m where m.org_id = o.id),
           (select max(a.created_at) from public.audit_log a where a.org_id = o.id),
           (select count(*) from public.audit_log a where a.org_id = o.id and a.action = 'workspace.saved'
              and a.created_at > now() - interval '30 days'),
           (select coalesce(sum(p.amount_kobo), 0)::bigint from public.payments p where p.org_id = o.id and p.status = 'success')
      from public.organizations o
     order by o.created_at desc;
end;
$$;

create function public.admin_users()
returns table (id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz, confirmed boolean, companies text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_platform_admin() then raise exception 'forbidden'; end if;
  return query
    select u.id, u.email::text, u.created_at, u.last_sign_in_at, u.email_confirmed_at is not null,
           (select string_agg(o.name || ' (' || m.role || ')', ', ' order by o.name)
              from public.memberships m join public.organizations o on o.id = m.org_id where m.user_id = u.id)
      from auth.users u
     order by u.created_at desc;
end;
$$;

create function public.admin_payments()
returns table (reference text, company text, plan text, amount_kobo bigint, status text, paid_at timestamptz, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_platform_admin() then raise exception 'forbidden'; end if;
  return query
    select p.reference, o.name, p.plan, p.amount_kobo, p.status, p.paid_at, p.created_at
      from public.payments p left join public.organizations o on o.id = p.org_id
     order by p.created_at desc
     limit 500;
end;
$$;

create function public.admin_activity()
returns table (created_at timestamptz, company text, user_email text, action text, detail jsonb)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_platform_admin() then raise exception 'forbidden'; end if;
  return query
    select a.created_at, o.name, u.email::text, a.action, a.detail
      from public.audit_log a
      left join public.organizations o on o.id = a.org_id
      left join auth.users u on u.id = a.user_id
     order by a.created_at desc
     limit 200;
end;
$$;

-- For customers who pay by invoice or bank transfer, or to extend a trial.
create function public.admin_set_subscription(
  p_org uuid, p_plan text, p_status text, p_period_end timestamptz default null, p_trial_ends_at timestamptz default null
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_platform_admin() then raise exception 'forbidden'; end if;
  update public.organizations set
    plan = p_plan,
    subscription_status = p_status,
    current_period_end = case when p_status = 'active' then coalesce(p_period_end, now() + interval '1 year') else current_period_end end,
    trial_ends_at = coalesce(p_trial_ends_at, trial_ends_at)
  where id = p_org;
  if not found then raise exception 'not_found'; end if;
  perform private.audit(p_org, 'admin.subscription_changed',
    jsonb_build_object('plan', p_plan, 'status', p_status, 'period_end', p_period_end, 'trial_ends_at', p_trial_ends_at));
end;
$$;

revoke execute on function
  public.set_submission_status(uuid, text, text, text, text, date, text),
  public.am_platform_admin(), public.admin_overview(), public.admin_companies(), public.admin_users(),
  public.admin_payments(), public.admin_activity(),
  public.admin_set_subscription(uuid, text, text, timestamptz, timestamptz)
  from public, anon;
grant execute on function
  public.set_submission_status(uuid, text, text, text, text, date, text),
  public.am_platform_admin(), public.admin_overview(), public.admin_companies(), public.admin_users(),
  public.admin_payments(), public.admin_activity(),
  public.admin_set_subscription(uuid, text, text, timestamptz, timestamptz)
  to authenticated;

-- Document expiry reminders read every company's documents (service role).
create function public.expiring_documents(p_days integer[])
returns table (org_id uuid, id uuid, title text, category text, expires_on date, days_left integer)
language sql stable security definer set search_path = '' as $$
  select d.org_id, d.id, d.title, d.category, d.expires_on, (d.expires_on - (now() at time zone 'Africa/Lagos')::date)
    from public.documents d
   where d.expires_on is not null
     and (d.expires_on - (now() at time zone 'Africa/Lagos')::date) = any(p_days);
$$;
revoke execute on function public.expiring_documents(integer[]) from public, anon, authenticated;
grant execute on function public.expiring_documents(integer[]) to service_role;

-- The product owner's account.
insert into public.platform_admins (user_id)
select id from auth.users where lower(email) = 'kelviniheanyiokah@gmail.com'
on conflict do nothing;
