import { DataTypes, Model } from 'sequelize';

export class User extends Model {}

export const initUser = (sequelize) => {
  User.init(
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      account: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true,
      },
      passwordHash: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'password_hash',
      },
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'users',
    },
  );

  return User;
};
