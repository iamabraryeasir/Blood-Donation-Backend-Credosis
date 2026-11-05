import type { Server } from 'node:http';
import { app } from './app';
import { env } from './config/env';
import { connectRedis, disconnectRedis } from './config/redis';
import { connectDatabase, disconnectDatabase } from './utils/prisma';
import { seedAdmin } from './utils/seeder';

let server: Server;

const startServer = async (): Promise<void> => {
    try {
        // Initialize Database and Redis connections before opening HTTP port
        await connectDatabase();
        await connectRedis();

        // Seed default admin account
        await seedAdmin();

        server = app.listen(env.PORT, '0.0.0.0', () => {
            console.log('=======================================================');
            console.log('  Blood Donation Platform API Server Running');
            console.log(`  Environment : ${env.NODE_ENV}`);
            console.log(`  Port        : ${env.PORT}`);
            console.log(`  Health Check: http://localhost:${env.PORT}/health`);
            console.log(`  API Base    : http://localhost:${env.PORT}/api/v1`);
            if (env.ENABLE_DOCS) {
                console.log(`  API Docs    : http://localhost:${env.PORT}/api-docs`);
            }
            console.log('=======================================================');
        });

        server.on('error', (error: Error) => {
            console.error('HTTP Server encountered an error:', error);
            process.exit(1);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

const handleGracefulShutdown = async (signal: string): Promise<void> => {
    console.log(`\nReceived ${signal}. Starting graceful shutdown...`);

    try {
        if (server) {
            await new Promise<void>((resolve, reject) => {
                server.close((err) => {
                    if (err) {
                        reject(err);
                    } else {
                        console.log('HTTP server closed successfully.');
                        resolve();
                    }
                });
            });
        }

        // Disconnect database and cache
        await disconnectDatabase();
        await disconnectRedis();

        console.log('Graceful shutdown completed.');
        process.exit(0);
    } catch (error) {
        console.error('Error during graceful shutdown:', error);
        process.exit(1);
    }
};

// Process event listeners for lifecycle management
process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));

process.on('uncaughtException', (error: Error) => {
    console.error('Uncaught Exception thrown:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
    console.error('Unhandled Promise Rejection detected:', reason);
    process.exit(1);
});

startServer();

export { server };
