import { DataTypes, Model } from 'sequelize';

export class UserSubscription extends Model {}

export const initUserSubscription = (sequelize) => {
  UserSubscription.init(
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
    },
    {
      sequelize,
      modelName: 'UserSubscription',
      tableName: 'user_subscriptions',
      indexes: [
        {
          unique: true,
          fields: ['user_id', 'target_id'],
        },
      ],
    },
  );

  return UserSubscription;
};
