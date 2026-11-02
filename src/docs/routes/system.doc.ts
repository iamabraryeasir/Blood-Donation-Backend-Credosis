import { registry } from '../registry';
import {
  ApiRootMessageSchema,
  ErrorResponseSchema,
  HealthStatusSchema,
} from '../schemas/common.schema';

registry.registerPath({
  method: 'get',
  path: '/health',
  summary: 'Liveness and System Health Check',
  description: 'Returns operational status, uptime, timestamp, and environment metadata.',
  tags: ['System'],
  responses: {
    200: {
      description: 'System is healthy and operational',
      content: {
        'application/json': {
          schema: HealthStatusSchema,
        },
      },
    },
    500: {
      description: 'System encountered a critical operational issue',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/v1',
  summary: 'API v1 Root Overview',
  description: 'Displays welcome message and links to interactive documentation.',
  tags: ['System'],
  responses: {
    200: {
      description: 'API v1 is online and accessible',
      content: {
        'application/json': {
          schema: ApiRootMessageSchema,
        },
      },
    },
  },
});
