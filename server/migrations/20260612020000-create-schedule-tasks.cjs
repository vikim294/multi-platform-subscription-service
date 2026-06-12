'use strict';

const platforms = ['weibo', 'xiaohongshu', 'douyin'];
const statuses = ['pending', 'running', 'success', 'failed', 'skipped'];

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('schedule_tasks', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      schedule_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      round_index: {
        type: Sequelize.INTEGER.UNSIGNED,
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
      scheduled_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM(...statuses),
        allowNull: false,
        defaultValue: 'pending',
      },
      started_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      finished_at: {
        type: Sequelize.DATE,
        allowNull: true,
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

    await queryInterface.addIndex('schedule_tasks', ['schedule_date', 'round_index', 'target_id'], {
      unique: true,
      name: 'uk_schedule_tasks_date_round_target',
    });
    await queryInterface.addIndex('schedule_tasks', ['status', 'scheduled_at'], {
      name: 'idx_schedule_tasks_status_scheduled',
    });
    await queryInterface.addIndex('schedule_tasks', ['schedule_date', 'round_index', 'scheduled_at'], {
      name: 'idx_schedule_tasks_date_round_time',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('schedule_tasks');
  },
};
