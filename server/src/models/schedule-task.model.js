import { DataTypes, Model } from 'sequelize';

export class ScheduleTask extends Model {}

export const initScheduleTask = (sequelize) => {
  ScheduleTask.init(
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      scheduleDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: 'schedule_date',
      },
      roundIndex: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        field: 'round_index',
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
      scheduledAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'scheduled_at',
      },
      status: {
        type: DataTypes.ENUM('pending', 'running', 'success', 'failed', 'skipped'),
        allowNull: false,
        defaultValue: 'pending',
      },
      startedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'started_at',
      },
      finishedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'finished_at',
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
    },
    {
      sequelize,
      modelName: 'ScheduleTask',
      tableName: 'schedule_tasks',
      indexes: [
        {
          unique: true,
          fields: ['schedule_date', 'round_index', 'target_id'],
        },
        {
          fields: ['status', 'scheduled_at'],
        },
      ],
    },
  );

  return ScheduleTask;
};
