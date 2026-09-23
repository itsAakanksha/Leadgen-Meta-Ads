import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { ZodError, ZodType } from 'zod';

import type { Logger } from './logger.js';

/** Base class for expected errors. The error handler turns these into the API error envelope. */
export class AppError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly httpStatus: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super('VALIDATION_ERROR', message, 400, details);
  }

  static fromZod(error: ZodError): ValidationError {
    const details = error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    return new ValidationError('Request validation failed', details);
  }
}

/** Validates input against a zod schema, throwing a 400 ValidationError on failure. */
export function parseOrThrow<T>(schema: ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw ValidationError.fromZod(result.error);
  return result.data;
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super('NOT_FOUND', message, 404);
  }
}

/** Optimistic locking: the client edited an outdated version of the resource. */
export class VersionConflictError extends AppError {
  constructor(currentVersion?: number) {
    super(
      'VERSION_CONFLICT',
      'This record was changed by someone else. Reload and try again.',
      409,
      currentVersion === undefined ? undefined : { currentVersion },
    );
  }
}

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new NotFoundError(`Route ${req.method} ${req.path} not found`));
};

type BodyParserError = Error & { type?: string };

export function createErrorHandler(logger: Logger): ErrorRequestHandler {
  return (err: unknown, req, res, _next) => {
    if (err instanceof AppError) {
      res.status(err.httpStatus).json({
        error: {
          code: err.code,
          message: err.message,
          ...(err.details === undefined ? {} : { details: err.details }),
        },
      });
      return;
    }

    // Errors raised by express.json() / express.raw() before our handlers run.
    const type = (err as BodyParserError | undefined)?.type;
    if (type === 'entity.parse.failed') {
      res
        .status(400)
        .json({ error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON' } });
      return;
    }
    if (type === 'entity.too.large') {
      res
        .status(413)
        .json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large' } });
      return;
    }

    // Unexpected: log the details, return nothing internal to the client.
    logger.error({ err, reqId: req.id }, 'Unhandled error');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
  };
}
