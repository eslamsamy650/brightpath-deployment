const { z } = require('zod');
const DashboardService = require('../services/dashboard.service');
const { sendSuccess } = require('../utils/response');
const { normalizeDoc } = require('../utils/serialize');

const viewAllParamsSchema = z.object({
  section: z.enum(DashboardService.sections),
});

const viewAllQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  })
  .passthrough();

async function viewAll(req, res) {
  const { data, meta } = await DashboardService.viewAll(
    req.user.sub,
    req.params.section,
    req.query
  );
  sendSuccess(res, normalizeDoc(data), 'Dashboard section retrieved', 200, meta);
}

module.exports = {
  viewAllParamsSchema,
  viewAllQuerySchema,
  viewAll,
};
