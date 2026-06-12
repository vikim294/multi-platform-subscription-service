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
- Admin logs in with `ADMIN_TOKEN`.
- Admin configures Weibo Cookie.
- Admin creates and deletes targets with `name` and `platform_target_id`.
- Server fetches page 1 of Weibo `/ajax/statuses/mymblog`.
- Server fetches Xiaohongshu profile SSR HTML and parses first-screen notes.
- Xiaohongshu activity time is stored as fetch time because the SSR response does not expose a reliable publish time.
- Activities are deduplicated by `platform + platform_activity_id`.
- Daily scheduler persists multiple rounds into `schedule_tasks`, defaults to 6 rounds per day, and each task fetches one target at a randomized time.
- Admin can view today's schedule rounds and per-target fetch plans.
