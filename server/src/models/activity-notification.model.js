import { DataTypes, Model } from 'sequelize';

export class ActivityNotification extends Model {}

export const initActivityNotification = (sequelize) => {
  ActivityNotification.init(
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
      targetId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: 'target_id',
      },
      activityId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: 'activity_id',
      },
      readAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'read_at',
      },
    },
    {
      sequelize,
      modelName: 'ActivityNotification',
      tableName: 'activity_notifications',
      indexes: [
        {
          unique: true,
          fields: ['user_id', 'activity_id'],
        },
        {
          fields: ['user_id', 'read_at', 'created_at'],
        },
      ],
    },
  );

  return ActivityNotification;
};
