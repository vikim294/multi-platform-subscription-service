---
name: mpss-user-agent
description: Guide for AI agents to help MPSS users register or log in, persist the JWT, subscribe to social targets, inspect Weibo insights, run AI analysis, and optionally sync analysis Markdown to Baizhi Knowledge Base.
---

# MPSS User Agent Skill

## Critical Rules

- 默认服务地址是 `http://localhost:3000`；除非用户明确提供其它部署地址，否则使用该地址作为 `base_url`。
- 用户账号和密码只能包含英文和数字，且都是 6-64 位。
- 首次使用先让用户决定账号和密码，然后注册；已有账号则登录。
- 登录、注册或百智登录成功后会得到 MPSS JWT，必须保存到 `~/.mpss/auth.json`。
- 后续所有 MPSS API 请求都携带 `Authorization: Bearer <token>`。
- 每次开始执行用户侧任务时，先读取 `~/.mpss/auth.json` 并调用 `{base_url}/api/auth/me` 验证登录态。
- 不要在聊天中反复展示 token 或密码，不要发送给无关第三方。
- 用户侧能力只面向普通用户：目标订阅、动态查看、微博洞察、AI 分析、通知、插件分析、百智知识库同步。不要调用管理员接口。
- 当前微博洞察搜索只支持 `weibo`；插件分析支持插件抓取到的 `weibo`、`xiaohongshu`、`douyin` 内容。
- AI 分析只能基于用户提供给接口的搜索结果、评论或插件抓取内容回答，不要编造外部事实。
- 如果用户要求持续关注订阅目标，优先使用通知接口或本地未读状态；不要高频轮询。
- 同步到百智知识库前，必须确认用户已通过百智登录过 MPSS；账号密码登录用户没有百智授权 token 时不能同步。

Auth file format:

```json
{
  "base_url": "http://localhost:3000",
  "account": "USER123",
  "token": "JWT_TOKEN"
}
```

## Content Map

- `Startup Flow`: read or create auth file
- `Register / Login`: get MPSS JWT
- `Baizhi Login`: exchange Baizhi temporary token for MPSS JWT
- `Targets`: list, subscribe, unsubscribe, and read activities
- `Weibo Insights`: search keywords, inspect posts, comments, and histories
- `AI Analysis`: ask about search results, comments, or extension content
- `Notifications`: read and mark unread activity notifications
- `Baizhi Knowledge Base Sync`: sync Markdown generated from extension analysis
- `Error Handling`: common failures

## Startup Flow

1. 读取 `~/.mpss/auth.json`。
2. 如果文件存在，使用其中的 `base_url` 和 `token` 调用：

```http
GET {base_url}/api/auth/me
Authorization: Bearer USER_TOKEN
```

3. 如果验证成功，继续处理用户需求。
4. 如果文件不存在、token 无效或接口返回 `401`，询问用户是注册新账号、登录已有账号，还是使用百智账号登录。
5. 登录成功后，把返回的 JWT 写入 `~/.mpss/auth.json`，不要保存密码。
6. 向用户自然说明已经登录，并列出可以代办的事项：订阅目标、查看动态、微博搜索洞察、评论分析、插件内容分析、同步 Markdown 到百智知识库。

## Register / Login

注册请求：

```http
POST {base_url}/api/auth/register
Content-Type: application/json
```

```json
{
  "account": "USER123",
  "password": "PASS123"
}
```

登录请求：

```http
POST {base_url}/api/auth/login
Content-Type: application/json
```

```json
{
  "account": "USER123",
  "password": "PASS123"
}
```

Response:

```json
{
  "token": "JWT_TOKEN",
  "user": {
    "id": 1,
    "account": "USER123"
  }
}
```

登录或注册后保存：

```json
{
  "base_url": "http://localhost:3000",
  "account": "USER123",
  "token": "JWT_TOKEN"
}
```

## Baizhi Login

当用户想用百智账号登录 MPSS 时，先获取授权地址：

```http
GET {base_url}/api/auth/baizhi/authorize
```

浏览器插件场景使用：

```http
GET {base_url}/api/auth/baizhi/authorize?channel=extension
```

响应：

```json
{
  "authorizeUrl": "https://100wiser.com/oauth-bridge?..."
}
```

让用户打开 `authorizeUrl` 完成百智授权。百智回调会带回一次性 `token`，然后调用：

```http
POST {base_url}/api/auth/baizhi/exchange
Content-Type: application/json
```

```json
{
  "token": "BAIZHI_TEMPORARY_TOKEN"
}
```

响应同 MPSS 登录接口。保存返回的 MPSS JWT 到 `~/.mpss/auth.json`。

注意：

- 百智登录会在 MPSS 中查找或创建用户。
- 后续访问 MPSS 仍然使用 MPSS JWT，不要把百智 access token 暴露给用户或保存到本地。
- 只有通过百智登录过的用户，服务端才有权限代表用户同步内容到百智知识库。

## Targets

查看可订阅目标和当前订阅状态：

```http
GET {base_url}/api/targets
Authorization: Bearer USER_TOKEN
```

响应：

```json
{
  "items": [
    {
      "id": 8,
      "platform": "weibo",
      "platformTargetId": "1229641152",
      "name": "目标名称",
      "subscribed": true,
      "latestActivity": {
        "id": 24,
        "content": "最新动态正文",
        "sourceUrl": "https://weibo.com/...",
        "publishedAt": "2026-06-13T08:00:00.000Z"
      }
    }
  ]
}
```

向用户展示 `name`、`platform`、`subscribed` 和最新动态摘要；订阅时使用 `id`。

订阅目标：

```http
POST {base_url}/api/subscriptions/{target_id}
Authorization: Bearer USER_TOKEN
```

取消订阅：

