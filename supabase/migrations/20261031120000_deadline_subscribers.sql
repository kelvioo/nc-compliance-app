-- Free NCDMB deadline reminders from the public deadlines page. Visitors can
-- only subscribe (through subscribe_deadlines); a welcome email goes out
-- straight away (the trigger calls lead-emails) and the daily lead-emails run
-- sends a reminder 14 and 3 days before each deadline. Every email carries an
-- unsubscribe link backed by unsubscribe_token.

create table public.deadline_subscribers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email text not null,
  company text,
  welcome_sent_at timestamptz,
  reminders_sent text[] not null default '{}',
  unsubscribed_at timestamptz,
  unsubscribe_token uuid not null default gen_random_uuid()
);
create unique index deadline_subscribers_email_idx on public.deadline_subscribers (lower(email));
create unique index deadline_subscribers_token_idx on public.deadline_subscribers (unsubscribe_token);
create index deadline_subscribers_created_idx on public.deadline_subscribers (created_at desc);

alter table public.deadline_subscribers enable row level security;
revoke all on public.deadline_subscribers from anon, authenticated;

create function public.subscribe_deadlines(p_email text, p_company text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 200
     or length(coalesce(p_company, '')) > 160 then
    raise exception 'invalid_subscription';
  end if;
  -- Someone who unsubscribed and signs up again is simply switched back on.
  update public.deadline_subscribers set unsubscribed_at = null
    where lower(email) = v_email and unsubscribed_at is not null;
  -- Abuse guard: an overall hourly cap so the form can't be used to send mass email.
  if (select count(*) from public.deadline_subscribers where created_at > now() - interval '1 hour') >= 60 then
    return;
  end if;
  insert into public.deadline_subscribers (email, company)
  values (v_email, nullif(btrim(coalesce(p_company, '')), ''))
  on conflict ((lower(email))) do nothing;
end;
$$;

create function public.admin_deadline_subscribers()
returns setof public.deadline_subscribers
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_platform_admin() then raise exception 'forbidden'; end if;
  return query select * from public.deadline_subscribers order by created_at desc limit 1000;
end;
$$;

revoke execute on function public.subscribe_deadlines(text, text) from public;
grant execute on function public.subscribe_deadlines(text, text) to anon, authenticated;
revoke execute on function public.admin_deadline_subscribers() from public, anon;
grant execute on function public.admin_deadline_subscribers() to authenticated;

create function private.queue_deadline_welcome()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform net.http_post(
    url := 'https://utexliymdbzevaamuhbf.supabase.co/functions/v1/lead-emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'nc_cron_secret')
    ),
    body := jsonb_build_object('subscriber_id', new.id),
    timeout_milliseconds := 20000
  );
  return new;
end;
$$;

create trigger deadline_subscribers_welcome after insert on public.deadline_subscribers
  for each row execute function private.queue_deadline_welcome();
