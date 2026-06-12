# Implementation Plan

## Phase 1: Bootstrap

1. Initialize the Vite React app under `client/`.
2. Initialize the Koa app under `server/`.
3. Add shared environment loading and fail-fast validation for required variables.
4. Configure Sequelize with MySQL and define the four MVP models:
   - `PlatformToken`
   - `Target`
   - `Activity`
   - `FetchLog`

## Phase 2: Admin Authentication

1. Add `admin-auth` middleware.
2. Accept `Authorization: Bearer <ADMIN_TOKEN>`.
3. Return `401` for missing, malformed, or mismatched tokens.
4. Keep the admin frontend login simple: token input, save to `localStorage`, attach to all admin API calls.

## Phase 3: Target and Cookie Management

1. Implement platform-token upsert and masked list endpoints.
2. Implement target create, list, and delete endpoints.
3. Default `platform` to `weibo` in the UI and API validator.
4. Enforce uniqueness on `platform + platform_target_id`.

## Phase 4: Weibo Fetch Loop

1. Implement `weibo.adapter.js`.
2. Read the configured Weibo cookie from `platform_tokens`.
3. Request `/ajax/statuses/mymblog` with `uid`, `page`, and `feature=0`.
4. Normalize Weibo response items into the internal activity shape.
5. Insert activities with deduplication by `platform + platform_activity_id`.
6. Write one `fetch_logs` row for every target fetch attempt.

Initial scope:

- Fetch page `1` only.
- Add multi-page fetching later if the response shape and pagination behavior are verified.
- Store `raw_payload` so parser fixes can be replayed without losing source context.

## Phase 5: Scheduler

1. Use `node-cron` with `FETCH_CRON`, defaulting to daily `00:00`.
2. Query all enabled targets ordered by `id`.
3. Fetch targets sequentially.
4. Between adjacent targets, sleep a random duration in `[FETCH_MIN_DELAY_SECONDS, FETCH_MAX_DELAY_SECONDS]`, default `[5, 60]`.
5. Protect against overlapping runs with an in-memory `isRunning` guard for the MVP.

## Phase 6: Admin UI

1. Use Mantine `AppShell` for responsive PC/mobile layout.
2. Pages:
   - Login
   - Dashboard summary
   - Weibo cookie settings
   - Target management
   - Fetch logs
3. Use Tailwind only for layout utilities and small responsive adjustments; keep form/table components in Mantine.
4. Target creation form fields:
   - `name`
   - `platformTargetId`

## Phase 7: Verification

1. Start MySQL locally and apply `database/schema.sql`.
2. Run server health check.
3. Save Weibo cookie from the admin UI.
4. Add one target with `name` and `platformTargetId`.
5. Trigger manual fetch.
6. Confirm:
   - `activities` inserts new rows.
   - Re-running fetch does not duplicate rows.
   - `fetch_logs` records success and counts.
   - Admin list pages render on desktop and mobile widths.

## Open Questions

1. Should the admin UI expose editing target names, or only add/delete for the MVP?
2. Should the server fetch only the first page of Weibo results initially, or continue until it sees only duplicate activities?
3. Should cookies be stored as plaintext in MySQL for this MVP, or encrypted with an additional `COOKIE_ENCRYPTION_KEY`?
