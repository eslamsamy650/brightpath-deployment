/**
 * Consistent JSON response helpers (Prisma-era API surface preserved).
 */

function sendSuccess(res, data, message = 'Success', statusCode = 200, meta) {
  /** @type {Record<string, unknown>} */
  const body = { success: true, message, data };
  if (meta) body.meta = meta;
  res.status(statusCode).json(body);
}

function sendCreated(res, data, message = 'Created') {
  sendSuccess(res, data, message, 201);
}

function sendNoContent(res) {
  res.status(204).send();
}

function sendError(res, message, statusCode = 500, errors) {
  /** @type {Record<string, unknown>} */
  const body = { success: false, message };
  if (errors) body.errors = errors;
  res.status(statusCode).json(body);
}

function sendValidationError(res, errors) {
  sendError(res, 'Validation failed', 422, errors);
}

function sendUnauthorized(res, message = 'Unauthorized') {
  sendError(res, message, 401);
}

function sendForbidden(res, message = 'Forbidden') {
  sendError(res, message, 403);
}

function sendNotFound(res, resource = 'Resource') {
  sendError(res, `${resource} not found`, 404);
}

function buildPaginationMeta(total, page, limit) {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

function getPaginationSkipTake(page, limit) {
  return { skip: (page - 1) * limit, take: limit };
}

module.exports = {
  sendSuccess,
  sendCreated,
  sendNoContent,
  sendError,
  sendValidationError,
  sendUnauthorized,
  sendForbidden,
  sendNotFound,
  buildPaginationMeta,
  getPaginationSkipTake,
};
