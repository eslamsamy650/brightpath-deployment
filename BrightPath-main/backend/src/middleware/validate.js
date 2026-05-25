const { sendValidationError } = require('../utils/response');

/**
 * @param {import('zod').ZodSchema} schema
 * @param {'body'|'query'|'params'} target
 */
function validate(schema, target = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const errors = result.error.issues.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      sendValidationError(res, errors);
      return;
    }

    req[target] = result.data;
    next();
  };
}

module.exports = { validate };
