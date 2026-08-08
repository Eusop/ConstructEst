/** Wraps an async controller so a rejected promise reaches errorHandler via next(err). */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
