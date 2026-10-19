-- Enquiries from the public contact page. Visitors can only submit (through
-- submit_contact_message); the product owner reads them in the admin console
-- and is emailed each one straight away (the trigger calls lead-emails).

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  company text,
  email text not null,
  phone text,
  topic text not null default 'general',
  message text not null,
  notified_at timestamptz
);
create index contact_messages_created_idx on public.contact_messages (created_at desc);

alter table public.contact_messages enable row level security;
revoke all on public.contact_messages from anon, authenticated;

create function public.submit_contact_message(
  p_name text, p_company text, p_email text, p_phone text, p_topic text, p_message text
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
begin
  if length(btrim(coalesce(p_name, ''))) not between 1 and 120
     or length(coalesce(p_company, '')) > 160
     or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 200
     or length(coalesce(p_phone, '')) > 40
     or coalesce(p_topic, '') not in ('general', 'demo', 'pricing', 'invoice', 'support', 'partnership')
     or length(btrim(coalesce(p_message, ''))) not between 5 and 4000 then
    raise exception 'invalid_message';
  end if;
  -- Abuse guards, like the compliance-check form.
  if (select count(*) from public.contact_messages where lower(email) = v_email and created_at > now() - interval '1 day') >= 5
     or (select count(*) from public.contact_messages where created_at > now() - interval '1 hour') >= 30 then
    return;
  end if;
  insert into public.contact_messages (name, company, email, phone, topic, message)
  values (btrim(p_name), nullif(btrim(coalesce(p_company, '')), ''), v_email,
          nullif(btrim(coalesce(p_phone, '')), ''), p_topic, btrim(p_message));
end;
$$;

create function public.admin_contact_messages()
returns setof public.contact_messages
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_platform_admin() then raise exception 'forbidden'; end if;
  return query select * from public.contact_messages order by created_at desc limit 500;
end;
$$;

revoke execute on function public.submit_contact_message(text, text, text, text, text, text) from public;
grant execute on function public.submit_contact_message(text, text, text, text, text, text) to anon, authenticated;
revoke execute on function public.admin_contact_messages() from public, anon;
grant execute on function public.admin_contact_messages() to authenticated;

create function private.queue_contact_email()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform net.http_post(
    url := 'https://utexliymdbzevaamuhbf.supabase.co/functions/v1/lead-emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'nc_cron_secret')
    ),
    body := jsonb_build_object('contact_id', new.id),
    timeout_milliseconds := 20000
  );
  return new;
end;
$$;

create trigger contact_messages_notify after insert on public.contact_messages
  for each row execute function private.queue_contact_email();
