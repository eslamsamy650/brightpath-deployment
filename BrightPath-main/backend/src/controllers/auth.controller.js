const { z } = require('zod');
const AuthService = require('../services/auth.service');
const { sendSuccess, sendNoContent } = require('../utils/response');

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

async function login(req, res, next) {
  try {
    const result = await AuthService.loginUser(req.body);
    sendSuccess(res, result, 'Login successful');
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    const tokens = await AuthService.refreshTokens(refreshToken);
    sendSuccess(res, tokens, 'Tokens refreshed');
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const { refreshToken } = req.body;
    await AuthService.logoutUser(refreshToken);
    sendNoContent(res);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  loginSchema,
  refreshSchema,
  login,
  refresh,
  logout,
};
