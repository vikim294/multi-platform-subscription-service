import bcrypt from 'bcryptjs';
import Joi from 'joi';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/index.js';

export const authSchema = Joi.object({
  account: Joi.string().trim().pattern(/^[A-Za-z0-9]{6,64}$/).required().messages({
    'string.pattern.base': '账号必须是 6-64 位英文或数字',
  }),
  password: Joi.string().pattern(/^[A-Za-z0-9]{6,64}$/).required().messages({
    'string.pattern.base': '密码必须是 6-64 位英文或数字',
  }),
});

const signToken = (user) =>
  jwt.sign(
    {
      account: user.account,
    },
    env.jwtSecret,
    {
      subject: String(user.id),
      expiresIn: '30d',
    },
  );

const toUserPayload = (user) => ({
  id: user.id,
  account: user.account,
});

export const register = async (ctx) => {
  const { account, password } = ctx.request.body;
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ account, passwordHash });

  ctx.status = 201;
  ctx.body = {
    token: signToken(user),
    user: toUserPayload(user),
  };
};

export const login = async (ctx) => {
  const { account, password } = ctx.request.body;
  const user = await User.findOne({ where: { account } });

  if (!user) {
    ctx.status = 401;
    ctx.body = { error: '账号或密码错误' };
    return;
  }

  const matched = await bcrypt.compare(password, user.passwordHash);
  if (!matched) {
    ctx.status = 401;
    ctx.body = { error: '账号或密码错误' };
    return;
  }

  ctx.body = {
    token: signToken(user),
    user: toUserPayload(user),
  };
};

export const me = async (ctx) => {
  ctx.body = {
    user: toUserPayload(ctx.state.user),
  };
};
