import { AppError } from '../utils/AppError.js';

export function errorHandler(err, req, res, _next) {
  // AppError — our own controlled errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      message: err.message,
      statusCode: err.statusCode,
      errors: err.errors.length > 0 ? err.errors : undefined
    });
  }

  // Mongoose ValidationError
  if (err.name === 'ValidationError' && err.errors) {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      message: 'Validation failed',
      statusCode: 400,
      errors
    });
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      message: `Invalid ${err.path}: ${err.value}`,
      statusCode: 400
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      message: 'Invalid token',
      statusCode: 401
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      message: 'Token expired',
      statusCode: 401
    });
  }

  // Fallback
  const statusCode = err.statusCode || 500;
  return res.status(statusCode).json({
    message: statusCode === 500 ? 'Internal server error' : err.message,
    statusCode
  });
}
