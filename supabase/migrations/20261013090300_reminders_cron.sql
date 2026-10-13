-- Daily reminder job: pg_cron calls the deadline-reminders edge function at
-- 07:00 Lagos time (06:00 UTC). The function is public (no JWT), so it
-- requires a random secret that lives only in Supabase Vault.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

select vault.create_secret(
  encode(extensions.gen_random_bytes(32), 'hex'),
  'nc_cron_secret',
  'Shared secret the deadline-reminders edge function expects from pg_cron'
)
where not exists (select 1 from vault.secrets where name = 'nc_cron_secret');

create function public.verify_cron_secret(p_secret text)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(p_secret, '') <> '' and exists (
    select 1 from vault.decrypted_secrets where name = 'nc_cron_secret' and decrypted_secret = p_secret
  );
$$;

-- Who receives a company's reminders: owners, admins and approvers, plus the
-- billing email.
create function public.org_notification_emails(p_org uuid)
returns table (email text) language sql stable security definer set search_path = '' as $$
  select u.email::text
    from public.memberships m join auth.users u on u.id = m.user_id
   where m.org_id = p_org and m.role in ('owner', 'admin', 'approver') and u.email is not null
  union
  select o.billing_email from public.organizations o
   where o.id = p_org and o.billing_email is not null;
$$;

revoke execute on function public.verify_cron_secret(text) from public, anon, authenticated;
revoke execute on function public.org_notification_emails(uuid) from public, anon, authenticated;
grant execute on function public.verify_cron_secret(text) to service_role;
grant execute on function public.org_notification_emails(uuid) to service_role;

select cron.schedule(
  'nc-deadline-reminders',
  '0 6 * * *',
  $$
  select net.http_post(
    url := 'https://utexliymdbzevaamuhbf.supabase.co/functions/v1/deadline-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'nc_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
