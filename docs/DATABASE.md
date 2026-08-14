# PotentialDS Database Guide

This document is the handoff reference for the CRM, email outreach, product
analytics and abuse-monitoring database.

For every table and field, see
[DATABASE-FIELDS.md](DATABASE-FIELDS.md).

## Design rules

- `influencers` remains the shared creator catalogue.
- User-owned CRM data always carries `user_id` and is protected by RLS.
- Email delivery and telemetry writes happen only through trusted server routes.
- Never store raw IP addresses or complete user-agent strings. Store salted hashes.
- Apply migrations in numerical order.

## CRM tables

### `creator_lists`

Named creator collections such as "US beauty", "June outreach" or "Partners".

| Field | Purpose |
| --- | --- |
| `id` | List ID used by saved creators and email campaigns. |
| `user_id` | Owner; basis of RLS isolation. |
| `name` | User-facing list name. |
| `description` | Optional list instructions or context. |
| `color` | Optional UI color token. |
| `is_default` | Marks the user's default inbox/list. |

### `saved_creators`

Many-to-many membership between lists and the existing `influencers` catalogue.
`source` records whether the save came from search, recommendation, import or
manual entry.

### `creator_relationships`

One CRM relationship per user and influencer.

Important fields:

- `status`: CRM pipeline column.
- `contact_email`, `contact_phone`: outreach destination.
- `owner_name`: future team assignee without requiring team accounts in v1.
- `quoted_price`, `quoted_currency`: negotiation value.
- `last_contacted_at`, `next_follow_up_at`: follow-up scheduling.
- `custom_tags`: user-specific CRM labels.

Pipeline values:

`to_contact`, `sent`, `opened`, `clicked`, `replied`, `negotiating`,
`partnered`, `rejected`, `paused`.

### `creator_notes`

Append-only user notes attached to a CRM relationship. Editing is supported, but
the application should prefer adding new notes when history matters.

### `creator_activities`

Timeline events used by creator detail and CRM history views. `metadata` holds
event-specific information such as old/new status or export row count.

### `creator_import_jobs`

Tracks CSV/XLSX validation and import progress. `field_mapping` stores the
confirmed source-column mapping; `error_summary` stores compact row errors.
Uploaded files should live in a private Storage bucket, not in this table.

### `creator_recommendation_feedback`

Measures whether rule-based similar-creator recommendations are useful. This is
also the training/evaluation signal for a future vector recommendation system.

## Email tables

### `email_templates`

Reusable subject and body templates. Supported variables should initially be:

`creator_name`, `username`, `platform`, `sender_name`, `brand_name`.

### `email_campaigns`

Groups a template, creator list and send schedule. `daily_send_limit` protects
sender reputation and provides a product-plan enforcement point.

The task dashboard stores sender profile, recipient totals and cached delivery
counters on each campaign so the UI can show progress without scanning the full
event history.

### `email_sending_profiles`

User-facing sender preferences for the task dashboard, such as sender name,
brand name, daily limit and enabled/paused state. Provider secrets stay in the
server deployment environment and are not stored in this table.

### `email_messages`

Immutable rendered email content and its current delivery state. Every message
has a unique `tracking_token` used by:

- `GET /api/email/open/[token]`
- `GET /api/email/click/[link_id]`

The open endpoint returns a transparent 1x1 GIF after recording an `opened`
event. Open rate must be labeled **estimated open rate** because Apple Mail
privacy protection, image proxies, security scanners and disabled images affect
accuracy.

Verified human opens and clicks advance eligible CRM relationships to `opened`
and `clicked`. The send route also enforces `OUTREACH_DAILY_LIMIT` per user
(50 by default) before calling the mail provider.

Message engagement is monotonic: a delayed `delivered` or `opened` webhook
cannot move a message backwards from `clicked` or `replied`. Bounce, complaint,
unsubscribe, failure and cancellation remain terminal states.

Tracked links are stored before provider delivery. If any link cannot be
created, the message is marked failed and is not sent with unresolved tracking
placeholders.

### `email_events`

Append-only provider and tracking events: sent, delivered, opened, clicked,
replied, bounced, complained, unsubscribed and failed.

`is_machine_generated` lets the reporting layer discount probable proxy/scanner
opens. `ip_hash` and `user_agent_hash` support deduplication without retaining
raw identifiers.

