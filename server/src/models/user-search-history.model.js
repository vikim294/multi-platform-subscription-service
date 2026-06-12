import { DataTypes, Model } from 'sequelize';

export class UserSearchHistory extends Model {}

export const initUserSearchHistory = (sequelize) => {
  UserSearchHistory.init(
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: 'user_id',
      },
      platform: {
        type: DataTypes.ENUM('weibo', 'xiaohongshu', 'douyin'),
        allowNull: false,
        defaultValue: 'weibo',
      },
      keyword: {
        type: DataTypes.STRING(128),
        allowNull: false,
      },
      searchCount: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 1,
        field: 'search_count',
      },
      lastSearchedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'last_searched_at',
      },
    },
    {
      sequelize,
      modelName: 'UserSearchHistory',
      tableName: 'user_search_histories',
      indexes: [
        { unique: true, fields: ['user_id', 'platform', 'keyword'] },
        { fields: ['user_id', 'last_searched_at'] },
      ],
    },
  );

  return UserSearchHistory;
};
