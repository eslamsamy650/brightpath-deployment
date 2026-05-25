const { ZodError } = require('zod');
const { Prisma } = require('@prisma/client');
const multer = require('multer');
const { logger } = require('../config/logger');
const { sendError } = require('../utils/response');

class AppError extends Error {
  /**
   * @param {string} message
   * @param {number} [statusCode]
   */
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

function errorHandler(err, req, res, _next) {
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  if (err instanceof AppError) {
    sendError(res, err.message, err.statusCode);
    return;
  }

  if (err instanceof ZodError || err.constructor?.name === 'ZodError') {
    const issues = Array.isArray(err.issues)
      ? err.issues
      : Array.isArray(err.errors)
        ? err.errors
        : [];
    const errors = issues.map(e => ({
      field: Array.isArray(e.path) ? e.path.join('.') : String(e.path ?? ''),
      message: String(e.message),
    }));
    sendError(res, 'Validation failed', 422, errors);
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      sendError(res, 'A record with this unique field already exists.', 409);
      return;
    }
    if (err.code === 'P2025') {
      sendError(res, 'Record not found.', 404);
      return;
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    sendError(res, 'Invalid database query.', 400);
    return;
  }

  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'Uploaded file is too large.'
        : err.code === 'LIMIT_FILE_COUNT'
          ? 'Too many files uploaded.'
          : 'Invalid file upload.';
    sendError(res, message, 422);
    return;
  }

  sendError(res, 'Internal server error', 500);
}

module.exports = {
  AppError,
  errorHandler,
};
