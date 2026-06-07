# PotentialDS Product Roadmap

## Product mission

Break information asymmetry and build SaaS tools that individuals and small
teams can afford.

## Current MVP workflow

1. Search creators by platform, followers, region or keyword.
2. Open a creator detail page.
3. Save the creator to one or more lists.
4. Record contact email, pipeline status, notes and next follow-up.
5. Manage relationships on the CRM board.
6. Import creators from CSV/XLSX or export a working list to CSV.
7. View rule-based similar creators.
8. Create outreach templates and send tracked emails.
9. Review traffic sources and suspicious-access events in a private dashboard.

Import accepts common platform aliases and Chinese/English CRM status labels.
Rows already present in the target list are reported as skipped rather than
counted as new imports.

HTML email previews render in a sandboxed frame so template markup cannot
execute with access to the PotentialDS application session.

The CRM board includes all nine states, including rejected and paused, so no
relationship disappears from the pipeline when its status changes.

## Routes

| Route | Product function |
| --- | --- |
| `/creator-workbench` | Search and filter the shared creator catalogue. |
| `/creators/[id]` | Creator detail, save, relationship, notes and recommendations. |
| `/my-creators` | Creator lists and CSV export. |
| `/crm` | Pipeline board. |
| `/crm/import` | CSV/XLSX import with automatic field mapping. |
| `/email/templates` | Template editing, preview, sending and engagement summary. |
| `/admin/analytics` | Private entry-source and abuse-risk dashboard. |

## Similar creator recommendation

Version `rules-v1` uses the same platform and region, then narrows follower
count to 40%-250% of the source creator. The next version should add tag overlap
and a vector similarity layer. The current version logs shown, opened and saved
feedback for evaluation; dismissed feedback remains a future UI action.

## Email tracking limitations

Open tracking uses a transparent 1x1 GIF. The UI must call the metric
**estimated open rate** because Apple Mail privacy protection, image proxies,
security scanners and disabled images affect accuracy. Click and reply events
are stronger engagement signals.

## Analytics and crawler monitoring

The application records coarse product events and hashed risk signals. It does
not store raw IP addresses or full user-agent strings.

Initial signals include high event frequency, known crawlers and automation
user agents. Server entry monitoring covers creator, CRM and API routes even
when a client does not run JavaScript. Production should also enable a
provider-side firewall and CAPTCHA. Database monitoring supports product
insight and investigation; it does not replace an edge firewall.

## Next milestones

1. Team workspaces, members and assignees.
2. Bulk campaign scheduling with plan-based daily limits.
3. Inbound reply synchronization.
4. Tag-overlap and vector-based recommendations.
5. Campaign cost, conversion and ROI reporting.
6. Saved searches and creator/product change alerts.
