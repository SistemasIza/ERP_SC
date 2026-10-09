/**
 * Swagger Middleware
 * Express middleware for serving Swagger documentation
 */

import { Router, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger.config';

const router = Router();

/**
 * Serve Swagger UI
 */
router.use('/', swaggerUi.serve as any, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'SparkBot API Documentation',
  customCss: '.swagger-ui .topbar { display: none }',
  swaggerOptions: {
    persistAuthorization: true,
    docExpansion: 'none',
    filter: true,
    showRequestDuration: true,
  },
}) as any);

/**
 * Serve Swagger JSON
 */
router.get('/json', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

export default router;
