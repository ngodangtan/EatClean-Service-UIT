import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { connectDB } from './config/db.js';
import api from './routes/index.js';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import logger from './utils/logger.js';

async function bootstrap() {
  await connectDB();

  const app = express();
  const PORT = process.env.PORT || 4000;

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: true, credentials: true }));
  app.use(requestLogger);
  app.use(express.json({ limit: '1mb' }));

  // rate limit
  app.use('/api', rateLimit({ windowMs: 60_000, max: 100 }), api);

  // Swagger UI for API documentation
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
  app.use(errorHandler);

  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Server listening on http://localhost:${PORT}`);
    logger.info(`Network access: http://<your-mac-ip>:${PORT}`);
  });
}

bootstrap().catch((e) => {
  logger.error('Failed to start:', e);
  process.exit(1);
});
