# PotentialDS Database Field Dictionary

This is the field-level handoff for the 17 tables introduced by the CRM,
outreach, analytics and traffic-security migrations. The existing
`public.influencers` table remains the shared creator catalogue and is not
redefined by these migrations.

## CRM

### `creator_lists`

| Field | Purpose |
| --- | --- |
| `id` | Primary list ID. |
| `user_id` | Owner used by RLS. |
| `name` | User-facing list name. |
| `description` | Optional list context. |
| `color` | Optional UI color token. |
| `is_default` | Whether this is the user's default list. |
| `created_at` | Creation time. |
| `updated_at` | Last modification time. |

### `saved_creators`

| Field | Purpose |
| --- | --- |
| `id` | Primary saved-membership ID. |
| `user_id` | Owner used by RLS. |
| `list_id` | Destination creator list. |
| `influencer_id` | Creator in `public.influencers`. |
| `source` | Search, recommendation, import or manual origin. |
| `created_at` | Time the creator was saved. |

### `creator_relationships`

| Field | Purpose |
| --- | --- |
| `id` | Primary CRM relationship ID. |
| `user_id` | Owner used by RLS. |
| `influencer_id` | Related creator. |
| `status` | Current CRM pipeline stage. |
| `contact_name` | Creator or agent contact name. |
| `contact_email` | Outreach email destination. |
| `contact_phone` | Optional phone or messaging contact. |
| `owner_name` | Internal relationship owner for future teams. |
| `quoted_price` | Latest quoted collaboration price. |
| `quoted_currency` | Three-letter quote currency. |
| `custom_tags` | User-specific CRM labels. |
| `last_contacted_at` | Most recent outreach time. |
| `next_follow_up_at` | Scheduled follow-up time. |
| `created_at` | Creation time. |
| `updated_at` | Last modification time. |

### `creator_notes`

| Field | Purpose |
| --- | --- |
| `id` | Primary note ID. |
| `user_id` | Owner used by RLS. |
| `relationship_id` | CRM relationship receiving the note. |
| `body` | Note text, up to 5,000 characters. |
| `created_at` | Creation time. |
| `updated_at` | Last edit time. |

### `creator_activities`

| Field | Purpose |
| --- | --- |
| `id` | Ordered activity ID. |
| `user_id` | Owner used by RLS. |
| `relationship_id` | Optional related CRM relationship. |
| `influencer_id` | Related creator. |
| `activity_type` | Saved, status, note, email, follow-up, import or export event. |
| `summary` | Short human-readable activity description. |
| `metadata` | Structured event details such as old/new status. |
| `occurred_at` | Business-event time. |
| `created_at` | Database insertion time. |

### `creator_import_jobs`

| Field | Purpose |
| --- | --- |
| `id` | Primary import-job ID. |
| `user_id` | Owner used by RLS. |
| `list_id` | Destination list; retained as null if the list is deleted. |
| `file_name` | Original display filename. |
| `file_type` | CSV or XLSX. |
| `status` | Import lifecycle state. |
| `total_rows` | Submitted row count. |
| `imported_rows` | Successfully saved row count. |
| `skipped_rows` | Duplicate row count. |
| `failed_rows` | Invalid or failed row count. |
| `field_mapping` | Confirmed source-to-target column mapping. |
| `error_summary` | Compact row-level errors. |
| `created_at` | Job creation time. |
| `started_at` | Processing start time. |
| `completed_at` | Processing completion time. |

### `creator_recommendation_feedback`

| Field | Purpose |
| --- | --- |
| `id` | Ordered feedback ID. |
| `user_id` | Owner used by RLS. |
| `source_influencer_id` | Creator used as the recommendation seed. |
| `recommended_influencer_id` | Creator that was recommended. |
| `action` | Shown, opened, saved or dismissed signal. |
| `algorithm_version` | Recommendation logic version for comparison. |
| `created_at` | Signal time. |

## Email Outreach

### `email_templates`

