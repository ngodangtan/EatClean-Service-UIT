import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { connectDB } from './config/db.js';
import api from './routes/index.js';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger.js';

async function bootstrap() {
  await connectDB();

  const app = express();
  const PORT = process.env.PORT || 4000;

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: true, credentials: true }));
  app.use(morgan('dev'));
  app.use(express.json({ limit: '1mb' }));

  // rate limit cơ bản
  app.use('/api', rateLimit({ windowMs: 60_000, max: 100 }), api);

  // Swagger UI for API documentation (minimal)
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
  app.use((err, req, res, _next) => {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  });

  app.listen(PORT, () => console.log(`🚀 Server listening on http://localhost:${PORT}`));
}

bootstrap().catch((e) => {
  console.error('Failed to start:', e);
  process.exit(1);
});
