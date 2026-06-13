import axios from 'axios';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { URLSearchParams } from 'node:url';
import Joi from 'joi';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { OAuthAccount, User, sequelize } from '../models/index.js';

export const authSchema = Joi.object({
  account: Joi.string().trim().pattern(/^[A-Za-z0-9]{6,64}$/).required().messages({
    'string.pattern.base': '账号必须是 6-64 位英文或数字',
  }),
  password: Joi.string().pattern(/^[A-Za-z0-9]{6,64}$/).required().messages({
    'string.pattern.base': '密码必须是 6-64 位英文或数字',
  }),
});

export const baizhiExchangeSchema = Joi.object({
  token: Joi.string().trim().required(),
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

  if (!user?.passwordHash) {
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

export const baizhiAuthorize = async (ctx) => {
  const app = getBaizhiAppConfig(ctx.query.channel);
  ensureBaizhiConfig(app);

  const nonce = crypto.randomBytes(16).toString('hex');
  const sign = createBaizhiSign(app, nonce);
  const params = new URLSearchParams({
    app_id: app.appId,
    nonce,
    sign,
    app_name: app.appName,
  });

  ctx.body = {
    authorizeUrl: `${env.baizhi.oauthBaseUrl}/oauth-bridge?${params.toString()}`,
  };
};

export const baizhiExchange = async (ctx) => {
  const temporaryToken = ctx.request.body.token;
  const baizhiAccessToken = await exchangeBaizhiToken(temporaryToken);
  const profile = await fetchBaizhiProfile(baizhiAccessToken);
  const providerUserId = String(profile.userId || '').trim();

  if (!providerUserId) {
    ctx.status = 502;
    ctx.body = { error: '百智用户信息缺少 userId' };
    return;
  }

  const user = await findOrCreateBaizhiUser({
    providerUserId,
    accessToken: baizhiAccessToken,
    profile,
  });

  ctx.body = {
    token: signToken(user),
    user: toUserPayload(user),
  };
};

function getBaizhiAppConfig(channel = 'web') {
  if (channel === 'extension') {
    return {
      appId: env.baizhi.extensionAppId,
      appSecret: env.baizhi.extensionAppSecret,
      appName: env.baizhi.extensionAppName,
    };
  }

  return {
    appId: env.baizhi.appId,
    appSecret: env.baizhi.appSecret,
    appName: env.baizhi.appName,
  };
}

function ensureBaizhiConfig(app) {
  if (!app.appId || !app.appSecret || !app.appName) {
    const error = new Error('百智 OAuth 未配置');
    error.status = 500;
    error.expose = true;
    throw error;
  }
}

function createBaizhiSign(app, nonce) {
  return crypto
    .createHash('sha256')
    .update(`${app.appId}${app.appSecret}BAIZHIAPPLICATION${nonce}`, 'utf8')
    .digest('hex');
}

async function exchangeBaizhiToken(temporaryToken) {
  const { data } = await axios.post(
    `${env.baizhi.baseUrl}/api/applications/token/exchange`,
    { token: temporaryToken },
    { headers: { 'Content-Type': 'application/json' }, validateStatus: () => true },
  );
  const accessToken = data?.data?.token;

  if (data?.code !== 0 || !accessToken) {
    const error = new Error(data?.message || '百智 token 换取失败');
    error.status = 502;
    error.expose = true;
    throw error;
  }

  return accessToken;
}

async function fetchBaizhiProfile(accessToken) {
  const { data } = await axios.get(`${env.baizhi.oauthBaseUrl}/facade/auth/info`, {
    headers: {
      Accept: 'application/json, text/plain, */*',
      Authorization: `Bearer ${accessToken}`,
      'X-Requested-With': 'XMLHttpRequest',
    },
    validateStatus: () => true,
  });

  if (data?.success !== true || !data?.data) {
    const error = new Error(data?.message || '百智用户信息获取失败');
    error.status = 502;
    error.expose = true;
    throw error;
  }

  return data.data;
}

async function findOrCreateBaizhiUser({ providerUserId, accessToken, profile }) {
  const existing = await OAuthAccount.findOne({
    where: { provider: 'baizhi', providerUserId },
    include: [{ model: User, as: 'user' }],
  });

  if (existing?.user) {
    await existing.update({
      accessToken,
      profileJson: profile,
    });
    return existing.user;
  }

  return sequelize.transaction(async (transaction) => {
    const user = await User.create(
      {
        account: await createUniqueBaizhiAccount(providerUserId, transaction),
        passwordHash: null,
      },
      { transaction },
    );

    await OAuthAccount.create(
      {
        userId: user.id,
        provider: 'baizhi',
        providerUserId,
        accessToken,
        profileJson: profile,
      },
      { transaction },
    );

    return user;
  });
}

async function createUniqueBaizhiAccount(providerUserId, transaction) {
  const base = `bz${String(providerUserId).replace(/[^A-Za-z0-9]/g, '').slice(0, 54) || crypto.randomBytes(8).toString('hex')}`;

  for (let index = 0; index < 5; index += 1) {
    const account = index === 0 ? base.slice(0, 64) : `${base.slice(0, 55)}${crypto.randomBytes(4).toString('hex')}`;
    const existing = await User.findOne({ where: { account }, transaction });
    if (!existing) return account;
  }

  return `bz${crypto.randomBytes(31).toString('hex')}`.slice(0, 64);
}
