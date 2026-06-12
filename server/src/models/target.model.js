import { DataTypes, Model } from 'sequelize';

export class Target extends Model {}

export const initTarget = (sequelize) => {
  Target.init(
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      platform: {
        type: DataTypes.ENUM('weibo', 'xiaohongshu', 'douyin'),
        allowNull: false,
        defaultValue: 'weibo',
      },
      platformTargetId: {
        type: DataTypes.STRING(128),
        allowNull: false,
        field: 'platform_target_id',
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Target',
      tableName: 'targets',
      indexes: [
        {
          unique: true,
          fields: ['platform', 'platform_target_id'],
        },
      ],
    },
  );

  return Target;
};
