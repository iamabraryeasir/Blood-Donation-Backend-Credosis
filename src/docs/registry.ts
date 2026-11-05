import { OpenAPIRegistry, extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

// Extend Zod schema definitions with .openapi() metadata method globally
extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

// Register JWT Bearer Authentication security scheme
registry.registerComponent('securitySchemes', 'bearerAuth', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description: 'Provide a valid JWT token in format: Bearer <token>',
});
