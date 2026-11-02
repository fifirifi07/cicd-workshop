import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { productsRouter } from './routes/products.js';
import { cartRouter } from './routes/cart.js';
import { ordersRouter } from './routes/orders.js';
import { openapiDocument } from './openapi.js';
import { latency } from './latency.js';

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * The built frontend lives in `dist/web`, the compiled server in `dist/server/server`.
 * Serving both from a single process is deliberate: in CI the application starts with
 * **one command**, with no container orchestration and no waiting on two ports.
 */
const webRoot = path.resolve(here, '../../web');

/**
 * False under `npm run dev`: the server then runs from `src/server` and there is no built
 * frontend next to it. Vite serves the shop on port 5173 instead.
 */
export const hasBuiltFrontend = fs.existsSync(path.join(webRoot, 'index.html'));

export function createApp() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  // The API contract. `/api/openapi.json` is the source for breaking-change detection
  // in CI, while `/api/docs` gives participants clickable endpoint documentation.
  app.get('/api/openapi.json', (_req, res) => {
    res.json(openapiDocument);
  });

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiDocument, {
    customSiteTitle: 'Workshop Shop API',
  }));

  // Simulated backend latency. Deliberately not applied to `/api/health` (it is the
  // readiness probe Playwright waits on) nor to the contract document.
  // The catalogue is weighted higher because it filters and sorts a collection.
  app.use('/api/products', latency(1.5), productsRouter);
  app.use('/api/cart', latency(), cartRouter);
  app.use('/api/orders', latency(), ordersRouter);

  // An unknown path under /api must return JSON with a 404, not an HTML page.
  // Without this, API tests would receive index.html and a misleading parse error.
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Unknown API resource' });
  });

  app.use(express.static(webRoot));

  // Fallback for client-side routing - every other path serves index.html.
  app.get('*', (_req, res) => {
    if (!hasBuiltFrontend) {
      res.status(404).type('text/plain').send(
        'This port serves the API only. Open the shop at http://localhost:5173',
      );
      return;
    }
    res.sendFile(path.join(webRoot, 'index.html'));
  });

  return app;
}
