/**
 * Custom API Error class for structured operational errors
 */
export class ApiError extends Error {
  constructor(statusCode, message, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Async route handler wrapper to eliminate repetitive try/catch blocks
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/**
 * 404 Not Found middleware for unmatched API routes
 */
export const notFound = (req, res, next) => {
  const error = new ApiError(404, `API endpoint not found: ${req.method} ${req.originalUrl}`);
  next(error);
};

/**
 * Centralized Express Error Handling Middleware
 */
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);
  let message = err.message || 'Internal Server Error';

  // Handle Mongoose bad ObjectId CastError
  if (err.name === 'CastError') {
    statusCode = 404;
    message = 'Requested resource not found (Invalid ID format)';
  }

  // Handle MongoDB duplicate key error (E11000)
  if (err.code === 11000) {
    statusCode = 409;
    message = err.message.includes('Application')
      ? 'You have already submitted an application for this job opening'
      : 'A record with this unique value already exists';
  }

  // Handle Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(', ');
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token. Please log in again.';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Your session has expired. Please log in again.';
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(err.errors ? { errors: err.errors } : {}),
  });
};
