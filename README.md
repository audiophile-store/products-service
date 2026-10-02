# audiophile-products-service
Products microservice for the Audiophile store: REST API for the product catalogue, backed by PostgreSQL

## Local development

Use Node.js 20.6 or newer. Copy `.env.example` to `.env` and configure your local values.
Run `npm run dev` to start the development server with variables loaded from `.env`.
The production command, `npm start`, uses environment variables provided by the hosting platform.

## Build and start

Run `npm run build` to compile the TypeScript source from `src` into `dist`, then run `npm start`.
The project uses ECMAScript modules.

## Seed the local database

Start PostgreSQL with `docker compose up -d` and apply the initial migration
once to a database that does not yet have the `products` table:

```bash
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1' < migrations/001_create_products.sql
```

Check that `DATABASE_URL` in `.env` points to your intended local development
database, then run:

```bash
npm run seed
```

The command loads the 13-product catalog from `data/products.json`, validates
its structure, and inserts all products in one transaction. Prices are in EUR,
not cents. Image paths are preserved; image files remain hosted by the frontend.
The catalog is a snapshot of the frontend JSON and does not depend on another
local repository at runtime.

If any insert fails, including an existing product ID, all inserts from that
attempt are rolled back. Existing data is not updated or deleted. Failures are
reported with a nonzero exit code; successful completion prints
`Seeded 13 products.`. The command must be run explicitly; starting the server
does not seed the database.
