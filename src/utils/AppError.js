export class AppError extends Error {
  constructor(statusCode, message, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

export const badRequest = (message = 'Bad request', errors = []) =>
  new AppError(400, message, errors);

export const unauthorized = (message = 'Unauthorized') =>
  new AppError(401, message);

export const forbidden = (message = 'Forbidden') =>
  new AppError(403, message);

export const notFound = (message = 'Not found') =>
  new AppError(404, message);

export const conflict = (message = 'Conflict') =>
  new AppError(409, message);

export const tooManyRequests = (message = 'Too many requests') =>
  new AppError(429, message);

export const internal = (message = 'Internal server error') =>
  new AppError(500, message);
