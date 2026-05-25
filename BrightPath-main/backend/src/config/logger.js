const winston = require('winston');
const path = require('path');
const fs = require('fs');
const { env } = require('./env');

const logDir = path.isAbsolute(env.LOG_DIR) ? env.LOG_DIR : path.join(process.cwd(), env.LOG_DIR);
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

const { combine, timestamp, colorize, printf, json, errors } = winston.format;

const consoleFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(info => {
    const lvl = info.level != null ? String(info.level) : '';
    const msg = info.message != null ? String(info.message) : '';
    const ts = info.timestamp != null ? String(info.timestamp) : '';
    const stack = info.stack;
    let stk = '';
    if (stack !== undefined && stack !== null) {
      if (typeof stack === 'string') stk = stack;
      else if (stack instanceof Error) stk = stack.stack ?? stack.message;
      else stk = JSON.stringify(stack);
    }
    return stk ? `${ts} [${lvl}] ${msg}\n${stk}` : `${ts} [${lvl}] ${msg}`;
  })
);

const fileFormat = combine(timestamp(), errors({ stack: true }), json());

const transports = [];

if (env.NODE_ENV !== 'production') {
  transports.push(new winston.transports.Console({ format: consoleFormat }));
}

transports.push(
  new winston.transports.File({
    filename: path.join(logDir, 'combined.log'),
    format: fileFormat,
  }),
  new winston.transports.File({
    filename: path.join(logDir, 'error.log'),
    level: 'error',
    format: fileFormat,
  })
);

const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  transports,
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'exceptions.log'),
    }),
  ],
});

module.exports.logger = logger;
