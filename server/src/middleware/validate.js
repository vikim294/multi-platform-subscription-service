export const validate = (schema, source = 'body') => async (ctx, next) => {
  const { value, error } = schema.validate(ctx.request[source], {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    ctx.status = 400;
    ctx.body = {
      error: 'Validation failed',
      details: error.details.map((detail) => detail.message),
    };
    return;
  }

  ctx.request[source] = value;
  await next();
};
