import { listTargetStats } from '../../services/stats/target-stats.service.js';

export const getTargetStats = async (ctx) => {
  ctx.body = await listTargetStats(ctx.params.id, {
    startDate: ctx.query.startDate,
    endDate: ctx.query.endDate,
  });
};
