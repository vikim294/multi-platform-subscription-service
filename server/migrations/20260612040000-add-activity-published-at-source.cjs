'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('activities', 'published_at_source', {
      type: Sequelize.ENUM('platform', 'fetched_at'),
      allowNull: false,
      defaultValue: 'platform',
      after: 'published_at',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('activities', 'published_at_source');
  },
};
