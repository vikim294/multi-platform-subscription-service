'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user_search_histories', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      platform: {
        type: Sequelize.ENUM('weibo', 'xiaohongshu', 'douyin'),
        allowNull: false,
        defaultValue: 'weibo',
      },
      keyword: {
        type: Sequelize.STRING(128),
        allowNull: false,
      },
      search_count: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 1,
      },
      last_searched_at: {
        type: Sequelize.DATE,
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

    await queryInterface.addIndex('user_search_histories', ['user_id', 'platform', 'keyword'], {
      unique: true,
      name: 'uk_user_search_histories_user_platform_keyword',
    });
    await queryInterface.addIndex('user_search_histories', ['user_id', 'last_searched_at'], {
      name: 'idx_user_search_histories_user_last',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('user_search_histories');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_user_search_histories_platform;').catch(() => {});
  },
};
