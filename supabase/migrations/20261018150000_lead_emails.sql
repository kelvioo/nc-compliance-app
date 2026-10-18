-- Automatic follow-up for compliance-check leads: the results email goes out
-- as soon as a lead is saved (a trigger calls the lead-emails edge function),
-- and the daily job sends two reminders. Every email carries an unsubscribe
-- link backed by unsubscribe_token.

alter table public.leads
  add column result jsonb not null default '{}'::jsonb,
  add column results_sent_at timestamptz,
  add column nurture_1_at timestamptz,
  add column nurture_2_at timestamptz,
  add column unsubscribed_at timestamptz,
  add column unsubscribe_token uuid not null default gen_random_uuid();
create unique index leads_unsubscribe_token_idx on public.leads (unsubscribe_token);

-- p_answers carries { answers, result }: the visitor's answers plus the
-- computed score summary used in the emails.
create or replace function public.submit_lead(
  p_name text, p_company text, p_email text, p_phone text,
  p_org_type text, p_score integer, p_answers jsonb
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_payload jsonb := coalesce(p_answers, '{}'::jsonb);
begin
  if length(btrim(coalesce(p_name, ''))) not between 1 and 120
     or length(btrim(coalesce(p_company, ''))) not between 1 and 160
     or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 200
     or length(coalesce(p_phone, '')) > 40
     or coalesce(p_score, 0) not between 0 and 100
     or pg_column_size(v_payload) > 12000 then
    raise exception 'invalid_lead';
  end if;
  -- Abuse guards: a few submissions per address per day, and an overall
  -- hourly cap so the form can't be used to send mass email.
  if (select count(*) from public.leads where lower(email) = v_email and created_at > now() - interval '1 day') >= 3
     or (select count(*) from public.leads where created_at > now() - interval '1 hour') >= 60 then
    return;
  end if;
  insert into public.leads (name, company, email, phone, org_type, score, answers, result)
  values (btrim(p_name), btrim(p_company), v_email, nullif(btrim(coalesce(p_phone, '')), ''),
          left(p_org_type, 40), p_score,
          coalesce(v_payload -> 'answers', v_payload), coalesce(v_payload -> 'result', '{}'::jsonb));
end;
$$;

create function private.queue_lead_email()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform net.http_post(
    url := 'https://utexliymdbzevaamuhbf.supabase.co/functions/v1/lead-emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'nc_cron_secret')
    ),
    body := jsonb_build_object('lead_id', new.id),
    timeout_milliseconds := 20000
  );
  return new;
end;
$$;

create trigger leads_send_results after insert on public.leads
  for each row execute function private.queue_lead_email();
