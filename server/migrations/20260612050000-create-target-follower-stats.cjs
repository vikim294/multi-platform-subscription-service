'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('target_follower_stats', {
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
      stat_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      followers_count: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
      },
      delta_count: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      captured_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      raw_payload: {
        type: Sequelize.JSON,
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

    await queryInterface.addIndex('target_follower_stats', ['target_id', 'stat_date'], {
      unique: true,
      name: 'uk_target_follower_stats_target_date',
    });
    await queryInterface.addIndex('target_follower_stats', ['target_id', 'captured_at'], {
      name: 'idx_target_follower_stats_target_captured',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('target_follower_stats');
  },
};
