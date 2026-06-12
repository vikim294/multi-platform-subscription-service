import cron from 'node-cron';
import { Op } from 'sequelize';
import { env } from '../../config/env.js';
import { ScheduleTask, Target } from '../../models/index.js';
import { logger } from '../../utils/logger.js';
import { randomInt, sleep } from '../../utils/sleep.js';
import { fetchTarget } from './fetch-target.service.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const POLL_INTERVAL_MS = 1000;

let isManualFetchRunning = false;
let isScheduleTaskRunning = false;
let pollTimer = null;

const pad = (value) => String(value).padStart(2, '0');

export const getLocalDateKey = (date = new Date()) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const getDayStart = (dateKey) => new Date(`${dateKey}T00:00:00`);

const getRoundStartAt = (dateKey, roundIndex) => {
  const segmentMs = Math.floor(DAY_MS / env.schedulerRoundsPerDay);

  if (segmentMs <= env.schedulerMinRoundGapMs) {
    throw new Error('SCHEDULER_ROUNDS_PER_DAY is too high for SCHEDULER_MIN_ROUND_GAP_MS');
  }

  return new Date(getDayStart(dateKey).getTime() + (roundIndex - 1) * segmentMs);
};

const buildRoundOffsets = (targetCount) => {
  if (targetCount === 0) return [];

  const strictTaskGapMs = env.schedulerMinTaskGapMs + 1;
  const minWindowMs = strictTaskGapMs * Math.max(targetCount - 1, 0);
  const effectiveWindowMs = Math.max(env.schedulerRoundWindowMs, minWindowMs + 1);
  const slackMs = Math.max(effectiveWindowMs - minWindowMs, 0);
  const cuts = Array.from({ length: targetCount }, () => randomInt(0, slackMs)).sort((a, b) => a - b);

  return cuts.map((cut, index) => index * strictTaskGapMs + cut);
};

const buildRoundRows = (dateKey, roundIndex, targets) => {
  const roundStartAt = getRoundStartAt(dateKey, roundIndex);
  const offsets = buildRoundOffsets(targets.length);

  return targets.map((target, index) => ({
    scheduleDate: dateKey,
    roundIndex,
    targetId: target.id,
    platform: target.platform,
    scheduledAt: new Date(roundStartAt.getTime() + offsets[index]),
    status: 'pending',
  }));
};

const createRowsForRounds = async (dateKey, roundIndexes) => {
  const targets = await Target.findAll({ order: [['id', 'ASC']] });

  if (targets.length === 0) return 0;

  const rows = roundIndexes.flatMap((roundIndex) => buildRoundRows(dateKey, roundIndex, targets));
  await ScheduleTask.bulkCreate(rows, { ignoreDuplicates: true });
  return rows.length;
};

export const ensureScheduleForDate = async (dateKey = getLocalDateKey()) => {
  const count = await ScheduleTask.count({ where: { scheduleDate: dateKey } });

  if (count > 0) {
    return { created: false, taskCount: count };
  }

  const now = new Date();
  const isToday = dateKey === getLocalDateKey(now);
  const isMidnightGeneration = isToday && now.getTime() - getDayStart(dateKey).getTime() <= 60000;
  const roundIndexes = Array.from({ length: env.schedulerRoundsPerDay }, (_, index) => index + 1).filter(
    (roundIndex) => !isToday || isMidnightGeneration || getRoundStartAt(dateKey, roundIndex).getTime() > now.getTime(),
  );
  const taskCount = await createRowsForRounds(dateKey, roundIndexes);
  return { created: true, taskCount };
};

export const replanPendingFutureRounds = async (dateKey = getLocalDateKey()) => {
  await ensureScheduleForDate(dateKey);

  const now = new Date();
  const replannedRounds = [];

  for (let roundIndex = 1; roundIndex <= env.schedulerRoundsPerDay; roundIndex += 1) {
    const roundStartAt = getRoundStartAt(dateKey, roundIndex);
    const tasks = await ScheduleTask.findAll({
      where: { scheduleDate: dateKey, roundIndex },
      order: [['scheduledAt', 'ASC']],
    });
    const roundIsFuture = roundStartAt.getTime() > now.getTime();
    const roundIsUntouched = tasks.every(
      (task) => task.status === 'pending' && task.scheduledAt.getTime() > now.getTime(),
    );

    if (!roundIsFuture || !roundIsUntouched) continue;

    await ScheduleTask.destroy({
      where: {
        scheduleDate: dateKey,
        roundIndex,
        status: 'pending',
      },
    });
    await createRowsForRounds(dateKey, [roundIndex]);
    replannedRounds.push(roundIndex);
  }

  return { date: dateKey, replannedRounds };
};

