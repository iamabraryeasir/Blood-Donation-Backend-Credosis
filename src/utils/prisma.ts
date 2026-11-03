import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import pg from 'pg';
import { env } from '../config/env';

// Avoid multiple Prisma Client & pool instances during development hot-reloads
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pool?: pg.Pool;
};

export const pool =
  globalForPrisma.pool ??
  new pg.Pool({
    connectionString: env.DATABASE_URL,
  });

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pool = pool;
}

/**
 * Connect to PostgreSQL database via Prisma
 */
export const connectDatabase = async (): Promise<void> => {
  try {
    console.log('🔄 Connecting to PostgreSQL database via Prisma...');
    await prisma.$connect();
    console.log('✅ PostgreSQL database connected successfully.');
  } catch (error) {
    console.error('❌ Failed to connect to PostgreSQL database:', error);
    throw error;
  }
};

/**
 * Disconnect database clients gracefully
 */
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    await pool.end();
  } catch (error) {
    console.error('Error disconnecting database pool:', error);
  }
};