Engagement summaries count distinct messages from append-only events and exclude
events marked machine-generated, rather than inferring engagement only from the
message's latest status.

### `email_links`

Stores the original destination for every tracked link. Public click routes use
the opaque link ID, fetch the destination server-side, record the event and then
redirect. This prevents an arbitrary open redirect parameter from being trusted.

### `email_unsubscribes`

Per-user suppression list. The send service must check it before every send.
Browser `GET` requests show a confirmation page so link scanners cannot silently
unsubscribe a recipient. Standards-based one-click unsubscribe uses `POST` with
the `List-Unsubscribe-Post` header.

## Product analytics

### `analytics_events`

Tracks entry sources and product conversion events. Recommended event names:

- `page_view`
- `signup_started`, `signup_completed`
- `creator_search`, `creator_opened`
- `creator_saved`, `list_created`
- `csv_exported`, `import_completed`
- `email_sent`, `email_opened`, `email_clicked`, `email_replied`
- `pricing_viewed`, `upgrade_contact_clicked`

Entry monitoring dimensions:

- `entry_path`: first page of the session.
- `referrer_domain`: referring domain only, not full URL.
- `traffic_source`: direct, organic, social, referral, paid, partner.
- `utm_*`: explicit campaign attribution.
- `device_type`, `country_code`: coarse product segmentation.

Paid and partner traffic are derived from standard `utm_medium` values. Country
is read only from a trusted edge header and stored as a two-letter code.

Primary product funnel:

`landing -> signup -> search -> creator detail -> save -> email send -> reply`

## Abuse and crawler monitoring

### `security_events`

Stores compact risk findings rather than every raw request. Relevant signals:

- High request frequency by hashed IP/fingerprint.
- Sequential creator enumeration.
- Repeated searches with no normal UI navigation.
- Bulk export or download attempts.
- Login/username probing.
- Headless or suspicious user-agent classes.
- Requests already blocked by middleware or provider firewall.

`risk_score` is 0-100. Initial handling:

- 0-39: observe only.
- 40-69: stricter rate limit and CAPTCHA challenge.
- 70-100: temporary block and operator review.

`proxy.ts` monitors creator search, creator detail, CRM and API routes before
page JavaScript runs. This captures known bots, automation user agents and
high-frequency clients even when they do not execute browser analytics.

### `security_rate_limits`

Short-lived distributed counters by route group and hashed identity. The
service-only `increment_security_rate_limit()` function updates a one-minute
bucket atomically so crawler detection works across serverless instances.

### `security_allowlist`

Prevents trusted staff, uptime checks and approved integrations from being
flagged. Entries should expire unless permanently justified.

## Privacy and retention

- Analytics retention: 90 days.
- Security-event retention: 30 days.
- Rate-limit buckets: 2 days.
- Hash IP/fingerprint values with a server-only rotating salt.
- Do not put email bodies, raw IPs or access tokens in analytics `metadata`.
- Provider webhook metadata stores only the provider event type, not recipient
  addresses, subjects or message bodies.
- Update the privacy policy before enabling email pixels and behavioral tracking.

## Implementation order

1. Run `001_creator_crm.sql`.
2. Build creator detail, lists, notes and CRM pipeline.
3. Run `002_email_outreach.sql`.
4. Add trusted send/webhook/open/click routes and suppression checks.
5. Run `003_traffic_monitoring.sql`.
6. Add server instrumentation and a private admin dashboard.
7. Schedule `purge_expired_telemetry()` daily using Supabase Cron or a trusted job.

## Verification

Run `supabase/verify.sql` in the Supabase SQL editor after all three migrations.
It checks the 17 tables, application-critical fields, RLS state, user-data
policies and required functions. Every returned row must have `ok = true`.

For deployment smoke testing, configure the service role locally and run
`npm run verify:schema`. This confirms that each table is reachable and that
the distributed rate-limit function executes successfully.

## Operational security

- `ADMIN_EMAILS` must contain at least one approved login; an empty value denies
  access to `/admin/analytics`.
- Resend webhooks are accepted only when the `svix-id`, `svix-timestamp` and
  `svix-signature` headers validate against `RESEND_WEBHOOK_SECRET`.
