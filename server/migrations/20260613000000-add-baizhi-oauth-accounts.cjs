'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('users', 'password_hash', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });

    await queryInterface.createTable('oauth_accounts', {
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
      provider: {
        type: Sequelize.STRING(32),
        allowNull: false,
      },
      provider_user_id: {
        type: Sequelize.STRING(128),
        allowNull: false,
      },
      access_token: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      profile_json: {
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

    await queryInterface.addIndex('oauth_accounts', ['provider', 'provider_user_id'], {
      unique: true,
      name: 'uk_oauth_accounts_provider_user',
    });
    await queryInterface.addIndex('oauth_accounts', ['user_id'], {
      name: 'idx_oauth_accounts_user',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('oauth_accounts');
    await queryInterface.changeColumn('users', 'password_hash', {
      type: Sequelize.STRING(255),
      allowNull: false,
    });
  },
};
