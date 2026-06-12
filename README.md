# MPSS MVP

Multi-platform subscription service MVP. The first version only implements Weibo admin management and fetching.

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

## MVP Scope

- Admin logs in with `ADMIN_TOKEN`.
- Admin configures Weibo Cookie.
- Admin creates and deletes targets with `name` and `platform_target_id`.
- Server fetches page 1 of Weibo `/ajax/statuses/mymblog`.
- Activities are deduplicated by `platform + platform_activity_id`.
- Daily scheduler runs at `00:00` and fetches targets sequentially with a random delay in `[5s, 60s]`.
