import { FetchLog, Target } from '../../models/index.js';
import { fetchTarget } from '../../services/fetch/fetch-target.service.js';
import { fetchAllTargetsSequentially } from '../../services/fetch/scheduler.service.js';

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const fetchOneTarget = async (ctx) => {
  const target = await Target.findByPk(ctx.params.id);

  if (!target) {
    ctx.status = 404;
    ctx.body = { error: 'Target not found' };
    return;
  }

  ctx.body = await fetchTarget(target);
};

export const fetchAllTargets = async (ctx) => {
  fetchAllTargetsSequentially().catch((error) => {
    ctx.app.emit('error', error, ctx);
  });

  ctx.status = 202;
  ctx.body = { accepted: true };
};

export const listFetchLogs = async (ctx) => {
  const page = toInt(ctx.query.page, 1);
  const pageSize = Math.min(toInt(ctx.query.pageSize, 20), 100);
  const where = {};

  if (ctx.query.platform) where.platform = ctx.query.platform;
  if (ctx.query.targetId) where.targetId = ctx.query.targetId;

  const { rows, count } = await FetchLog.findAndCountAll({
    where,
    order: [['id', 'DESC']],
    limit: pageSize,
    offset: (page - 1) * pageSize,
    include: [{ model: Target, as: 'target', attributes: ['id', 'name'] }],
  });

  ctx.body = {
    items: rows.map((log) => ({
      id: log.id,
      targetId: log.targetId,
      targetName: log.target?.name,
      platform: log.platform,
      status: log.status,
      pageCount: log.pageCount,
      fetchedCount: log.fetchedCount,
      insertedCount: log.insertedCount,
      message: log.message,
      startedAt: log.startedAt,
      finishedAt: log.finishedAt,
    })),
    page,
    pageSize,
    total: count,
  };
};
