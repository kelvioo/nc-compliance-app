-- SaaS foundation: real user accounts (Supabase Auth), companies as
-- workspaces with team members and roles, invitations, trial + paid plans,
-- an audit trail, and optimistic locking on the workspace document so two
-- people editing at once can no longer silently overwrite each other.
--
-- Clients never write to these tables directly: every mutation goes through
-- a SECURITY DEFINER function below that checks the caller's role. Reads
-- are scoped by row level security to the companies the caller belongs to.

create extension if not exists pgcrypto with schema extensions;

-- Helpers live in a schema PostgREST does not expose, so they can be used
-- inside RLS policies without becoming public RPC endpoints.
create schema if not exists private;
grant usage on schema private to authenticated;

create type public.org_role as enum ('owner', 'admin', 'approver', 'reviewer', 'preparer', 'viewer');

-- ---------------------------------------------------------------- plans

create table public.plans (
  id text primary key,
  name text not null,
  price_kobo bigint not null,          -- annual price in kobo (NGN x 100)
  seat_limit integer,                  -- null = unlimited
  purchasable boolean not null default true,
  sort integer not null default 0
);

insert into public.plans (id, name, price_kobo, seat_limit, purchasable, sort) values
  ('trial',      'Free trial',  0,          5,    false, 0),
  ('starter',    'Starter',     15000000,   5,    true,  1),
  ('operations', 'Operations',  45000000,   25,   true,  2),
  ('enterprise', 'Enterprise',  100000000,  null, true,  3);

alter table public.plans enable row level security;
create policy "plans are public" on public.plans for select using (true);

-- --------------------------------------------------------- organizations

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  org_type text not null default 'operator'
    check (org_type in ('operator', 'contractor', 'consultant')),
  ncdmb_reg_no text check (ncdmb_reg_no is null or char_length(ncdmb_reg_no) <= 60),
  plan text not null default 'trial' references public.plans(id),
  subscription_status text not null default 'trialing'
    check (subscription_status in ('trialing', 'active', 'past_due', 'canceled')),
  trial_ends_at timestamptz not null default now() + interval '14 days',
  current_period_end timestamptz,
  billing_email text,
  paystack_customer_code text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.memberships (
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.org_role not null default 'preparer',
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index memberships_user_idx on public.memberships(user_id);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role public.org_role not null default 'preparer' check (role <> 'owner'),
  token text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz
);
create unique index invitations_pending_email_idx
  on public.invitations(org_id, lower(email)) where accepted_at is null;

-- One JSON document per company holds the compliance data the existing
-- report screens already work with. `version` is bumped on every save and
-- a save must name the version it was based on (see save_workspace).
create table public.workspaces (
  org_id uuid primary key references public.organizations(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_org_idx on public.audit_log(org_id, created_at desc);

-- Written only by the Paystack webhook (service role).
create table public.payments (
  reference text primary key,
  org_id uuid references public.organizations(id) on delete cascade,
  plan text references public.plans(id),
  amount_kobo bigint,
  status text not null,
  paid_at timestamptz,
  raw jsonb,
  created_at timestamptz not null default now()
);
create index payments_org_idx on public.payments(org_id);

-- Written only by the deadline-reminders function (service role), so each
-- reminder goes out once per company, report, deadline and lead time.
create table public.reminder_log (
  org_id uuid not null references public.organizations(id) on delete cascade,
  report_key text not null,
  deadline date not null,
  days_before integer not null,
  sent_at timestamptz not null default now(),
  primary key (org_id, report_key, deadline, days_before)
);

-- ---------------------------------------------------------------- helpers

create function private.is_member(p_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.org_id = p_org and m.user_id = (select auth.uid())
  );
$$;

create function private.has_role(p_org uuid, p_roles public.org_role[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.org_id = p_org and m.user_id = (select auth.uid()) and m.role = any(p_roles)
  );
$$;

create function private.org_has_access(p_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organizations o
    where o.id = p_org and (
      (o.subscription_status = 'active' and coalesce(o.current_period_end, now()) > now())
      or (o.subscription_status = 'trialing' and o.trial_ends_at > now())
    )
  );
$$;

create function private.audit(p_org uuid, p_action text, p_detail jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into public.audit_log (org_id, user_id, action, detail)
  values (p_org, (select auth.uid()), p_action, coalesce(p_detail, '{}'::jsonb));
$$;

revoke all on all functions in schema private from public, anon;
grant execute on function private.is_member(uuid) to authenticated;
grant execute on function private.has_role(uuid, public.org_role[]) to authenticated;

-- ---------------------------------------------------------------- RLS

alter table public.organizations enable row level security;
alter table public.memberships   enable row level security;
alter table public.invitations   enable row level security;
alter table public.workspaces    enable row level security;
alter table public.audit_log     enable row level security;
alter table public.payments      enable row level security;
alter table public.reminder_log  enable row level security;

create policy "members read their organizations" on public.organizations
  for select to authenticated using (private.is_member(id));

create policy "members read memberships of their organizations" on public.memberships
  for select to authenticated using (private.is_member(org_id));

create policy "admins read invitations" on public.invitations
  for select to authenticated
  using (private.has_role(org_id, array['owner', 'admin']::public.org_role[]));

create policy "admins revoke invitations" on public.invitations
  for delete to authenticated
  using (private.has_role(org_id, array['owner', 'admin']::public.org_role[]) and accepted_at is null);

create policy "members read their workspace" on public.workspaces
  for select to authenticated using (private.is_member(org_id));

create policy "managers read the audit log" on public.audit_log
  for select to authenticated
  using (private.has_role(org_id, array['owner', 'admin', 'approver']::public.org_role[]));

create policy "admins read payments" on public.payments
  for select to authenticated
  using (private.has_role(org_id, array['owner', 'admin']::public.org_role[]));

-- Clients only ever read; all writes go through the functions below.
revoke insert, update, delete, truncate on
  public.plans, public.organizations, public.memberships, public.workspaces,
  public.audit_log, public.payments, public.reminder_log
  from anon, authenticated;
revoke insert, update, truncate on public.invitations from anon, authenticated;
revoke all on public.reminder_log from anon, authenticated;
