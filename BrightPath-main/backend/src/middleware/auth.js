const { verifyAccessToken, extractBearerToken } = require('../utils/jwt');
const { sendUnauthorized, sendForbidden } = require('../utils/response');
const { isRoleAllowed } = require('../utils/roles');

function authenticate(req, res, next) {
  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    sendUnauthorized(res, 'No token provided');
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch {
    sendUnauthorized(res, 'Invalid or expired token');
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    const user = req.user;
    if (!user) {
      sendUnauthorized(res);
      return;
    }
    if (!isRoleAllowed(user.role, ...roles)) {
      sendForbidden(res, `Access restricted to: ${roles.join(', ')}`);
      return;
    }
    next();
  };
}

function optionalAuth(req, _res, next) {
  const token = extractBearerToken(req.headers.authorization);
  if (token) {
    try {
      req.user = verifyAccessToken(token);
    } catch {
      // invalid token — continue unauthenticated
    }
  }
  next();
}

module.exports = { authenticate, authorize, optionalAuth };
