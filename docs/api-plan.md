# Backend API Plan

Base URL: `/api`

Admin authentication uses the server-side environment variable `ADMIN_TOKEN`.

Client sends:

```http
Authorization: Bearer <ADMIN_TOKEN>
```

The first admin screen can store this token in `localStorage`. There is no separate admin user table in the MVP.

## Health

### GET `/api/health`

Returns server and database health.

Response:

```json
{
  "ok": true,
  "database": "ok"
}
```

## User Auth

User authentication uses JWT returned from login/register.

Client sends:

```http
Authorization: Bearer <JWT>
```

### POST `/auth/register`

Request:

```json
{
  "account": "user001",
  "password": "pass001"
}
```

Rules:

- `account`: 6-64 characters, English letters or numbers only.
- `password`: 6-64 characters, English letters or numbers only.

Response:

```json
{
  "token": "jwt",
  "user": {
    "id": 1,
    "account": "user001"
  }
}
```

### POST `/auth/login`

Same request and response as register.

### GET `/auth/me`

Returns current user profile.

## User Targets

### GET `/targets`

Returns all subscribable targets. Subscribed targets are sorted first and each target includes its latest activity.

Response:

```json
{
  "items": [
    {
      "id": 1,
      "platform": "weibo",
      "platformTargetId": "1234567890",
      "name": "目标账号",
      "subscribed": true,
      "latestActivity": {
        "id": 10,
        "content": "微博正文",
        "sourceUrl": "https://weibo.com/1234567890/xxx",
        "publishedAt": "2026-06-12T00:00:00.000Z"
      }
    }
  ]
}
```

### POST `/subscriptions/:id`

Subscribes current user to a target.

### DELETE `/subscriptions/:id`

Unsubscribes current user from a target.

### GET `/targets/:id/activities`

Returns activities for one target.

## User Notifications

New activity reminders are persisted as unread notifications and pushed to online users through SSE.

### GET `/notifications/unread`

Returns unread notification count and unread cards.

Response:

```json
{
  "unreadCount": 1,
  "items": [
    {
      "id": 1,
      "readAt": null,
      "target": {
        "id": 1,
        "name": "目标账号"
      },
      "activity": {
        "id": 10,
        "content": "微博正文",
        "sourceUrl": "https://weibo.com/1234567890/xxx",
        "publishedAt": "2026-06-12T00:00:00.000Z"
      }
    }
  ]
}
```

### PATCH `/notifications/:id/read`

Marks one unread notification as read.

### PATCH `/notifications/read-all`

Marks all current user's unread notifications as read.

### GET `/notifications/stream?token=<JWT>`

SSE stream for online user dashboards. `EventSource` cannot send custom auth headers, so this endpoint accepts the JWT through the `token` query parameter.

Event:

```text
event: new-activity
```

## Admin Platform Tokens

### GET `/admin/platform-tokens`

Returns configured platform token metadata. Cookie values should be masked.

Response:

```json
{
  "items": [
    {
      "id": 1,
      "platform": "weibo",
      "cookieMasked": "SUB=abc...xyz",
      "enabled": true,
      "updatedAt": "2026-06-12T00:00:00.000Z"
    }
  ]
}
```

### PUT `/admin/platform-tokens/:platform`

Creates or updates a platform cookie.

Request:

```json
{
  "cookie": "SUB=...; XSRF-TOKEN=...",
  "enabled": true
}
```

Response:

```json
{
  "id": 1,
  "platform": "weibo",
  "enabled": true
}
```

## Admin Targets

### GET `/admin/targets`

Query:

- `platform`: optional, defaults to all.
- `page`: optional, defaults to `1`.
- `pageSize`: optional, defaults to `20`.

Response:

```json
{
  "items": [
    {
      "id": 1,
      "platform": "weibo",
      "platformTargetId": "1234567890",
      "name": "目标账号",
      "createdAt": "2026-06-12T00:00:00.000Z"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 1
}
```

### POST `/admin/targets`

Creates a subscribable target. The admin form only needs `name` and `platformTargetId`; `platform` defaults to `weibo` during the MVP.

Request:

```json
{
  "name": "目标账号",
  "platformTargetId": "1234567890",
  "platform": "weibo"
}
```

Response:

```json
{
  "id": 1,
  "platform": "weibo",
  "platformTargetId": "1234567890",
  "name": "目标账号",
  "createdAt": "2026-06-12T00:00:00.000Z"
}
```

### DELETE `/admin/targets/:id`

Deletes a target and cascades its stored activities.

Response:

```json
{
  "ok": true
}
```

## Admin Fetch

### POST `/admin/fetch/targets/:id`

Manually fetches one target.

Response:

