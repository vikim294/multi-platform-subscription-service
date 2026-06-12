import { DataTypes, Model } from 'sequelize';

export class PlatformToken extends Model {}

export const initPlatformToken = (sequelize) => {
  PlatformToken.init(
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      platform: {
        type: DataTypes.ENUM('weibo', 'xiaohongshu', 'douyin'),
        allowNull: false,
        unique: true,
      },
      cookie: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'PlatformToken',
      tableName: 'platform_tokens',
    },
  );

  return PlatformToken;
};
