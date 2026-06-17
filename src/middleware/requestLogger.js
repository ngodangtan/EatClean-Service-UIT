import crypto from 'node:crypto';
import logger from '../utils/logger.js';

const SENSITIVE_KEYS = new Set(['password', 'confirmPassword', 'refreshToken', 'token', 'accessToken']);

function sanitize(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, SENSITIVE_KEYS.has(k) ? '[REDACTED]' : v])
  );
}

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
      userId: req.user?.id,
      params: Object.keys(req.params).length ? req.params : undefined,
      query: Object.keys(req.query).length ? req.query : undefined,
      body: req.body && Object.keys(req.body).length ? sanitize(req.body) : undefined
    });
  });

  next();
}
