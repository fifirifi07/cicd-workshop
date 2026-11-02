/**
 * The shop's API contract in OpenAPI 3.0 format.
 *
 * It is kept as a TypeScript object rather than a separate YAML file for one reason:
 * `npm run typecheck` then keeps field names from silently drifting away from the code.
 * The spec is served at `/api/openapi.json` and the Swagger UI at `/api/docs`.
 */

const errorResponses = {
  400: { description: 'Bad request' },
  404: { description: 'Resource not found' },
} as const;

export const openapiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Workshop Shop API',
    version: '1.0.0',
    description:
      'API of the demo application used in the "Fast feedback in CI/CD" workshop. ' +
      'Data lives in process memory - restarting the server restores the initial state.',
  },
  servers: [{ url: '/', description: 'Current instance' }],
  tags: [
    { name: 'Products', description: 'Catalogue: filtering, sorting, pagination' },
    { name: 'Cart', description: 'Cart lines and discount codes' },
    { name: 'Orders', description: 'Placing and reading orders' },
    { name: 'Diagnostics', description: 'Application health' },
  ],
  paths: {
    '/api/health': {
      get: {
        tags: ['Diagnostics'],
        summary: 'Application health',
        description: 'Used by Playwright as the server readiness condition (`webServer.url`).',
        responses: {
          200: {
            description: 'The application responds',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    uptime: { type: 'number', example: 12.5 },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/products': {
      get: {
        tags: ['Products'],
        summary: 'List products',
        parameters: [
          {
            name: 'category',
            in: 'query',
            schema: { type: 'string', enum: ['tshirts', 'hoodies', 'accessories', 'all'] },
          },
          {
            name: 'search',
            in: 'query',
            description: 'Phrase matched against product name and description',
            schema: { type: 'string' },
          },
          {
            name: 'sort',
            in: 'query',
            schema: { type: 'string', enum: ['price-asc', 'price-desc', 'name-asc', 'rating-desc'] },
          },
          {
            name: 'limit',
            in: 'query',
            description: 'Maximum number of records to return',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          },
          {
            name: 'offset',
            in: 'query',
            description: 'Number of records to skip',
            schema: { type: 'integer', minimum: 0, default: 0 },
          },
        ],
        responses: {
          200: {
            description: 'A slice of matching products',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ProductSlice' } },
            },
          },
          ...errorResponses,
        },
      },
    },
    '/api/products/{id}': {
      get: {
        tags: ['Products'],
        summary: 'Product details',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'A product',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } },
          },
          ...errorResponses,
        },
      },
    },
    '/api/cart': {
      post: {
        tags: ['Cart'],
        summary: 'Create an empty cart',
        responses: {
          201: {
            description: 'The new cart',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Cart' } } },
          },
        },
      },
    },
    '/api/cart/{id}': {
      get: {
        tags: ['Cart'],
        summary: 'Cart contents with computed amounts',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'The cart',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Cart' } } },
          },
          ...errorResponses,
        },
      },
    },
    '/api/cart/{id}/items': {
      post: {
        tags: ['Cart'],
        summary: 'Add a line to the cart',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['productId'],
                properties: {
                  productId: { type: 'string', example: 'p-001' },
                  size: { type: 'string', nullable: true, enum: ['S', 'M', 'L', 'XL', null] },
                  quantity: { type: 'integer', minimum: 1, maximum: 10, default: 1 },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'The cart after the line was added',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Cart' } } },
          },
          ...errorResponses,
        },
      },
    },
    '/api/cart/{id}/items/{itemId}': {
      patch: {
        tags: ['Cart'],
        summary: 'Change line quantity',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'itemId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['quantity'],
                properties: { quantity: { type: 'integer', minimum: 1, maximum: 10 } },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'The cart after the change',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Cart' } } },
          },
          ...errorResponses,
        },
      },
      delete: {
        tags: ['Cart'],
        summary: 'Remove a line from the cart',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'itemId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'The cart after removal',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Cart' } } },
          },
          ...errorResponses,
        },
      },
    },
    '/api/cart/{id}/discount': {
      post: {
        tags: ['Cart'],
        summary: 'Apply a discount code',
        description:
          'Test codes: `WELCOME10` (10% off), `FREESHIP` (free shipping), ' +
          '`MEGA50` (50% off plus shipping), `SUMMER20` (expired - returns 400).',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['code'],
                properties: { code: { type: 'string', example: 'WELCOME10' } },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'The cart with the discount applied',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Cart' } } },
          },
          ...errorResponses,
        },
      },
      delete: {
        tags: ['Cart'],
        summary: 'Remove the discount code',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'The cart without a discount',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Cart' } } },
          },
          ...errorResponses,
        },
      },
    },
    '/api/orders': {
      post: {
        tags: ['Orders'],
        summary: 'Place an order',
        description: 'The cart is emptied once the order is placed.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['cartId', 'customer'],
                properties: {
                  cartId: { type: 'string' },
                  customer: { $ref: '#/components/schemas/CustomerDetails' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Order accepted',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Order' } } },
          },
          400: {
            description: 'Empty cart or invalid details - the `fields` object lists the errors',
          },
          404: errorResponses[404],
        },
      },
    },
    '/api/orders/{id}': {
      get: {
        tags: ['Orders'],
        summary: 'Read an order',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'The order',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Order' } } },
          },
          ...errorResponses,
        },
      },
    },
  },
  components: {
    schemas: {
      Product: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'p-001' },
          name: { type: 'string' },
          category: { type: 'string', enum: ['tshirts', 'hoodies', 'accessories'] },
          price: { type: 'integer', description: 'Price in grosze', example: 8900 },
          sizes: { type: 'array', items: { type: 'string', enum: ['S', 'M', 'L', 'XL'] } },
          stock: { type: 'integer' },
          rating: { type: 'number' },
          description: { type: 'string' },
        },
      },
      ProductSlice: {
        type: 'object',
        description:
          'A bounded slice of the catalogue. Page numbers are deliberately absent: they are ' +
          'a presentation concept and the caller derives them from total, limit and offset.',
        properties: {
          items: { type: 'array', items: { $ref: '#/components/schemas/Product' } },
          total: { type: 'integer', description: 'Number of records matching the filters' },
          limit: { type: 'integer' },
          offset: { type: 'integer' },
        },
      },
      CartItem: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          productId: { type: 'string' },
          name: { type: 'string' },
          price: { type: 'integer', description: 'Unit price in grosze' },
          size: { type: 'string', nullable: true },
          quantity: { type: 'integer' },
        },
      },
      Totals: {
        type: 'object',
        description: 'All amounts in grosze.',
        properties: {
          subtotal: { type: 'integer' },
          discount: { type: 'integer' },
          shipping: { type: 'integer' },
          total: { type: 'integer' },
        },
      },
      Cart: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          items: { type: 'array', items: { $ref: '#/components/schemas/CartItem' } },
          discountCode: { type: 'string', nullable: true },
          totals: { $ref: '#/components/schemas/Totals' },
        },
      },
      CustomerDetails: {
        type: 'object',
        required: ['email', 'firstName', 'lastName', 'street', 'postalCode', 'city'],
        properties: {
          email: { type: 'string', format: 'email' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          street: { type: 'string' },
          postalCode: { type: 'string', pattern: '^\\d{2}-\\d{3}$', example: '80-180' },
          city: { type: 'string' },
        },
      },
      Order: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'ORD-1A2B3C4D' },
          items: { type: 'array', items: { $ref: '#/components/schemas/CartItem' } },
          totals: { $ref: '#/components/schemas/Totals' },
          customer: { $ref: '#/components/schemas/CustomerDetails' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
} as const;