| Field | Purpose |
| --- | --- |
| `id` | Primary template ID. |
| `user_id` | Owner used by RLS. |
| `name` | User-facing template name. |
| `subject_template` | Subject with supported variables. |
| `html_template` | HTML email body. |
| `text_template` | Plain-text fallback body. |
| `variables` | Variables expected by the template. |
| `is_archived` | Hides a template without deleting history. |
| `created_at` | Creation time. |
| `updated_at` | Last modification time. |

### `email_campaigns`

| Field | Purpose |
| --- | --- |
| `id` | Primary campaign ID. |
| `user_id` | Owner used by RLS. |
| `list_id` | Optional target creator list. |
| `template_id` | Optional source template. |
| `sender_profile_id` | Sender preferences used by the task dashboard. |
| `name` | Campaign name. |
| `status` | Draft-to-completion campaign state. |
| `scheduled_at` | Planned start time. |
| `started_at` | Actual start time. |
| `completed_at` | Completion time. |
| `daily_send_limit` | Sender-reputation and plan limit. |
| `sender_name` | Sender display name snapshot for the campaign. |
| `brand_name` | Brand name snapshot for template variables. |
| `total_recipients` | Number of queued recipients generated for the task. |
| `sent_count` | Cached sent-message count. |
| `failed_count` | Cached failed-message count. |
| `opened_count` | Cached opened-message count. |
| `clicked_count` | Cached clicked-message count. |
| `next_run_at` | Next automated runner time. |
| `last_run_at` | Most recent runner time. |
| `metadata` | Compact task metadata such as skipped recipients. |
| `created_at` | Creation time. |
| `updated_at` | Last modification time. |

### `email_sending_profiles`

| Field | Purpose |
| --- | --- |
| `id` | Primary sender profile ID. |
| `user_id` | Owner used by RLS. |
| `label` | User-facing configuration name. |
| `provider` | Delivery provider, currently Resend. |
| `from_email` | Verified sender email, or server default when empty. |
| `reply_to_email` | Optional reply-to address. |
| `sender_name` | Default sender display name. |
| `brand_name` | Default brand name for template variables. |
| `daily_send_limit` | Per-user daily sending limit. |
| `is_enabled` | Enables or pauses this sender profile. |
| `is_default` | Default profile for new tasks. |
| `notes` | Optional internal note. |
| `created_at` | Creation time. |
| `updated_at` | Last modification time. |

### `email_messages`

| Field | Purpose |
| --- | --- |
| `id` | Primary rendered-message ID. |
| `user_id` | Owner used by RLS. |
| `campaign_id` | Optional parent campaign. |
| `template_id` | Source template used to render the message. |
| `relationship_id` | CRM relationship updated by engagement. |
| `influencer_id` | Recipient creator. |
| `recipient_email` | Normalized destination address. |
| `recipient_name` | Recipient display name. |
| `sender_email` | Verified provider sender address. |
| `sender_name` | Sender display name. |
| `subject` | Final rendered subject. |
| `html_body` | Final rendered and tracked HTML. |
| `text_body` | Final plain-text fallback. |
| `provider` | Delivery provider name. |
| `provider_message_id` | Provider ID used to match webhooks. |
| `status` | Current monotonic delivery/engagement state. |
| `tracking_token` | Opaque open and unsubscribe token. |
| `sent_at` | Provider acceptance time. |
| `delivered_at` | Delivery time reported by provider. |
| `first_opened_at` | First observed open time. |
| `last_opened_at` | Most recent observed open time. |
| `first_clicked_at` | First observed tracked click. |
| `replied_at` | Reply time from future mailbox sync/manual entry. |
| `bounced_at` | Bounce time. |
| `open_count` | Total pixel/provider open events. |
| `click_count` | Total tracked/provider click events. |
| `created_at` | Message creation time. |
| `updated_at` | Last state change time. |

### `email_events`

