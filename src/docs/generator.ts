import { OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { env } from '../config/env';
import '../modules/auth/auth.schema';
import '../modules/requests/request.schema';
import '../modules/users/user.schema';
import { registry } from './registry';
import './routes/system.doc';

export type OpenApiDocument = ReturnType<OpenApiGeneratorV3['generateDocument']>;

export const generateOpenApiSpec = (): OpenApiDocument => {
  const generator = new OpenApiGeneratorV3(registry.definitions);

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
    servers: [
      {
        url: `http://localhost:${env.PORT}`,
        description: `${env.NODE_ENV} environment (Local)`,
      },
    ],
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
    ],
  });
};
