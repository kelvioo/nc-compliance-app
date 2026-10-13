-- Write paths for the SaaS foundation tables. Every function checks the
-- caller's role itself; clients have no direct write access to the tables.

-- ------------------------------------------------------------- functions

create function public.create_organization(
  p_name text, p_org_type text default 'operator', p_ncdmb_reg_no text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  insert into public.organizations (name, org_type, ncdmb_reg_no, created_by, billing_email)
  values (btrim(p_name), coalesce(p_org_type, 'operator'), nullif(btrim(p_ncdmb_reg_no), ''),
          v_uid, auth.jwt() ->> 'email')
  returning id into v_org;

  insert into public.memberships (org_id, user_id, role) values (v_org, v_uid, 'owner');

  insert into public.workspaces (org_id, data, updated_by) values (
    v_org,
    jsonb_build_object(
      'name', btrim(p_name), 'target', 70,
      'entries', '[]'::jsonb, 'expatPositions', '[]'::jsonb, 'carbonEntries', '[]'::jsonb,
      'exchangeRate', 1600, 'createdAt', now()
    ),
    v_uid
  );

  perform private.audit(v_org, 'organization.created', jsonb_build_object('name', btrim(p_name)));
  return v_org;
end;
$$;

create function public.update_organization(
  p_org uuid, p_name text, p_org_type text, p_ncdmb_reg_no text, p_billing_email text
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.has_role(p_org, array['owner', 'admin']::public.org_role[]) then
    raise exception 'forbidden';
  end if;
  update public.organizations set
    name = btrim(p_name),
    org_type = p_org_type,
    ncdmb_reg_no = nullif(btrim(p_ncdmb_reg_no), ''),
    billing_email = nullif(btrim(p_billing_email), '')
  where id = p_org;
  perform private.audit(p_org, 'organization.updated');
end;
$$;

-- Saves the whole workspace document. Fails with 'version_conflict' when
-- someone else saved since the caller loaded, instead of overwriting them.
create function public.save_workspace(p_org uuid, p_data jsonb, p_expected_version integer)
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_old jsonb;
  v_new_version integer;
  v_changed text[];
begin
  if not private.has_role(p_org, array['owner', 'admin', 'approver', 'reviewer', 'preparer']::public.org_role[]) then
    raise exception 'forbidden';
  end if;
  if not private.org_has_access(p_org) then
    raise exception 'subscription_required';
  end if;
  if jsonb_typeof(p_data) <> 'object' then
    raise exception 'invalid_data';
  end if;

  select data into v_old from public.workspaces where org_id = p_org for update;

  update public.workspaces
     set data = p_data, version = version + 1, updated_at = now(), updated_by = auth.uid()
   where org_id = p_org and version = p_expected_version
  returning version into v_new_version;

  if v_new_version is null then
    raise exception 'version_conflict';
  end if;

  select coalesce(array_agg(k order by k), '{}') into v_changed
    from (
      select key as k from jsonb_each(p_data)
      union
      select key from jsonb_each(coalesce(v_old, '{}'::jsonb))
    ) keys
   where (p_data -> k) is distinct from (v_old -> k);

  perform private.audit(p_org, 'workspace.saved',
    jsonb_build_object('version', v_new_version, 'sections', to_jsonb(v_changed)));
  return v_new_version;
end;
$$;

create function public.list_members(p_org uuid)
returns table (user_id uuid, email text, role public.org_role, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_member(p_org) then raise exception 'forbidden'; end if;
  return query
    select m.user_id, u.email::text, m.role, m.created_at
      from public.memberships m
      join auth.users u on u.id = m.user_id
     where m.org_id = p_org
     order by m.created_at;
end;
$$;

create function public.create_invitation(p_org uuid, p_email text, p_role public.org_role)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_limit integer;
  v_used integer;
  v_token text;
  v_email text := lower(btrim(p_email));
begin
  if not private.has_role(p_org, array['owner', 'admin']::public.org_role[]) then
    raise exception 'forbidden';
  end if;
  if p_role = 'owner' then raise exception 'invalid_role'; end if;
  if p_role = 'admin' and not private.has_role(p_org, array['owner']::public.org_role[]) then
    raise exception 'forbidden';
  end if;
  if not private.org_has_access(p_org) then raise exception 'subscription_required'; end if;
  if exists (
    select 1 from public.memberships m join auth.users u on u.id = m.user_id
     where m.org_id = p_org and lower(u.email) = v_email
  ) then
    raise exception 'already_member';
  end if;

  select p.seat_limit into v_limit
    from public.organizations o join public.plans p on p.id = o.plan where o.id = p_org;
  select (select count(*) from public.memberships where org_id = p_org)
       + (select count(*) from public.invitations i
           where i.org_id = p_org and i.accepted_at is null and i.expires_at > now()
             and lower(i.email) <> v_email)
    into v_used;
  if v_limit is not null and v_used >= v_limit then
    raise exception 'seat_limit_reached';
  end if;

  -- Re-inviting the same address refreshes the pending invite (new link).
  insert into public.invitations (org_id, email, role, invited_by)
  values (p_org, v_email, p_role, auth.uid())
  on conflict (org_id, lower(email)) where accepted_at is null do update
    set role = excluded.role,
        token = excluded.token,
        invited_by = excluded.invited_by,
        created_at = now(),
        expires_at = now() + interval '14 days'
  returning token into v_token;

  perform private.audit(p_org, 'member.invited', jsonb_build_object('email', v_email, 'role', p_role));
  return v_token;
end;
$$;

-- Lets the invite page show who is inviting you before you sign in.
create function public.get_invitation(p_token text)
returns table (org_name text, email text, role public.org_role, expired boolean, accepted boolean)
language sql stable security definer set search_path = '' as $$
  select o.name, i.email, i.role, i.expires_at <= now(), i.accepted_at is not null
    from public.invitations i join public.organizations o on o.id = i.org_id
   where i.token = p_token;
$$;

create function public.accept_invitation(p_token text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_inv public.invitations;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;

  select * into v_inv from public.invitations where token = p_token for update;
  if v_inv.id is null then raise exception 'invitation_not_found'; end if;
  if v_inv.accepted_at is not null then raise exception 'invitation_used'; end if;
  if v_inv.expires_at <= now() then raise exception 'invitation_expired'; end if;
  if lower(v_inv.email) <> lower(coalesce(auth.jwt() ->> 'email', '')) then
    raise exception 'invitation_email_mismatch';
  end if;

  insert into public.memberships (org_id, user_id, role)
  values (v_inv.org_id, auth.uid(), v_inv.role)
  on conflict (org_id, user_id) do nothing;

  update public.invitations set accepted_at = now() where id = v_inv.id;
  perform private.audit(v_inv.org_id, 'member.joined', jsonb_build_object('email', v_inv.email, 'role', v_inv.role));
  return v_inv.org_id;
end;
$$;

create function public.set_member_role(p_org uuid, p_user uuid, p_role public.org_role)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_current public.org_role;
  v_is_owner boolean := private.has_role(p_org, array['owner']::public.org_role[]);
begin
  if not private.has_role(p_org, array['owner', 'admin']::public.org_role[]) then
    raise exception 'forbidden';
  end if;
  select role into v_current from public.memberships where org_id = p_org and user_id = p_user;
  if v_current is null then raise exception 'not_found'; end if;
  if v_current = 'owner' or p_role = 'owner' then raise exception 'forbidden'; end if;
  if (v_current = 'admin' or p_role = 'admin') and not v_is_owner then
    raise exception 'forbidden';
  end if;

  update public.memberships set role = p_role where org_id = p_org and user_id = p_user;
  perform private.audit(p_org, 'member.role_changed', jsonb_build_object('user_id', p_user, 'role', p_role));
end;
$$;

revoke execute on function
  public.create_organization(text, text, text),
  public.update_organization(uuid, text, text, text, text),
  public.save_workspace(uuid, jsonb, integer),
  public.list_members(uuid),
  public.create_invitation(uuid, text, public.org_role),
  public.get_invitation(text),
  public.accept_invitation(text),
  public.set_member_role(uuid, uuid, public.org_role)
  from public, anon;
grant execute on function
  public.create_organization(text, text, text),
  public.update_organization(uuid, text, text, text, text),
  public.save_workspace(uuid, jsonb, integer),
  public.list_members(uuid),
  public.create_invitation(uuid, text, public.org_role),
  public.get_invitation(text),
  public.accept_invitation(text),
  public.set_member_role(uuid, uuid, public.org_role)
  to authenticated;
grant execute on function public.get_invitation(text) to anon;

-- ----------------------------------------------- retire the PIN-based login

-- The old company-name + PIN functions were callable by anyone on the
-- internet. The new app no longer uses them; the table is empty.
revoke execute on function public.nc_login_or_create(text, text, text) from public, anon, authenticated;
revoke execute on function public.nc_save(text, text, jsonb) from public, anon, authenticated;
