const { Router } = require('express');
const FinanceController = require('../controllers/finance.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');
const { validate } = require('../middleware/validate');

const WRITE_ROLES = ['SUPER_ADMIN', 'ADMIN', 'REGISTRAR', 'ACCOUNTANT'];

function crudRouter({ querySchema, bodySchema, updateSchema, handlers }) {
  const router = Router();
  router.use(authenticate);
  router.get('/', validate(querySchema, 'query'), asyncHandler(handlers.list));
  router.post(
    '/',
    authorize(...WRITE_ROLES),
    validate(bodySchema),
    asyncHandler(handlers.create)
  );
  router.put(
    '/:id',
    authorize(...WRITE_ROLES),
    validate(FinanceController.idParamsSchema, 'params'),
    validate(updateSchema),
    asyncHandler(handlers.update)
  );
  return router;
}

const router = Router();

router.use(
  '/fee-structures',
  crudRouter({
    querySchema: FinanceController.feeQuerySchema,
    bodySchema: FinanceController.feeBodySchema,
    updateSchema: FinanceController.updateFeeSchema,
    handlers: {
      list: FinanceController.listFeeStructures,
      create: FinanceController.createFeeStructure,
      update: FinanceController.updateFeeStructure,
    },
  })
);

router.use(
  '/installment-plans',
  crudRouter({
    querySchema: FinanceController.installmentPlanQuerySchema,
    bodySchema: FinanceController.installmentPlanBodySchema,
    updateSchema: FinanceController.updateInstallmentPlanSchema,
    handlers: {
      list: FinanceController.listInstallmentPlans,
      create: FinanceController.createInstallmentPlan,
      update: FinanceController.updateInstallmentPlan,
    },
  })
);

router.patch(
  '/installments/:id',
  authenticate,
  authorize(...WRITE_ROLES),
  validate(FinanceController.idParamsSchema, 'params'),
  validate(FinanceController.scheduleUpdateSchema),
  asyncHandler(FinanceController.updateInstallmentSchedule)
);

router.use(
  '/transactions',
  crudRouter({
    querySchema: FinanceController.transactionQuerySchema,
    bodySchema: FinanceController.transactionBodySchema,
    updateSchema: FinanceController.updateTransactionSchema,
    handlers: {
      list: FinanceController.listTransactions,
      create: FinanceController.createTransaction,
      update: FinanceController.updateTransaction,
    },
  })
);

router.use(
  '/discounts',
  crudRouter({
    querySchema: FinanceController.discountQuerySchema,
    bodySchema: FinanceController.discountBodySchema,
    updateSchema: FinanceController.updateDiscountSchema,
    handlers: {
      list: FinanceController.listDiscounts,
      create: FinanceController.createDiscount,
      update: FinanceController.updateDiscount,
    },
  })
);

router.post(
  '/discounts/apply',
  authenticate,
  authorize(...WRITE_ROLES),
  validate(FinanceController.applyDiscountSchema),
  asyncHandler(FinanceController.applyDiscount)
);

router.get(
  '/student-fees/:studentId',
  authenticate,
  validate(FinanceController.studentIdParamsSchema, 'params'),
  asyncHandler(FinanceController.getStudentFees)
);

router.post(
  '/assign-fees',
  authenticate,
  authorize(...WRITE_ROLES),
  validate(FinanceController.assignFeesBodySchema),
  asyncHandler(FinanceController.assignFees)
);

const paymentsRouter = Router();
paymentsRouter.use(authenticate);
paymentsRouter.get(
  '/',
  validate(FinanceController.transactionQuerySchema, 'query'),
  asyncHandler(FinanceController.listPayments)
);
paymentsRouter.post(
  '/',
  authorize(...WRITE_ROLES),
  validate(FinanceController.paymentBodySchema),
  asyncHandler(FinanceController.recordPayment)
);
router.use('/payments', paymentsRouter);

router.get(
  '/receipts/:id',
  authenticate,
  validate(FinanceController.idParamsSchema, 'params'),
  asyncHandler(FinanceController.getReceipt)
);

module.exports = router;
