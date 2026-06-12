# Project Structure

```text
mpss/
  package.json
  .env.example
  database/
    schema.sql
  docs/
    api-plan.md
    implementation-plan.md
    project-structure.md
  server/
    package.json
    src/
      index.js
      app.js
      config/
        env.js
        sequelize.js
      models/
        index.js
        user.model.js
        user-subscription.model.js
        platform-token.model.js
        target.model.js
        activity.model.js
        fetch-log.model.js
      routes/
        auth.routes.js
        user.routes.js
        admin.routes.js
        health.routes.js
      controllers/
        admin/
          platform-token.controller.js
          target.controller.js
          fetch.controller.js
      services/
        fetch/
          fetch-target.service.js
          scheduler.service.js
        platforms/
          weibo.adapter.js
      middleware/
        admin-auth.js
        error-handler.js
        validate.js
      utils/
        sleep.js
        logger.js
    migrations/
    seeders/
  client/
    package.json
    index.html
    src/
      main.jsx
      App.jsx
      routes/
        AdminRoutes.jsx
      pages/
        UserAuthPage.jsx
        UserTargetsPage.jsx
        AdminLogin.jsx
        AdminDashboard.jsx
        PlatformTokenPage.jsx
        TargetsPage.jsx
        FetchLogsPage.jsx
      components/
        AppShellLayout.jsx
        TargetForm.jsx
        ConfirmDeleteModal.jsx
      api/
        http.js
        admin.js
      styles/
        tailwind.css
```

## Boundary

The MVP keeps only the admin subscription-management loop:

- Admin login with `ADMIN_TOKEN`.
- Admin stores the Weibo cookie.
- Admin creates and deletes subscribable targets.
- Server fetches target activities from Weibo.
- Server deduplicates activities into MySQL.
- A daily scheduler fetches all targets with randomized delay between targets.

Multi-platform support is represented in the schema with `platform`, but only the Weibo adapter is implemented first.
