CREATE DATABASE IF NOT EXISTS `mpss`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `mpss`;

CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `account` VARCHAR(64) NOT NULL,
  `password_hash` VARCHAR(255) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_account` (`account`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `oauth_accounts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `provider` VARCHAR(32) NOT NULL,
  `provider_user_id` VARCHAR(128) NOT NULL,
  `access_token` TEXT NULL,
  `profile_json` JSON NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_oauth_accounts_provider_user` (`provider`, `provider_user_id`),
  KEY `idx_oauth_accounts_user` (`user_id`),
  CONSTRAINT `fk_oauth_accounts_user_id`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `platform_tokens` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `platform` ENUM('weibo', 'xiaohongshu', 'douyin') NOT NULL,
  `cookie` TEXT NOT NULL,
  `enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_platform_tokens_platform` (`platform`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `targets` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `platform` ENUM('weibo', 'xiaohongshu', 'douyin') NOT NULL,
  `platform_target_id` VARCHAR(128) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_targets_platform_target` (`platform`, `platform_target_id`),
  KEY `idx_targets_platform` (`platform`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_subscriptions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `target_id` BIGINT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_subscriptions_user_target` (`user_id`, `target_id`),
  KEY `idx_user_subscriptions_target` (`target_id`),
  CONSTRAINT `fk_user_subscriptions_user_id`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_user_subscriptions_target_id`
    FOREIGN KEY (`target_id`) REFERENCES `targets` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_search_histories` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `platform` ENUM('weibo', 'xiaohongshu', 'douyin') NOT NULL DEFAULT 'weibo',
  `keyword` VARCHAR(128) NOT NULL,
  `search_count` INT UNSIGNED NOT NULL DEFAULT 1,
  `last_searched_at` DATETIME NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_search_histories_user_platform_keyword` (`user_id`, `platform`, `keyword`),
  KEY `idx_user_search_histories_user_last` (`user_id`, `last_searched_at`),
  CONSTRAINT `fk_user_search_histories_user_id`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `activities` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `target_id` BIGINT UNSIGNED NOT NULL,
  `platform` ENUM('weibo', 'xiaohongshu', 'douyin') NOT NULL,
  `platform_activity_id` VARCHAR(128) NOT NULL,
  `author_platform_id` VARCHAR(128) NOT NULL,
  `author_name` VARCHAR(255) NULL,
  `content` TEXT NULL,
  `source_url` VARCHAR(1024) NULL,
  `raw_payload` JSON NULL,
  `published_at` DATETIME NULL,
  `published_at_source` ENUM('platform', 'fetched_at') NOT NULL DEFAULT 'platform',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_activities_platform_activity` (`platform`, `platform_activity_id`),
  KEY `idx_activities_target_published` (`target_id`, `published_at`),
  CONSTRAINT `fk_activities_target_id`
    FOREIGN KEY (`target_id`) REFERENCES `targets` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `fetch_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `target_id` BIGINT UNSIGNED NULL,
  `platform` ENUM('weibo', 'xiaohongshu', 'douyin') NOT NULL,
  `status` ENUM('success', 'failed', 'skipped') NOT NULL,
  `page_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `fetched_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `inserted_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `message` VARCHAR(1024) NULL,
  `started_at` DATETIME NOT NULL,
  `finished_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_fetch_logs_target_created` (`target_id`, `created_at`),
  KEY `idx_fetch_logs_platform_created` (`platform`, `created_at`),
  CONSTRAINT `fk_fetch_logs_target_id`
    FOREIGN KEY (`target_id`) REFERENCES `targets` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `target_follower_stats` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `target_id` BIGINT UNSIGNED NOT NULL,
  `stat_date` DATE NOT NULL,
  `followers_count` INT UNSIGNED NOT NULL,
  `delta_count` INT NULL,
  `captured_at` DATETIME NOT NULL,
  `raw_payload` JSON NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_target_follower_stats_target_date` (`target_id`, `stat_date`),
  KEY `idx_target_follower_stats_target_captured` (`target_id`, `captured_at`),
  CONSTRAINT `fk_target_follower_stats_target_id`
    FOREIGN KEY (`target_id`) REFERENCES `targets` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `activity_notifications` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `target_id` BIGINT UNSIGNED NOT NULL,
  `activity_id` BIGINT UNSIGNED NOT NULL,
  `read_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_activity_notifications_user_activity` (`user_id`, `activity_id`),
  KEY `idx_activity_notifications_user_read_created` (`user_id`, `read_at`, `created_at`),
  CONSTRAINT `fk_activity_notifications_user_id`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_activity_notifications_target_id`
    FOREIGN KEY (`target_id`) REFERENCES `targets` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_activity_notifications_activity_id`
    FOREIGN KEY (`activity_id`) REFERENCES `activities` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `schedule_tasks` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `schedule_date` DATE NOT NULL,
  `round_index` INT UNSIGNED NOT NULL,
  `target_id` BIGINT UNSIGNED NOT NULL,
  `platform` ENUM('weibo', 'xiaohongshu', 'douyin') NOT NULL,
  `scheduled_at` DATETIME NOT NULL,
  `status` ENUM('pending', 'running', 'success', 'failed', 'skipped') NOT NULL DEFAULT 'pending',
  `started_at` DATETIME NULL,
  `finished_at` DATETIME NULL,
  `fetched_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `inserted_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `message` VARCHAR(1024) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_schedule_tasks_date_round_target` (`schedule_date`, `round_index`, `target_id`),
  KEY `idx_schedule_tasks_status_scheduled` (`status`, `scheduled_at`),
  KEY `idx_schedule_tasks_date_round_time` (`schedule_date`, `round_index`, `scheduled_at`),
  CONSTRAINT `fk_schedule_tasks_target_id`
    FOREIGN KEY (`target_id`) REFERENCES `targets` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
