export const errorHandler = async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      ctx.status = 409;
      ctx.body = { error: 'Resource already exists' };
      return;
    }

    ctx.status = error.status || error.statusCode || 500;
    ctx.body = {
      error: ctx.status >= 500 ? 'Internal server error' : error.message,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    };

    ctx.app.emit('error', error, ctx);
  }
};
