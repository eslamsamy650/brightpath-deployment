const { Router } = require('express');
const DashboardController = require('../controllers/dashboard.controller');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');
const { validate } = require('../middleware/validate');

const router = Router();

router.use(authenticate);

router.get(
  '/view-all/:section',
  validate(DashboardController.viewAllParamsSchema, 'params'),
  validate(DashboardController.viewAllQuerySchema, 'query'),
  asyncHandler(DashboardController.viewAll)
);

module.exports = router;
