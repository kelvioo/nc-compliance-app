-- Removing a teammate (or leaving a company). Kept in its own migration
-- because it contains a DELETE, which needs explicit approval to apply.

create function public.remove_member(p_org uuid, p_user uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_current public.org_role;
begin
  select role into v_current from public.memberships where org_id = p_org and user_id = p_user;
  if v_current is null then raise exception 'not_found'; end if;
  if v_current = 'owner' then raise exception 'forbidden'; end if;

  if p_user <> auth.uid() then
    if not private.has_role(p_org, array['owner', 'admin']::public.org_role[]) then
      raise exception 'forbidden';
    end if;
    if v_current = 'admin' and not private.has_role(p_org, array['owner']::public.org_role[]) then
      raise exception 'forbidden';
    end if;
  end if;

  delete from public.memberships where org_id = p_org and user_id = p_user;
  perform private.audit(p_org, 'member.removed', jsonb_build_object('user_id', p_user));
end;
$$;

revoke execute on function public.remove_member(uuid, uuid) from public, anon;
grant execute on function public.remove_member(uuid, uuid) to authenticated;
