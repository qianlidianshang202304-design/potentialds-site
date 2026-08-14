# PotentialDS Deployment Checklist

## 1. Database

In the Supabase SQL editor, run these files in order:

1. `supabase/migrations/202606070001_creator_crm.sql`
2. `supabase/migrations/202606070002_email_outreach.sql`
3. `supabase/migrations/202606070003_traffic_monitoring.sql`
4. `supabase/migrations/202608140001_email_tasks.sql`
5. `supabase/verify.sql`

Do not continue until every verification row reports `ok = true`.

## 2. Deployment environment

Configure the variables listed in `.env.example`. The following values are
server-only and must never use a `NEXT_PUBLIC_` prefix:

- `SUPABASE_SERVICE_ROLE_KEY`
- `TELEMETRY_HASH_SALT`
- `ADMIN_EMAILS`
- `RESEND_API_KEY`
- `OUTREACH_FROM_EMAIL`
- `OUTREACH_DAILY_LIMIT`
- `RESEND_WEBHOOK_SECRET`
- `CRON_SECRET`

Set `NEXT_PUBLIC_APP_URL` to the canonical HTTPS production origin.

## 3. Email provider

1. Verify the sending domain in Resend.
2. Set `OUTREACH_FROM_EMAIL` to an address on that domain.
3. Create a webhook for `/api/email/webhook`.
4. Subscribe to sent, delivered, opened, clicked, bounced and complained events.
5. Store the webhook signing secret as `RESEND_WEBHOOK_SECRET`.

## 4. Retention

Schedule `public.purge_expired_telemetry()` once per day using Supabase Cron or
another trusted scheduler.

## 5. Email task runner

`vercel.json` schedules `/api/email/tasks/run` every 15 minutes. Set
`CRON_SECRET` in Vercel so the route can verify automated task-run requests.
Users can also send one batch manually from `/email/tasks`.

## 6. Release checks

```bash
npm run test:core
npx next build --webpack
npm run verify:schema
```

Then verify these production workflows:

1. Register/login and search for a creator.
2. Open a creator, create a list, save it and add a note.
3. Move the creator through every CRM state, including rejected and paused.
4. Import a CSV/XLSX containing a duplicate row and confirm skipped counts.
5. Export a creator list.
6. Create a template and send to a controlled inbox.
7. Create a task from `/email/tasks`, pause/resume it and send one batch.
8. Confirm estimated open, click and unsubscribe events.
9. Confirm `/admin/analytics` shows entry sources and a test bot-risk event.
