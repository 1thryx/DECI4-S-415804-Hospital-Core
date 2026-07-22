/** Forwards rejected promises from async route handlers into Express' error pipeline. */
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
