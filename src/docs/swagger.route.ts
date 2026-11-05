import { type Request, type Response, Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { generateOpenApiSpec } from './generator';

const swaggerRouter = Router();

// Cache generated OpenAPI document in memory
let cachedSpec: ReturnType<typeof generateOpenApiSpec> | null = null;

const getSpec = () => {
    if (!cachedSpec) {
        cachedSpec = generateOpenApiSpec();
    }
    return cachedSpec;
};

// Relax CSP specifically for Swagger UI assets while keeping the rest of the application strictly guarded
swaggerRouter.use((_req, res, next) => {
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https:; script-src 'self' 'unsafe-inline' https:; connect-src 'self' https:;",
    );
    next();
});

// Endpoint to fetch raw OpenAPI 3.0 specification JSON
swaggerRouter.get('/json', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(getSpec());
});

// Swagger UI Explorer
const swaggerUiOptions: swaggerUi.SwaggerUiOptions = {
    explorer: true,
    customSiteTitle: 'Blood Donation Platform | API Documentation',
    swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        docExpansion: 'list',
        filter: true,
        tryItOutEnabled: true,
    },
};

swaggerRouter.use('/', swaggerUi.serve, swaggerUi.setup(getSpec(), swaggerUiOptions));

export { swaggerRouter };
