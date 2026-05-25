const { createHash } = require('crypto');
const { getPrisma } = require('../lib/prisma');
const { env } = require('../config/env');
const { toApiRole } = require('../utils/roles');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { AppError } = require('../middleware/errorHandler');

const prisma = getPrisma();
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function parseRefreshTtlMs() {
  const s = env.JWT_REFRESH_EXPIRES_IN;
  const match = /^(\d+)([smhd])$/.exec(s);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const n = parseInt(match[1], 10);
  const unit = match[2];
  const factors = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return n * factors[unit];
}

async function loginUser(input) {
  const emailLower = input.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: emailLower } });

  if (!user || !user.isActive) {
    throw new AppError('Invalid credentials', 401);
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new AppError('Account temporarily locked. Please try again later.', 423);
  }

  const bcrypt = require('bcryptjs');
  const passwordMatch = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordMatch) {
    await recordFailedLogin(user);
    throw new AppError('Invalid credentials', 401);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date(), failedLoginCount: 0, lockedUntil: null },
  });

  const apiRole = toApiRole(user.role);
  const payload = {
    sub: user.id,
    email: user.email,
    role: apiRole,
  };

  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  const expiresAt = new Date(Date.now() + parseRefreshTtlMs());

  await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt,
    },
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      role: apiRole,
    },
  };
}

async function recordFailedLogin(user) {
  const failedLoginCount = Number(user.failedLoginCount ?? 0) + 1;
  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginCount,
      lockedUntil:
        failedLoginCount >= MAX_FAILED_LOGIN_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MS) : null,
    },
  });
}

async function refreshTokens(token) {
  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw new AppError('Invalid refresh token', 401);
  }

  const stored = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
  });

  if (!stored || stored.expiresAt < new Date()) {
    throw new AppError('Refresh token expired or not found', 401);
  }

  await prisma.session.delete({ where: { id: stored.id } });

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.isActive) {
    throw new AppError('User not found or inactive', 401);
  }

  const apiRole = toApiRole(user.role);
  const newPayload = {
    sub: user.id,
    email: user.email,
    role: apiRole,
  };

  const accessToken = signAccessToken(newPayload);
  const newRefreshToken = signRefreshToken(newPayload);
  const expiresAt = new Date(Date.now() + parseRefreshTtlMs());

  await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(newRefreshToken),
      expiresAt,
    },
  });

  return { accessToken, refreshToken: newRefreshToken };
}

async function logoutUser(token) {
  await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}

async function hashPassword(password) {
  const bcrypt = require('bcryptjs');
  return bcrypt.hash(password, env.BCRYPT_ROUNDS);
}

module.exports = {
  loginUser,
  refreshTokens,
  logoutUser,
  hashPassword,
  recordFailedLogin,
};
