# MPSS MVP

Multi-platform subscription service MVP. The first version implements Weibo admin management, fetching, and user subscriptions.

## Stack

- Backend: Koa, Sequelize, MySQL
- Frontend: React, Mantine UI, Tailwind CSS
- Scheduler: `node-cron`

## Setup

1. Copy `.env.example` to `.env` and fill in database credentials, `ADMIN_TOKEN`, and `JWT_SECRET`.
2. Install dependencies from the repository root:

```bash
pnpm install
```

3. Create the database and tables with either option:

```bash
mysql -u root -p < database/schema.sql
```

or:

```bash
pnpm db:migrate
```

4. Start backend and frontend:

```bash
pnpm dev:server
pnpm dev:client
```

Backend defaults to `http://localhost:3000`.
Frontend defaults to `http://localhost:5173`.

User frontend: `http://localhost:5173/login`
Admin frontend: `http://localhost:5173/admin/login`

## MVP Scope

- Users register/login with 6+ character alphanumeric account and password.
- Users subscribe/unsubscribe targets and view latest or all activities.
- Users receive unread new-activity reminders, with SSE push while the user dashboard is online.
- Users can view target stats for followers, follower growth, and post counts.
- Users can search Weibo keywords, keep per-user search history, inspect Weibo post comments, and run AI analysis over current search results or loaded comments.
- Browser extension can scrape visible Weibo, Xiaohongshu, and Douyin page content and send selected items to the same AI analysis backend.
- Admin logs in with `ADMIN_TOKEN`.
- Admin configures Weibo Cookie.
- Admin creates and deletes targets with `name` and `platform_target_id`.
- Server fetches page 1 of Weibo `/ajax/statuses/mymblog`.
- Server fetches Xiaohongshu profile SSR HTML and parses first-screen notes.
- Xiaohongshu activity time is stored as fetch time because the SSR response does not expose a reliable publish time.
- Activities are deduplicated by `platform + platform_activity_id`.
- Daily scheduler persists multiple rounds into `schedule_tasks`, defaults to 6 rounds per day, and each task fetches one target at a randomized time.
- Admin can view today's schedule rounds and per-target fetch plans.

## AI Analysis

Keyword search and comment analysis use an OpenAI-compatible Chat Completions API. Configure these only when AI analysis is needed:

```bash
AI_BASE_URL=https://api.deepseek.com
AI_MODEL=deepseek-chat
AI_API_KEY=
AI_TIMEOUT_MS=30000
```

If `AI_API_KEY` is empty, analysis endpoints return `missing_ai_api_key`.

## Baizhi OAuth

User login supports the existing account/password flow and optional Baizhi OAuth login. Configure these only when Baizhi login is needed:

```bash
BAIZHI_BASE_URL=https://openapi.100wiser.com
BAIZHI_OAUTH_BASE_URL=https://100wiser.com
BAIZHI_KNOWLEDGE_BASE_URL=https://100wiser.com/facade
BAIZHI_APP_ID=
BAIZHI_APP_SECRET=
BAIZHI_APP_NAME=
BAIZHI_EXTENSION_APP_ID=
BAIZHI_EXTENSION_APP_SECRET=
BAIZHI_EXTENSION_APP_NAME=mpss-extension
```

Set the Baizhi Web application redirect URL to the frontend callback route, for example:

```text
http://localhost:5173/oauth/baizhi/callback
```

For browser extension login, create a second Baizhi application and set its redirect URL to the Chrome extension OAuth callback:

```text
https://<extension-id>.chromiumapp.org/baizhi
```

The extension ID is shown in `chrome://extensions` after loading the extension.

The browser extension can also sync its captured content and AI analysis Markdown to Baizhi Knowledge Base. This requires the user to log in with Baizhi first, so the server can use the stored Baizhi access token. The first implementation writes Markdown into the user's Baizhi personal Knowledge Base under the `MPSS` folder using the `mpss-extension` vault.

## Browser Extension

The Chrome MV3 extension lives in `browser-extension/` and uses React + Mantine for the side panel UI. Build it with:

```bash
pnpm build:extension
```

Then load `browser-extension/dist` in Chrome's extension page. The first version supports visible Weibo, Xiaohongshu, and Douyin search/detail/comment content.
