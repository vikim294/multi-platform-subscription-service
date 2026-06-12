import { DataTypes, Model } from 'sequelize';

export class TargetFollowerStat extends Model {}

export const initTargetFollowerStat = (sequelize) => {
  TargetFollowerStat.init(
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
      statDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: 'stat_date',
      },
      followersCount: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        field: 'followers_count',
      },
      deltaCount: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'delta_count',
      },
      capturedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'captured_at',
      },
      rawPayload: {
        type: DataTypes.JSON,
        allowNull: true,
        field: 'raw_payload',
      },
    },
    {
      sequelize,
      modelName: 'TargetFollowerStat',
      tableName: 'target_follower_stats',
      indexes: [
        {
          unique: true,
          fields: ['target_id', 'stat_date'],
        },
        {
          fields: ['target_id', 'captured_at'],
        },
      ],
    },
  );

  return TargetFollowerStat;
};
