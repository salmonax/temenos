import pino from 'pino';

const level = (globalThis as { process?: { env?: Record<string, string | undefined> } })
  .process?.env?.LOG_LEVEL ?? 'info';

/**
 * Root logger. Consumers should derive a child logger with `{ trace_id }`
 * bound so every line tied to one run carries the identifier.
 */
export const logger = pino({
  level,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss.l',
      ignore: 'pid,hostname',
    },
  },
});

export function childLogger(bindings: Record<string, unknown>): pino.Logger {
  return logger.child(bindings);
}
