-- DEC-113: Supabase Cron là scheduler chính cho snapshot Pancake.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.unschedule(jobid)
from cron.job
where jobname in ('pancake-sync-09-vn', 'pancake-sync-17-vn');

select cron.schedule(
  'pancake-sync-09-vn',
  '0 2 * * *',
  $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'bikeforce_project_url') || '/functions/v1/pancake-sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'bikeforce_service_role_key')
      ),
      body := jsonb_build_object('scheduled_at', now()),
      timeout_milliseconds := 55000
    ) as request_id;
  $job$
);

select cron.schedule(
  'pancake-sync-17-vn',
  '0 10 * * *',
  $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'bikeforce_project_url') || '/functions/v1/pancake-sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'bikeforce_service_role_key')
      ),
      body := jsonb_build_object('scheduled_at', now()),
      timeout_milliseconds := 55000
    ) as request_id;
  $job$
);
