import { getLocalDateKey, listScheduleForDate } from '../../services/fetch/scheduler.service.js';

export const getTodaySchedule = async (ctx) => {
  ctx.body = await listScheduleForDate(getLocalDateKey());
};