const runDueScheduleTask = async () => {
  if (isScheduleTaskRunning) return;

  const task = await ScheduleTask.findOne({
    where: {
      status: 'pending',
      scheduledAt: { [Op.lte]: new Date() },
    },
    order: [
      ['scheduledAt', 'ASC'],
      ['id', 'ASC'],
    ],
    include: [{ model: Target, as: 'target' }],
  });

  if (!task) return;

  isScheduleTaskRunning = true;

  try {
    const [updatedCount] = await ScheduleTask.update(
      {
        status: 'running',
        startedAt: new Date(),
        message: null,
      },
      {
        where: {
          id: task.id,
          status: 'pending',
        },
      },
    );

    if (updatedCount === 0) return;

    if (!task.target) {
      await task.update({
        status: 'skipped',
        finishedAt: new Date(),
        message: 'Target not found',
      });
      return;
    }

    const result = await fetchTarget(task.target);
    await task.update({
      status: result.status,
      fetchedCount: result.fetchedCount,
      insertedCount: result.insertedCount,
      finishedAt: new Date(),
      message: result.reason || null,
    });
  } catch (error) {
    await ScheduleTask.update(
      {
        status: 'failed',
        finishedAt: new Date(),
        message: error.message.slice(0, 1024),
      },
      { where: { id: task.id } },
    );
    logger.error(`Schedule task ${task.id} failed:`, error.message);
  } finally {
    isScheduleTaskRunning = false;
  }
};

export const fetchAllTargetsSequentially = async () => {
  if (isManualFetchRunning) {
    return { accepted: false, reason: 'Fetch loop is already running' };
  }

  isManualFetchRunning = true;

  try {
    const targets = await Target.findAll({
      order: [['id', 'ASC']],
    });

    for (let index = 0; index < targets.length; index += 1) {
      const target = targets[index];

      try {
        await fetchTarget(target);
      } catch (error) {
        logger.error(`Fetch target ${target.id} failed:`, error.message);
      }

      if (index < targets.length - 1) {
        const seconds = randomInt(env.fetchMinDelaySeconds, env.fetchMaxDelaySeconds);
        await sleep(seconds * 1000);
      }
    }

    return { accepted: true, targetCount: targets.length };
  } finally {
    isManualFetchRunning = false;
  }
};

export const listScheduleForDate = async (dateKey = getLocalDateKey()) => {
  await ensureScheduleForDate(dateKey);

  const tasks = await ScheduleTask.findAll({
    where: { scheduleDate: dateKey },
    order: [
      ['roundIndex', 'ASC'],
      ['scheduledAt', 'ASC'],
    ],
    include: [{ model: Target, as: 'target', attributes: ['id', 'name', 'platformTargetId'] }],
  });

  const rounds = Array.from({ length: env.schedulerRoundsPerDay }, (_, index) => ({
    roundIndex: index + 1,
    tasks: [],
  }));

  for (const task of tasks) {
    const round = rounds[task.roundIndex - 1];
    if (!round) continue;

    round.tasks.push({
      id: task.id,
      targetId: task.targetId,
      targetName: task.target?.name || null,
      platformTargetId: task.target?.platformTargetId || null,
      platform: task.platform,
      scheduledAt: task.scheduledAt,
      status: task.status,
      startedAt: task.startedAt,
      finishedAt: task.finishedAt,
      fetchedCount: task.fetchedCount,
      insertedCount: task.insertedCount,
      message: task.message,
    });
  }

  return {
    date: dateKey,
    summary: {
      total: tasks.length,
      pending: tasks.filter((task) => task.status === 'pending').length,
      running: tasks.filter((task) => task.status === 'running').length,
      success: tasks.filter((task) => task.status === 'success').length,
      failed: tasks.filter((task) => task.status === 'failed').length,
      skipped: tasks.filter((task) => task.status === 'skipped').length,
    },
    rounds,
  };
};

export const startScheduler = async () => {
  await ensureScheduleForDate();

  cron.schedule('0 0 * * *', () => {
    ensureScheduleForDate().catch((error) => {
      logger.error('Daily schedule generation failed:', error.message);
    });
  });

  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => {
    runDueScheduleTask().catch((error) => {
      logger.error('Schedule task polling failed:', error.message);
    });
  }, POLL_INTERVAL_MS);

  logger.info(`Persistent scheduler started with ${env.schedulerRoundsPerDay} rounds per day`);
};
