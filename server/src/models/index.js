import { sequelize } from '../config/sequelize.js';
import { initActivityNotification, ActivityNotification } from './activity-notification.model.js';
import { initActivity, Activity } from './activity.model.js';
import { initFetchLog, FetchLog } from './fetch-log.model.js';
import { initPlatformToken, PlatformToken } from './platform-token.model.js';
import { initScheduleTask, ScheduleTask } from './schedule-task.model.js';
import { initTarget, Target } from './target.model.js';
import { initTargetFollowerStat, TargetFollowerStat } from './target-follower-stat.model.js';
import { initUser, User } from './user.model.js';
import { initUserSubscription, UserSubscription } from './user-subscription.model.js';

initUser(sequelize);
initPlatformToken(sequelize);
initTarget(sequelize);
initTargetFollowerStat(sequelize);
initActivity(sequelize);
initActivityNotification(sequelize);
initFetchLog(sequelize);
initUserSubscription(sequelize);
initScheduleTask(sequelize);

Target.hasMany(Activity, { foreignKey: 'targetId', as: 'activities' });
Activity.belongsTo(Target, { foreignKey: 'targetId', as: 'target' });

User.hasMany(ActivityNotification, { foreignKey: 'userId', as: 'activityNotifications' });
ActivityNotification.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Target.hasMany(ActivityNotification, { foreignKey: 'targetId', as: 'activityNotifications' });
ActivityNotification.belongsTo(Target, { foreignKey: 'targetId', as: 'target' });
Activity.hasMany(ActivityNotification, { foreignKey: 'activityId', as: 'notifications' });
ActivityNotification.belongsTo(Activity, { foreignKey: 'activityId', as: 'activity' });

Target.hasMany(FetchLog, { foreignKey: 'targetId', as: 'fetchLogs' });
FetchLog.belongsTo(Target, { foreignKey: 'targetId', as: 'target' });

Target.hasMany(ScheduleTask, { foreignKey: 'targetId', as: 'scheduleTasks' });
ScheduleTask.belongsTo(Target, { foreignKey: 'targetId', as: 'target' });

Target.hasMany(TargetFollowerStat, { foreignKey: 'targetId', as: 'followerStats' });
TargetFollowerStat.belongsTo(Target, { foreignKey: 'targetId', as: 'target' });

User.belongsToMany(Target, {
  through: UserSubscription,
  foreignKey: 'userId',
  otherKey: 'targetId',
  as: 'subscribedTargets',
});
Target.belongsToMany(User, {
  through: UserSubscription,
  foreignKey: 'targetId',
  otherKey: 'userId',
  as: 'subscribers',
});

User.hasMany(UserSubscription, { foreignKey: 'userId', as: 'subscriptions' });
UserSubscription.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Target.hasMany(UserSubscription, { foreignKey: 'targetId', as: 'subscriptions' });
UserSubscription.belongsTo(Target, { foreignKey: 'targetId', as: 'target' });

export {
  sequelize,
  Activity,
  ActivityNotification,
  FetchLog,
  PlatformToken,
  ScheduleTask,
  Target,
  TargetFollowerStat,
  User,
  UserSubscription,
};
