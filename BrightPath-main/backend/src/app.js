const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const { swaggerDocument } = require('./swagger');

const { env } = require('./config/env');
const { logger } = require('./config/logger');
const { errorHandler } = require('./middleware/errorHandler');
const apiRoutes = require('./routes');

function createApp() {
  const app = express();

  app.use(helmet());

  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  app.use(compression());

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  app.use(
    morgan('combined', {
      stream: {
        write: message => logger.info(message.trim()),
      },
      skip: () => env.NODE_ENV === 'test',
    })
  );

  app.use(
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.RATE_LIMIT_MAX_REQUESTS,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        message: 'Too many requests, please try again later.',
      },
    })
  );

  const uploadDir = env.UPLOAD_DIR;
  const uploadsAbs = path.isAbsolute(uploadDir) ? uploadDir : path.join(process.cwd(), uploadDir);
  app.use('/uploads', express.static(uploadsAbs));

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  app.get('/api-docs.json', (_req, res) => {
    res.json(swaggerDocument);
  });

  app.use(env.API_PREFIX, apiRoutes);

  app.use((_req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
  });

  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
