-- 30-day trial, the submission workflow, and the document vault with
-- expiry tracking.

-- ------------------------------------------------------------ 30-day trial

alter table public.organizations alter column trial_ends_at set default now() + interval '30 days';

-- Companies already on a 14-day trial get the longer trial too.
update public.organizations
   set trial_ends_at = created_at + interval '30 days'
 where subscription_status = 'trialing' and trial_ends_at < created_at + interval '30 days';

-- ------------------------------------------------------------ helpers (text)

-- Storage paths are text ("<org id>/<file>"), so these compare as text and
-- never fail on a malformed path.
create function private.is_member_text(p_org text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.org_id::text = p_org and m.user_id = (select auth.uid())
  );
$$;

create function private.can_edit_text(p_org text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.org_id::text = p_org and m.user_id = (select auth.uid())
      and m.role in ('owner', 'admin', 'approver', 'reviewer', 'preparer')
  ) and exists (
    select 1 from public.organizations o
    where o.id::text = p_org and (
      (o.subscription_status = 'active' and coalesce(o.current_period_end, now()) > now())
      or (o.subscription_status = 'trialing' and o.trial_ends_at > now())
    )
  );
$$;

grant execute on function private.is_member_text(text), private.can_edit_text(text) to authenticated;

-- ------------------------------------------------------- submission workflow

-- One row per report per period (e.g. report 'forecast', period '2027-Q1').
-- Status moves draft -> in_review -> reviewed -> approved -> submitted, and
-- each step is limited to the roles that may take it.
create table public.submissions (
  org_id uuid not null references public.organizations(id) on delete cascade,
  report_key text not null check (char_length(report_key) <= 40),
  period text not null check (char_length(period) <= 20),
  status text not null default 'draft'
    check (status in ('draft', 'in_review', 'reviewed', 'approved', 'submitted')),
  ncdmb_reference text,
  submitted_on date,
  note text,
  history jsonb not null default '[]'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (org_id, report_key, period)
);

alter table public.submissions enable row level security;
create policy "members read submissions" on public.submissions
  for select to authenticated using (private.is_member(org_id));
revoke insert, update, delete, truncate on public.submissions from anon, authenticated;

create function public.set_submission_status(
  p_org uuid, p_report text, p_period text, p_status text,
  p_reference text default null, p_submitted_on date default null, p_note text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_allowed public.org_role[];
  v_email text := auth.jwt() ->> 'email';
begin
  v_allowed := case p_status
    when 'draft'     then array['owner', 'admin', 'approver', 'reviewer', 'preparer']
    when 'in_review' then array['owner', 'admin', 'approver', 'reviewer', 'preparer']
    when 'reviewed'  then array['owner', 'admin', 'approver', 'reviewer']
    when 'approved'  then array['owner', 'admin', 'approver']
    when 'submitted' then array['owner', 'admin', 'approver']
  end::public.org_role[];
  if v_allowed is null then raise exception 'invalid_status'; end if;
  if not private.has_role(p_org, v_allowed) then raise exception 'forbidden'; end if;
  if not private.org_has_access(p_org) then raise exception 'subscription_required'; end if;

  insert into public.submissions as s (org_id, report_key, period, status, ncdmb_reference, submitted_on, note, history, updated_by)
  values (p_org, p_report, p_period, p_status, nullif(btrim(p_reference), ''), p_submitted_on, nullif(btrim(p_note), ''),
          jsonb_build_array(jsonb_build_object('status', p_status, 'by', v_email, 'at', now(), 'note', nullif(btrim(p_note), ''))),
          auth.uid())
  on conflict (org_id, report_key, period) do update set
    status = excluded.status,
    ncdmb_reference = coalesce(excluded.ncdmb_reference, s.ncdmb_reference),
    submitted_on = coalesce(excluded.submitted_on, s.submitted_on),
    note = excluded.note,
    history = s.history || excluded.history,
    updated_by = excluded.updated_by,
    updated_at = now();

  perform private.audit(p_org, 'submission.status_changed',
    jsonb_build_object('report', p_report, 'period', p_period, 'status', p_status));
end;
$$;

-- ------------------------------------------------------------ document vault

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  category text not null default 'other',
  reference text,
  issued_on date,
  expires_on date,
  notes text,
  file_path text,
  file_name text,
  file_size bigint,
  uploaded_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index documents_org_idx on public.documents(org_id, expires_on);

alter table public.documents enable row level security;
create policy "members read documents" on public.documents
  for select to authenticated using (private.is_member(org_id));
create policy "editors add documents" on public.documents
  for insert to authenticated with check (private.can_edit_text(org_id::text));
create policy "editors update documents" on public.documents
  for update to authenticated using (private.can_edit_text(org_id::text)) with check (private.can_edit_text(org_id::text));
create policy "editors remove documents" on public.documents
  for delete to authenticated using (private.can_edit_text(org_id::text));
grant select, insert, update, delete on public.documents to authenticated;

-- Private file storage, one folder per company: "<org id>/<uuid>-<name>".
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 20971520, array[
  'application/pdf', 'image/png', 'image/jpeg', 'image/webp',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv'
])
on conflict (id) do nothing;

create policy "members read company files" on storage.objects
  for select to authenticated
  using (bucket_id = 'documents' and private.is_member_text((storage.foldername(name))[1]));
create policy "editors upload company files" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documents' and private.can_edit_text((storage.foldername(name))[1]));
create policy "editors remove company files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'documents' and private.can_edit_text((storage.foldername(name))[1]));