```json
{
  "targetId": 1,
  "platform": "weibo",
  "fetchedCount": 20,
  "insertedCount": 3,
  "status": "success"
}
```

### POST `/admin/fetch/all`

Manually starts a sequential fetch for all targets. Adjacent targets use randomized delay from `FETCH_MIN_DELAY_SECONDS` to `FETCH_MAX_DELAY_SECONDS`.

Response:

```json
{
  "accepted": true
}
```

### GET `/admin/fetch-logs`

Query:

- `targetId`: optional.
- `platform`: optional.
- `page`: optional, defaults to `1`.
- `pageSize`: optional, defaults to `20`.

Response:

```json
{
  "items": [
    {
      "id": 1,
      "targetId": 1,
      "platform": "weibo",
      "status": "success",
      "fetchedCount": 20,
      "insertedCount": 3,
      "message": null,
      "startedAt": "2026-06-12T00:00:00.000Z",
      "finishedAt": "2026-06-12T00:00:05.000Z"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 1
}
```

## Admin Scheduler

### GET `/admin/scheduler/today`

Returns today's persistent schedule grouped by round.

Response:

```json
{
  "date": "2026-06-12",
  "summary": {
    "total": 18,
    "pending": 12,
    "running": 0,
    "success": 6,
    "failed": 0,
    "skipped": 0
  },
  "rounds": [
    {
      "roundIndex": 1,
      "tasks": [
        {
          "id": 1,
          "targetId": 1,
          "targetName": "目标账号",
          "platformTargetId": "1234567890",
          "platform": "weibo",
          "scheduledAt": "2026-06-12T00:03:10.000Z",
          "status": "pending",
          "fetchedCount": 0,
          "insertedCount": 0,
          "message": null
        }
      ]
    }
  ]
}
```

Scheduler rules:

- Default `SCHEDULER_ROUNDS_PER_DAY=6`.
- Each schedule task fetches exactly one target.
- Targets within a round are randomly spread across `SCHEDULER_ROUND_WINDOW_MS`.
- Adjacent target tasks within one round are strictly greater than `SCHEDULER_MIN_TASK_GAP_MS`.
- Adjacent round starts are strictly greater than `SCHEDULER_MIN_ROUND_GAP_MS`.
- Plans are persisted to `schedule_tasks`.
- Service restart fills missing future plans but does not reset existing tasks.
- Target create/delete replans only future rounds whose tasks are still all `pending`.

## Admin Activities

### GET `/admin/activities`

Query:

- `targetId`: optional.
- `platform`: optional.
- `page`: optional, defaults to `1`.
- `pageSize`: optional, defaults to `20`.

Response:

```json
{
  "items": [
    {
      "id": 1,
      "targetId": 1,
      "platform": "weibo",
      "platformActivityId": "5012345678901234",
      "authorName": "目标账号",
      "content": "微博正文",
      "sourceUrl": "https://weibo.com/1234567890/xxx",
      "publishedAt": "2026-06-12T00:00:00.000Z"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 1
}
```

## Weibo Adapter Contract

Request:

```http
GET https://weibo.com/ajax/statuses/mymblog?uid=<platformTargetId>&page=1&feature=0
Cookie: <admin configured cookie>
```

Normalized activity shape:

```json
{
  "platform": "weibo",
  "platformActivityId": "微博动态 ID",
  "authorPlatformId": "微博用户 ID",
  "authorName": "微博昵称",
  "content": "清洗后的正文",
  "sourceUrl": "可打开的微博链接",
  "publishedAt": "发布时间",
  "rawPayload": {}
}
```

Deduplication key:

```text
platform + platform_activity_id
```

## Xiaohongshu Adapter Contract

Request:

```http
GET https://www.xiaohongshu.com/user/profile/<platformTargetId>
Cookie: <admin configured cookie>
```

The adapter parses SSR HTML from `window.__INITIAL_STATE__`, reads `user.notes[0]`, and normalizes each note into the internal activity shape.

Important time behavior:

- Xiaohongshu SSR profile HTML does not provide a reliable publish time in the parsed note list.
- `publishedAt` is set to the fetch time.
- `publishedAtSource` is set to `fetched_at`.
- UI should show this as `抓取时间`, not platform publish time.

Normalized activity shape:

```json
{
  "platform": "xiaohongshu",
  "platformActivityId": "note id",
  "authorPlatformId": "小红书 user_id",
  "authorName": "小红书昵称",
  "content": "笔记标题",
  "sourceUrl": "https://www.xiaohongshu.com/explore/<note id>",
  "publishedAt": "抓取时间",
  "publishedAtSource": "fetched_at",
  "rawPayload": {}
}
```
