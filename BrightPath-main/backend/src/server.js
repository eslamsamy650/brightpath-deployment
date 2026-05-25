const http = require('http');
const { Server: SocketServer } = require('socket.io');

require('./config/env');
const { createApp } = require('./app');
const { env } = require('./config/env');
const { connectDatabase, disconnectDatabase } = require('./config/database');
const { logger } = require('./config/logger');
const { verifyAccessToken, extractBearerToken } = require('./utils/jwt');
const MessageService = require('./services/message.service');

async function bootstrap() {
  try {
    await connectDatabase();
    logger.info('✅  Database connected');
  } catch (err) {
    logger.error('❌  Database connection failed', { err });
    process.exit(1);
  }

  const app = createApp();
  const server = http.createServer(app);

  const io = new SocketServer(server, {
    cors: {
      origin: env.FRONTEND_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  const onlineUsers = new Map();

  io.use((socket, next) => {
    const raw = socket.handshake.auth.token;
    const token =
      typeof raw === 'string'
        ? extractBearerToken(/^Bearer\s/i.test(raw) ? raw : `Bearer ${raw}`)
        : null;
    if (!token) return next(new Error('Authentication required'));

    try {
      const payload = verifyAccessToken(token);
      socket.user = payload;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', socket => {
    /** @type {import('./utils/jwt').JwtPayload} */
    const user = socket.user;
    onlineUsers.set(user.sub, socket.id);
    logger.info(`🟢 Socket connected: ${user.email} [${user.role}]`);

    void socket.join(`user:${user.sub}`);

    socket.on('disconnect', () => {
      onlineUsers.delete(user.sub);
      logger.info(`🔴 Socket disconnected: ${user.email}`);
    });

    socket.on('message:send', async (payload = {}, ack) => {
      try {
        const body = payload.body ?? payload.content ?? payload.preview;
        const message = await MessageService.sendMessage({
          senderId: user.sub,
          receiverId: payload.receiverId,
          body,
        });

        logger.debug(`💬 Message from ${user.sub} to ${message.receiverId}: ${message.preview}`);
        io.to(`user:${message.receiverId}`).emit('message:new', message);
        io.to(`user:${message.receiverId}`).emit('notification:push', {
          type: 'NEW_MESSAGE',
          title: 'New message',
          body: message.preview,
          data: {
            messageId: message.id,
            conversationId: message.conversationId,
            senderId: message.senderId,
          },
        });
        io.to(`user:${user.sub}`).emit('message:sent', message);
        if (typeof ack === 'function') ack({ success: true, data: message });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Message could not be sent';
        logger.warn('Socket message send failed', { message, userId: user.sub });
        if (typeof ack === 'function') {
          ack({ success: false, message });
        } else {
          socket.emit('message:error', { message });
        }
      }
    });
  });

  app.set('io', io);

server.listen(env.PORT, '0.0.0.0', () => {
    logger.info(`🚀  BrightPath API running on port ${env.PORT} [${env.NODE_ENV}]`);
    logger.info(`📖  API prefix: ${env.API_PREFIX}`);
    logger.info(`🔗  Health check: http://localhost:${env.PORT}/health`);
  });

  const shutdown = signal => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(() => {
      disconnectDatabase()
        .then(() => {
          logger.info('Bye 👋');
          process.exit(0);
        })
        .catch(err => {
          logger.error('Error during database disconnect', {
            err: err instanceof Error ? err.message : String(err),
          });
          process.exit(1);
        });
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('uncaughtException', err => {
    logger.error('Uncaught exception', { err });
  });
  process.on('unhandledRejection', err => {
    logger.error('Unhandled rejection', { err });
  });
}

bootstrap();
