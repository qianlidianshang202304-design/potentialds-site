# PotentialDS

PotentialDS is an affordable creator-data and outreach SaaS. Its mission is to
break information asymmetry and make practical software accessible to
individual operators and small teams.

## Getting started

Copy `.env.example` to `.env.local`, fill in the Supabase browser variables,
then run:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

If the local environment does not allow a listening port, build the app and
generate self-contained preview files instead:

```bash
npx next build --webpack
npm run preview:offline
```

The generated homepage, pricing page and privacy page are written to the
adjacent `potentialds-preview` directory and do not require a server.

## Database

Apply the migrations in `supabase/migrations` in filename order:

1. Creator lists, relationships, notes, imports and recommendations.
2. Email templates, messages, tracked links and engagement events.
3. Product analytics and abuse-risk monitoring.
4. Email task dashboard sender settings and campaign counters.

The database overview is [docs/DATABASE.md](docs/DATABASE.md), with the complete
field dictionary in [docs/DATABASE-FIELDS.md](docs/DATABASE-FIELDS.md).
The product workflow and roadmap are in
[docs/PRODUCT-ROADMAP.md](docs/PRODUCT-ROADMAP.md).
The production release sequence is in
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

After applying the migrations, run `supabase/verify.sql` in the SQL editor. All
checks must return `ok = true`. With the service role configured locally, the
same table/function smoke test is available as:

```bash
npm run verify:schema
```

## Server environment

These values must only exist in the server/deployment environment:

- `SUPABASE_SERVICE_ROLE_KEY`
- `TELEMETRY_HASH_SALT`
- `RESEND_API_KEY`
- `RESEND_WEBHOOK_SECRET` (the Resend signing secret beginning with `whsec_`)
- `CRON_SECRET`

Never prefix these values with `NEXT_PUBLIC_`.

## Verification

```bash
npx next build --webpack
npm run test:core
npx eslint app/admin app/api app/creators app/crm app/email app/my-creators \
  components/TrafficTracker.tsx components/DatabaseSetupNotice.tsx \
  lib/crm-types.ts lib/request-security.ts lib/supabase-server.ts
```

---

deploy-20260815v2: redeploy with fresh Git webhook connection
