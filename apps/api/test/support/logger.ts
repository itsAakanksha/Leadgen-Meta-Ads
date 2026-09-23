import { pino } from 'pino';

/** Silent logger so test output stays readable. */
export const silentLogger = pino({ level: 'silent' });
