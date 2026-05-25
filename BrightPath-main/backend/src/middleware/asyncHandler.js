function asyncHandler(fn) {
  return (req, res, next) => {
    void Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { asyncHandler };
