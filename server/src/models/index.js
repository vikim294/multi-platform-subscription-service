import { sequelize } from '../config/sequelize.js';
import { initActivity, Activity } from './activity.model.js';
import { initFetchLog, FetchLog } from './fetch-log.model.js';
import { initPlatformToken, PlatformToken } from './platform-token.model.js';
import { initTarget, Target } from './target.model.js';
import { initUser, User } from './user.model.js';
import { initUserSubscription, UserSubscription } from './user-subscription.model.js';

initUser(sequelize);
initPlatformToken(sequelize);
initTarget(sequelize);
initActivity(sequelize);
initFetchLog(sequelize);
initUserSubscription(sequelize);

Target.hasMany(Activity, { foreignKey: 'targetId', as: 'activities' });
Activity.belongsTo(Target, { foreignKey: 'targetId', as: 'target' });

Target.hasMany(FetchLog, { foreignKey: 'targetId', as: 'fetchLogs' });
FetchLog.belongsTo(Target, { foreignKey: 'targetId', as: 'target' });

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

export { sequelize, Activity, FetchLog, PlatformToken, Target, User, UserSubscription };
