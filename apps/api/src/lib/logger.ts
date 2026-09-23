import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { pino, type Logger } from 'pino';
import { pinoHttp } from 'pino-http';

import type { Config } from './config.js';

export type { Logger };

export function createLogger(level: Config['logLevel']): Logger {
  return pino({ level });
}

const MAX_REQUEST_ID_LENGTH = 100;

/**
 * Request logging. Logs method, path, status and duration only:
 * no headers (auth, signatures, cookies), no bodies (PII) and no query strings
 * (the Meta handshake carries the verify token in the query).
 */
export function createHttpLogger(logger: Logger) {
  return pinoHttp({
    logger,
    genReqId(req: IncomingMessage, res: ServerResponse) {
      const incoming = req.headers['x-request-id'];
      const id =
        typeof incoming === 'string' &&
        incoming.length > 0 &&
        incoming.length <= MAX_REQUEST_ID_LENGTH
          ? incoming
          : randomUUID();
      res.setHeader('X-Request-Id', id);
      return id;
    },
    customLogLevel(_req, res, err) {
      if (err || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    serializers: {
      req: (req: { id: string; method: string; url: string }) => ({
        id: req.id,
        method: req.method,
        path: req.url.split('?')[0],
      }),
      res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
    },
  });
}
