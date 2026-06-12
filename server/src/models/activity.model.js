import { DataTypes, Model } from 'sequelize';

export class Activity extends Model {}

export const initActivity = (sequelize) => {
  Activity.init(
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      targetId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: 'target_id',
      },
      platform: {
        type: DataTypes.ENUM('weibo', 'xiaohongshu', 'douyin'),
        allowNull: false,
      },
      platformActivityId: {
        type: DataTypes.STRING(128),
        allowNull: false,
        field: 'platform_activity_id',
      },
      authorPlatformId: {
        type: DataTypes.STRING(128),
        allowNull: false,
        field: 'author_platform_id',
      },
      authorName: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'author_name',
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      sourceUrl: {
        type: DataTypes.STRING(1024),
        allowNull: true,
        field: 'source_url',
      },
      rawPayload: {
        type: DataTypes.JSON,
        allowNull: true,
        field: 'raw_payload',
      },
      publishedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'published_at',
      },
    },
    {
      sequelize,
      modelName: 'Activity',
      tableName: 'activities',
      indexes: [
        {
          unique: true,
          fields: ['platform', 'platform_activity_id'],
        },
      ],
    },
  );

  return Activity;
};
