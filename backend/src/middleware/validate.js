const { validationResult } = require('express-validator');

/** Turns express-validator failures into the same envelope the error handler emits. */
module.exports = function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  res.status(422).json({
    success: false,
    error: 'Validation failed',
    details: result.array().map((e) => ({ field: e.path, message: e.msg }))
  });
};
