const jwt = require('jsonwebtoken');
const { env } = require('../config/env');

/** @typedef {{ sub: string, email: string, role: string, iat?: number, exp?: number }} JwtPayload */

function signAccessToken(payload) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  });
}

/** @returns {JwtPayload} */
function verifyAccessToken(token) {
  return /** @type {JwtPayload} */ (jwt.verify(token, env.JWT_ACCESS_SECRET));
}

/** @returns {JwtPayload} */
function verifyRefreshToken(token) {
  return /** @type {JwtPayload} */ (jwt.verify(token, env.JWT_REFRESH_SECRET));
}

function extractBearerToken(authHeader) {
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  extractBearerToken,
};
