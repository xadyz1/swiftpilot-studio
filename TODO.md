# SwiftPilot Social Studio

## Upgrade requested by the owner

- [ ] Rename the app to SwiftPilot Social Studio and support separate site/project workspaces. Add Hungry Pockets, swiftdisplay.pt, swiftcal.pt, goldenmailbox.pt, and lojapilot.pt. Users can add additional project URLs. Preserve existing Hungry Pockets posts and local edits during migration.
- [ ] Make brand identity editable per project: logos, headline/body fonts, styling, uppercase behavior, and palette colors. Hungry Pockets defaults must use uppercase Oswald with black/white, primary red highlights, and optional blue accents. Use the selected kit in post previews and exported graphics rather than hardcoded Hungry Pockets text/colors.
- [ ] Add a project media library with local image/video uploads, URL imports, website-fetched media, and media selection in the post editor. Save uploaded blobs in this browser and provide source provenance for fetched assets.
- [ ] Implement bounded, safe public website crawling and content/media extraction. Import discovered brand suggestions without silently overwriting an edited kit. Show progress, sources, limitations, and errors. Respect robots restrictions, block internal/private destinations and unsafe redirects, and bound response sizes/pages/time.
- [ ] Generate editable Instagram/TikTok posts from the current project's imported source content and selected brand voice, with configurable language/goal/count. Generate calendar plans with a chosen start date and cadence without overwriting existing entries. Never mix other projects' claims or media. Review generated copy before manual publishing; AI text generation uses project credits.
- [ ] Keep monthly/weekly calendars, drag-and-drop rescheduling, per-post snapshots, caption/hashtag/link/notes editing, platform/campaign/theme/format filters, copy/text/PNG downloads, CSV plan exports, and draft/planned/published tracking.
- [ ] Responsive, clearly project-aware interface with project switcher, editable brand kit, media library, source importer, generation controls, and publishing/storage guidance. No automatic social publishing or unattended scheduled crawling is included.

## Existing delivered features

The original Hungry Pockets calendar, 16 post templates, original photos, post editor, filters, downloads, local persistence, and manual-publishing guidance are retained as the migration source. Existing tests and source-based review evidence will be reused where applicable.

## Persistent storage, users & onboarding (planned)

### Stage 1 — Persistence & accounts
- [ ] MySQL persistence via existing drizzle setup: `projects`, `planned_posts`, `media_assets`, `generation_jobs` tables (per-user, migrate localStorage on first login)
- [ ] Users management: `role` on users table (master/member). Master = ivandro.work@gmail.com — auto-provisioned on first login. Dashboard `/admin/users`: list, add (invite by email), edit role/name, deactivate
- [ ] Auth gate for `/studio` (existing platform auth + sessions)

### Stage 2 — Onboarding wizard (new site)
- [ ] Step 1: website URL → crawl; extra pasted content field for post text
- [ ] Step 2: media — upload images/videos, multiple logo variants (dark/light/compact)
- [ ] Step 3: brand confirm — typography pick/confirm, palette, social URLs (instagram/tiktok/linkedin; linkedIn added to crawler handles)
- [ ] Step 4: business type select — local business / SaaS / ecommerce / dropshipping / services / personal brand → niche template packs for generation + calendar plan
- [ ] Step 5: goals — leads / subscriptions / email capture / traffic / engagement; language: EN / PT / both (alternate)
- [ ] Step 6: review → generation job: posts queued to calendar + progress + completion email + ZIP download of creatives & schedule

### Stage 3 — Email & storage
- [ ] Email templates: welcome, onboarding-complete (with ZIP link), generation-finished, user-invite. Provider TBD (SMTP creds needed)
- [ ] Bunny Storage integration for media uploads (zone + API key needed): upload endpoint replaces local-media blobs for logged-in users, CDN URLs stored on media_assets

### Done
- [x] SwiftAds container on landing (`ecosystem_billboard_970x250`)
