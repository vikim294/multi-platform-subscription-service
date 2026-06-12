'use strict';

const platforms = ['weibo', 'xiaohongshu', 'douyin'];
const fetchStatuses = ['success', 'failed', 'skipped'];

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('platform_tokens', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      platform: {
        type: Sequelize.ENUM(...platforms),
        allowNull: false,
        unique: true,
      },
      cookie: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      enabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    await queryInterface.createTable('targets', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      platform: {
        type: Sequelize.ENUM(...platforms),
        allowNull: false,
        defaultValue: 'weibo',
      },
      platform_target_id: {
        type: Sequelize.STRING(128),
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });
    await queryInterface.addIndex('targets', ['platform', 'platform_target_id'], {
      unique: true,
      name: 'uk_targets_platform_target',
    });

    await queryInterface.createTable('activities', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      target_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'targets', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      platform: {
        type: Sequelize.ENUM(...platforms),
        allowNull: false,
      },
      platform_activity_id: {
        type: Sequelize.STRING(128),
        allowNull: false,
      },
      author_platform_id: {
        type: Sequelize.STRING(128),
        allowNull: false,
      },
      author_name: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      source_url: {
        type: Sequelize.STRING(1024),
        allowNull: true,
      },
      raw_payload: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      published_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });
    await queryInterface.addIndex('activities', ['platform', 'platform_activity_id'], {
      unique: true,
      name: 'uk_activities_platform_activity',
    });
    await queryInterface.addIndex('activities', ['target_id', 'published_at'], {
      name: 'idx_activities_target_published',
    });

    await queryInterface.createTable('fetch_logs', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      target_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
        references: { model: 'targets', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      platform: {
        type: Sequelize.ENUM(...platforms),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM(...fetchStatuses),
        allowNull: false,
      },
      page_count: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
      },
      fetched_count: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
      },
      inserted_count: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
      },
      message: {
        type: Sequelize.STRING(1024),
        allowNull: true,
      },
      started_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      finished_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });
    await queryInterface.addIndex('fetch_logs', ['target_id', 'created_at'], {
      name: 'idx_fetch_logs_target_created',
    });
    await queryInterface.addIndex('fetch_logs', ['platform', 'created_at'], {
      name: 'idx_fetch_logs_platform_created',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('fetch_logs');
    await queryInterface.dropTable('activities');
    await queryInterface.dropTable('targets');
    await queryInterface.dropTable('platform_tokens');
  },
};
