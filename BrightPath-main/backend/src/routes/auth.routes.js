const { Router } = require('express');
const AuthController = require('../controllers/auth.controller');
const { asyncHandler } = require('../middleware/asyncHandler');
const { validate } = require('../middleware/validate');

const router = Router();

router.post('/login', validate(AuthController.loginSchema), asyncHandler(AuthController.login));

router.post(
  '/refresh',
  validate(AuthController.refreshSchema),
  asyncHandler(AuthController.refresh)
);

router.post(
  '/logout',
  validate(AuthController.refreshSchema),
  asyncHandler(AuthController.logout)
);

module.exports = router;