| Field | Purpose |
| --- | --- |
| `id` | Ordered append-only event ID. |
| `message_id` | Related rendered message. |
| `user_id` | Owner used by RLS. |
| `event_type` | Delivery or engagement event. |
| `provider` | Provider that emitted the event. |
| `provider_event_id` | Deduplication ID from the provider. |
| `event_source` | Provider, pixel, link, mailbox or manual source. |
| `is_machine_generated` | Marks likely proxy/scanner activity. |
| `ip_hash` | Salted request-IP hash; never raw IP. |
| `user_agent_hash` | Salted user-agent hash; never raw value. |
| `metadata` | Restricted non-sensitive event dimensions. |
| `occurred_at` | Provider or tracking-event time. |
| `created_at` | Database insertion time. |

### `email_links`

| Field | Purpose |
| --- | --- |
| `id` | Opaque tracked-link ID. |
| `message_id` | Parent email message. |
| `user_id` | Owner used by RLS. |
| `target_url` | Validated original HTTP(S) destination. |
| `click_count` | Total observed clicks. |
| `first_clicked_at` | First click time. |
| `last_clicked_at` | Most recent click time. |
| `created_at` | Link creation time. |

### `email_unsubscribes`

| Field | Purpose |
| --- | --- |
| `id` | Primary suppression ID. |
| `user_id` | Sender account owning the suppression. |
| `email` | Normalized suppressed recipient address. |
| `reason` | Recipient, complaint or operator reason. |
| `source_message_id` | Message that produced the unsubscribe. |
| `created_at` | Suppression time. |

## Analytics And Traffic Security

### `analytics_events`

| Field | Purpose |
| --- | --- |
| `id` | Ordered analytics event ID. |
| `user_id` | Optional authenticated user. |
| `anonymous_id_hash` | Hashed visitor ID. |
| `session_id` | Browser-session ID. |
| `event_name` | Page or product action. |
| `entry_path` | First route of the session. |
| `page_path` | Route where the event occurred. |
| `referrer_domain` | Referrer host only. |
| `traffic_source` | Direct, organic, social, referral, paid, partner or campaign. |
| `utm_source` | Campaign source. |
| `utm_medium` | Campaign medium. |
| `utm_campaign` | Campaign name. |
| `device_type` | Coarse desktop/mobile class. |
| `country_code` | Trusted two-letter edge country code. |
| `metadata` | Restricted product-event dimensions. |
| `occurred_at` | Event time. |
| `created_at` | Database insertion time. |

### `security_events`

| Field | Purpose |
| --- | --- |
| `id` | Ordered finding ID. |
| `request_id` | Correlation ID for the suspicious request. |
| `user_id` | Optional authenticated user. |
| `ip_hash` | Salted IP hash. |
| `fingerprint_hash` | Optional salted device fingerprint hash. |
| `route` | Targeted application route. |
| `method` | HTTP method or logical action. |
| `status_code` | Response status when available. |
| `user_agent_class` | Mobile, desktop, bot or automation class. |
| `event_type` | Rate, enumeration, export, auth, bot or block finding. |
| `risk_score` | Operator triage score from 0 to 100. |
| `reasons` | Machine-readable reasons behind the score. |
| `request_count` | Requests seen in the active window. |
| `metadata` | Restricted non-sensitive security dimensions. |
| `occurred_at` | Finding time. |
| `created_at` | Database insertion time. |

### `security_rate_limits`

| Field | Purpose |
| --- | --- |
| `bucket_key_hash` | Hashed identity forming the counter key. |
| `route_group` | Counter namespace such as analytics or monitored routes. |
| `window_started_at` | Start of the one-minute window. |
| `request_count` | Atomic request count. |
| `blocked_count` | Reserved count of blocked requests. |
| `updated_at` | Last counter update time. |

### `security_allowlist`

| Field | Purpose |
| --- | --- |
| `id` | Primary allowlist ID. |
| `match_type` | IP hash, fingerprint hash or user ID. |
| `match_value` | Hashed or textual value to allow. |
| `reason` | Operator justification. |
| `expires_at` | Optional automatic expiry. |
| `created_at` | Allowlist creation time. |

## Ownership And Write Paths

Browser clients may write only user-owned CRM records and email templates or
campaigns allowed by RLS. Email messages, events, tracked links, suppression
records, analytics and security telemetry are written through trusted server
routes using the Supabase service role. This prevents forged opens, clicks,
sends and traffic findings.
