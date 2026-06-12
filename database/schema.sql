CREATE DATABASE IF NOT EXISTS `mpss`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `mpss`;

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
