import { sequelize } from '../config/sequelize.js';
import { initActivity, Activity } from './activity.model.js';
import { initFetchLog, FetchLog } from './fetch-log.model.js';
import { initPlatformToken, PlatformToken } from './platform-token.model.js';
import { initTarget, Target } from './target.model.js';

initPlatformToken(sequelize);
initTarget(sequelize);
initActivity(sequelize);
initFetchLog(sequelize);

Target.hasMany(Activity, { foreignKey: 'targetId', as: 'activities' });
Activity.belongsTo(Target, { foreignKey: 'targetId', as: 'target' });

Target.hasMany(FetchLog, { foreignKey: 'targetId', as: 'fetchLogs' });
FetchLog.belongsTo(Target, { foreignKey: 'targetId', as: 'target' });

export { sequelize, Activity, FetchLog, PlatformToken, Target };
