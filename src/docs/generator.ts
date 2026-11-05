import { OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { env } from '../config/env';
import '../modules/auth/auth.schema';
import '../modules/requests/request.schema';
import '../modules/responses/response.schema';
import '../modules/users/user.schema';
import { registry } from './registry';
import './routes/system.doc';

export type OpenApiDocument = ReturnType<OpenApiGeneratorV3['generateDocument']>;

export const generateOpenApiSpec = (): OpenApiDocument => {
    const generator = new OpenApiGeneratorV3(registry.definitions);

    const servers: { url: string; description: string }[] = [];
    const externalUrl = process.env.RENDER_EXTERNAL_URL || process.env.BASE_URL;

    if (externalUrl) {
        servers.push({
            url: externalUrl,
            description: `${env.NODE_ENV === 'production' ? 'Production' : env.NODE_ENV} Cloud Server`,
        });
    }

    // Relative root URL automatically resolves to the origin serving Swagger UI
    servers.push({
        url: '/',
        description: 'Current Origin (Auto-detected)',
    });

    if (env.NODE_ENV !== 'production' || !externalUrl) {
        servers.push({
            url: `http://localhost:${env.PORT}`,
            description: 'Local Development Server',
        });
    }

    return generator.generateDocument({
        openapi: '3.0.0',
        info: {
            title: 'Blood Donation Platform API',
            version: '1.0.0',
            description:
                'Production-grade RESTful API specification for the Blood Donation Platform backend. Built with Express, TypeScript, Prisma, and Zod.',
            contact: {
                name: 'API Support Team',
            },
            license: {
                name: 'ISC',
            },
        },
        servers,
        tags: [
            {
                name: 'System',
                description: 'Core system lifecycle, monitoring, and health check endpoints',
            },
            {
                name: 'Auth',
                description: 'Authentication, registration staging, and verification endpoints',
            },
            {
                name: 'Users',
                description: 'User profile management and donor availability endpoints',
            },
            {
                name: 'Requests',
                description: 'Blood donation requests and lifecycle management endpoints',
            },
            {
                name: 'Donor Responses',
                description: 'Donor matching engine and emergency coordination endpoints',
            },
        ],
    });
};
