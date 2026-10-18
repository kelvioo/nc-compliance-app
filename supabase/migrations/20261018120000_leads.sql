-- Leads from the free NC Compliance Check on the website. Visitors aren't
-- signed in, so the table has no policies: anonymous visitors can only add a
-- lead through submit_lead(), and only platform admins can read them.

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  company text not null,
  email text not null,
  phone text,
  org_type text,
  score integer,
  answers jsonb not null default '{}'::jsonb,
  source text not null default 'compliance_check'
);
create index leads_created_at_idx on public.leads (created_at desc);
create index leads_email_idx on public.leads (lower(email), created_at desc);
alter table public.leads enable row level security;
revoke all on public.leads from anon, authenticated;

create function public.submit_lead(
  p_name text, p_company text, p_email text, p_phone text,
  p_org_type text, p_score integer, p_answers jsonb
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
begin
  if length(btrim(coalesce(p_name, ''))) not between 1 and 120
     or length(btrim(coalesce(p_company, ''))) not between 1 and 160
     or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 200
     or length(coalesce(p_phone, '')) > 40
     or coalesce(p_score, 0) not between 0 and 100
     or pg_column_size(coalesce(p_answers, '{}'::jsonb)) > 4000 then
    raise exception 'invalid_lead';
  end if;
  -- Light abuse guard: a handful of submissions per address per day.
  if (select count(*) from public.leads where lower(email) = v_email and created_at > now() - interval '1 day') >= 5 then
    return;
  end if;
  insert into public.leads (name, company, email, phone, org_type, score, answers)
  values (btrim(p_name), btrim(p_company), v_email, nullif(btrim(coalesce(p_phone, '')), ''),
          left(p_org_type, 40), p_score, coalesce(p_answers, '{}'::jsonb));
end;
$$;

create function public.admin_leads()
returns table (id uuid, created_at timestamptz, name text, company text, email text, phone text,
               org_type text, score integer, answers jsonb, signed_up boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_platform_admin() then raise exception 'forbidden'; end if;
  return query
    select l.id, l.created_at, l.name, l.company, l.email, l.phone, l.org_type, l.score, l.answers,
           exists (select 1 from auth.users u where lower(u.email::text) = lower(l.email))
      from public.leads l
     order by l.created_at desc
     limit 500;
end;
$$;

revoke execute on function public.submit_lead(text, text, text, text, text, integer, jsonb) from public;
grant execute on function public.submit_lead(text, text, text, text, text, integer, jsonb) to anon, authenticated;
revoke execute on function public.admin_leads() from public, anon;
grant execute on function public.admin_leads() to authenticated;
