import { DataTypes, Model } from 'sequelize';

export class FetchLog extends Model {}

export const initFetchLog = (sequelize) => {
  FetchLog.init(
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      targetId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
        field: 'target_id',
      },
      platform: {
        type: DataTypes.ENUM('weibo', 'xiaohongshu', 'douyin'),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('success', 'failed', 'skipped'),
        allowNull: false,
      },
      pageCount: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        field: 'page_count',
      },
      fetchedCount: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        field: 'fetched_count',
      },
      insertedCount: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        field: 'inserted_count',
      },
      message: {
        type: DataTypes.STRING(1024),
        allowNull: true,
      },
      startedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'started_at',
      },
      finishedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'finished_at',
      },
    },
    {
      sequelize,
      modelName: 'FetchLog',
      tableName: 'fetch_logs',
      updatedAt: false,
    },
  );

  return FetchLog;
};
