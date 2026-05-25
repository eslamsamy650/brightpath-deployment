const { Router } = require('express');
const PeopleController = require('../controllers/people.controller');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');
const { validate } = require('../middleware/validate');

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(PeopleController.getMySettings));

router.put(
  '/',
  validate(PeopleController.settingsSchema),
  asyncHandler(PeopleController.updateMySettings)
);

module.exports = router;
