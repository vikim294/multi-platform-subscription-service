const buckets = new Map();

export const userRateLimit = (name, options) => async (ctx, next) => {
  const windowMs = Number(options?.windowMs || 60_000);
  const max = Number(options?.max || 60);
  const userId = ctx.state.user?.id || 'anonymous';
  const key = `${name}:${userId}`;
  const now = Date.now();
  const bucket = buckets.get(key) || [];
  const recent = bucket.filter((timestamp) => now - timestamp < windowMs);

  if (recent.length >= max) {
    ctx.status = 429;
    ctx.body = { error: 'rate_limit_exceeded' };
    buckets.set(key, recent);
    return;
  }

  recent.push(now);
  buckets.set(key, recent);
  await next();
};
