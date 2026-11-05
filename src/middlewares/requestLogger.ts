import morgan from 'morgan';
import { env } from '../config/env';

// Use 'dev' format in development for colored, concise output,
// and 'combined' format in production for standard Apache-style structured logs
export const requestLogger = morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined', {
    // Skip logging health checks to keep logs clean
    skip: (req) => req.url === '/health',
});
