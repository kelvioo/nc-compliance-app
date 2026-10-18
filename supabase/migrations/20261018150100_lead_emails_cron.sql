-- Daily follow-up run for compliance-check leads (08:30 Lagos time).
select cron.schedule(
  'nc-lead-emails',
  '30 7 * * *',
  $$
  select net.http_post(
    url := 'https://utexliymdbzevaamuhbf.supabase.co/functions/v1/lead-emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'nc_cron_secret')
    ),
    body := '{"sweep": true}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
