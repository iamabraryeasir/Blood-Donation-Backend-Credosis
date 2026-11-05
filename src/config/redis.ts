import { type RedisClientType, createClient } from 'redis';
import { env } from './env';

// Initialize singleton Redis client
export const redisClient: RedisClientType = createClient({
    url: env.REDIS_URL,
    socket: {
        reconnectStrategy: (retries: number) => {
            if (retries > 15) {
                console.error('❌ Redis reconnection attempts exhausted (max: 15).');
                return new Error('Redis reconnection exhausted');
            }
            return Math.min(retries * 150, 3000);
        },
    },
});

// Event listeners
redisClient.on('connect', () => {
    console.log('🔄 Connecting to Redis...');
});

redisClient.on('ready', () => {
    console.log('✅ Redis client ready and connected successfully.');
});

redisClient.on('error', (err: Error) => {
    console.error('❌ Redis Client Error:', err.message);
});

redisClient.on('reconnecting', () => {
    console.warn('⚠️  Redis client reconnecting...');
});

redisClient.on('end', () => {
    console.log('🔌 Redis client connection terminated.');
});

/**
 * Connect to Redis
 */
export const connectRedis = async (): Promise<void> => {
    if (!redisClient.isOpen) {
        await redisClient.connect();
    }
};

/**
 * Gracefully disconnect from Redis
 */
export const disconnectRedis = async (): Promise<void> => {
    if (redisClient.isOpen) {
        await redisClient.quit();
    }
};