```http
DELETE {base_url}/api/subscriptions/{target_id}
Authorization: Bearer USER_TOKEN
```

查看目标动态：

```http
GET {base_url}/api/targets/{target_id}/activities?page=1&pageSize=20
Authorization: Bearer USER_TOKEN
```

`pageSize` 最大为 100。给用户总结动态时优先使用 `target.name`、`content`、`sourceUrl`、`publishedAt`。

## Weibo Insights

搜索微博关键词：

```http
GET {base_url}/api/search?platform=weibo&keyword=KEYWORD&page=1
Authorization: Bearer USER_TOKEN
```

响应包含 `platform`、`keyword`、`page` 和 `results`。搜索会自动写入用户搜索历史。

查看搜索历史：

```http
GET {base_url}/api/search-histories?limit=10
Authorization: Bearer USER_TOKEN
```

删除单条搜索历史：

```http
DELETE {base_url}/api/search-histories/{history_id}
Authorization: Bearer USER_TOKEN
```

清空搜索历史：

```http
DELETE {base_url}/api/search-histories
Authorization: Bearer USER_TOKEN
```

查看目标微博帖子：

```http
GET {base_url}/api/targets/{target_id}/posts?platform=weibo&page=1&pageSize=20
Authorization: Bearer USER_TOKEN
```

查看微博帖子评论：

```http
GET {base_url}/api/targets/{target_id}/posts/{post_id}/comments
Authorization: Bearer USER_TOKEN
```

如果响应中有翻页游标，可按接口返回继续请求下一页。评论分析前至少要有一批有效评论。

## AI Analysis

分析微博搜索结果：

```http
POST {base_url}/api/search/ask
Authorization: Bearer USER_TOKEN
Content-Type: application/json
```

```json
{
  "platform": "weibo",
  "keyword": "AI录音卡",
  "question": "有哪些高频话题？",
  "results": []
}
```

分析微博帖子评论：

```http
POST {base_url}/api/comments/ask
Authorization: Bearer USER_TOKEN
Content-Type: application/json
```

```json
{
  "platform": "weibo",
  "targetName": "目标名称",
  "postText": "帖子正文",
  "question": "评论区主要观点是什么？",
  "comments": []
}
```

分析浏览器插件抓取内容：

```http
POST {base_url}/api/extension/analysis
Authorization: Bearer USER_TOKEN
Content-Type: application/json
```

```json
{
  "source": "weibo",
  "pageType": "search_results",
  "pageUrl": "https://s.weibo.com/weibo?q=...",
  "question": "有哪些值得关注的内容？",
  "items": []
}
```

AI 响应：

```json
{
  "answer": "Markdown 或纯文本分析结果",
  "model": "deepseek-chat"
}
```

展示 AI 结果时保留 Markdown 结构。不要把模型回答当作事实来源之外的证据。

## Notifications

查看未读通知：

```http
GET {base_url}/api/notifications/unread
Authorization: Bearer USER_TOKEN
```

标记单条已读：

```http
PATCH {base_url}/api/notifications/{notification_id}/read
Authorization: Bearer USER_TOKEN
```

标记全部已读：

```http
PATCH {base_url}/api/notifications/read-all
Authorization: Bearer USER_TOKEN
```

如果环境支持 SSE，可以连接：

```http
GET {base_url}/api/notifications/stream
Authorization: Bearer USER_TOKEN
```

agent 自己做未读去重时，建议把展示过的通知 ID 保存在本地，不要重复打扰用户。

## Baizhi Knowledge Base Sync

当用户要求把插件抓取内容和 AI 分析结果同步到百智知识库时，先确认当前 MPSS 用户是通过百智登录或曾经绑定过百智授权。

同步 Markdown：

```http
POST {base_url}/api/extension/knowledge-base/sync-markdown
Authorization: Bearer USER_TOKEN
Content-Type: application/json
```

```json
{
  "title": "AI录音卡微博分析",
  "source": "weibo",
  "markdown": "# AI录音卡微博分析\n\n..."
}
```

响应：

```json
{
  "synced": true
}
```

服务端会使用用户的百智授权 token 写入百智个人知识库的 `MPSS` 文件夹。agent 只需要提交完整 Markdown，不需要也不能直接操作百智 access token。

## Error Handling

- `401` / `Unauthorized`：MPSS JWT 缺失、无效或过期。重新登录并覆盖 `~/.mpss/auth.json`。
- `账号必须是 6-64 位英文或数字` / `密码必须是 6-64 位英文或数字`：让用户换成合法账号或密码。
- `账号或密码错误`：登录凭据错误，重新询问账号密码。
- `missing_platform_token`：管理员尚未配置平台 Cookie，告诉用户当前无法搜索或抓取该平台。
- `platform_token_expired`：平台 Cookie 过期，需要管理员更新。
- `unsupported_platform`：当前接口不支持该平台。
- `missing_ai_api_key`：服务端未配置 AI API Key，无法进行 AI 分析。
- `missing_keyword` / `missing_question` / `missing_search_results` / `missing_comments` / `missing_extension_items`：请求缺少必要内容，补齐后重试。
- `ai_provider_timeout` / `ai_provider_network_error` / `ai_provider_error`：AI 服务异常，稍后重试，不要立即重复刷请求。
- `rate_limited` / `429`：请求太频繁，等待一段时间后再试。
- `百智授权已过期，请重新使用百智账号登录`：让用户重新通过百智登录 MPSS。
- `baizhi_knowledge_base_storage_insufficient`：用户百智知识库存储空间不足。
- `baizhi_knowledge_base_permission_denied`：百智知识库没有写入权限，需要用户重新授权或检查权限。
- `baizhi_knowledge_base_network_error` / `baizhi_knowledge_base_sync_failed`：百智知识库服务暂时不可用或同步失败，稍后重试。
