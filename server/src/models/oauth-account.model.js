import { DataTypes, Model } from 'sequelize';

export class OAuthAccount extends Model {}

export const initOAuthAccount = (sequelize) => {
  OAuthAccount.init(
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
      provider: {
        type: DataTypes.STRING(32),
        allowNull: false,
      },
      providerUserId: {
        type: DataTypes.STRING(128),
        allowNull: false,
        field: 'provider_user_id',
      },
      accessToken: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'access_token',
      },
      profileJson: {
        type: DataTypes.JSON,
        allowNull: true,
        field: 'profile_json',
      },
    },
    {
      sequelize,
      modelName: 'OAuthAccount',
      tableName: 'oauth_accounts',
    },
  );

  return OAuthAccount;
};
