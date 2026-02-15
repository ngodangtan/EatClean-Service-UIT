import crypto from 'node:crypto';
import logger from '../utils/logger.js';

export function requestLogger(req, res, next) {
  const requestId = crypto.randomUUID();
  req.requestId = requestId;
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`, {
      requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      duration,
      userId: req.user?.id
    });
  });

  next();
}
