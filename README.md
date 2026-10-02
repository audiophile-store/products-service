# audiophile-products-service
Products microservice for the Audiophile store: REST API for the product catalogue, backed by PostgreSQL

## Local development

Use Node.js 20.6 or newer. Copy `.env.example` to `.env` and configure your local values.
Run `npm run dev` to start the development server with variables loaded from `.env`.
The production command, `npm start`, uses environment variables provided by the hosting platform.

## Build and start

Run `npm run build` to compile the TypeScript source from `src` into `dist`, then run `npm start`.
The project uses ECMAScript modules.
