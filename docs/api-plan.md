# Backend API Plan

Base URL: `/api`

Admin authentication uses the server-side environment variable `ADMIN_TOKEN`.

Client sends:

```http
Authorization: Bearer <ADMIN_TOKEN>
```

The first admin screen can store this token in `localStorage`. There is no separate admin user table in the MVP.

## Health

### GET `/health`

Returns server and database health.

Response:

```json
{
  "ok": true,
  "database": "ok"
}
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
