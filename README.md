# audiophile-products-service
Products microservice for the Audiophile store: REST API for the product catalogue, backed by PostgreSQL

## Local development

Use Node.js 20.6 or newer. Copy `.env.example` to `.env` and configure your local values.
Run `npm run dev` to start the development server with variables loaded from `.env`.
The production command, `npm start`, uses environment variables provided by the hosting platform.

## Build and start

Run `npm run build` to compile the TypeScript source from `src` into `dist`, then run `npm start`.
The project uses ECMAScript modules.

## API

The server requires `DATABASE_URL`. The default port is `3000`; override it
with `PORT`.

| Route | Response |
| --- | --- |
| `GET /health` | `{ "status": "ok" }` |
| `GET /version` | `{ "version": "0.1.0" }`, or the value of `APP_VERSION` |
| `GET /products` | `{ "products": [...] }`, ordered by ID; an empty table returns `{ "products": [] }` |
| `GET /products/:id` | A single product, or HTTP 404 with `{ "error": "Product not found" }` |

Products use the original catalog field names, including `shortName`,
`generalInfo`, `newProduct`, `popularProduct`, `inStock`, and `inBox`.
Prices are JSON numbers in EUR. Image paths and other JSONB fields are
returned unchanged. SQL queries read the database, not the catalog file.

Database query failures are logged on the server and return HTTP 500 with
`{ "error": "Internal server error" }`, without internal database details.
The health endpoint remains a process liveness check, not a database
readiness check.

## Seed the local database

Start PostgreSQL with `docker compose up -d db` and apply the initial migration
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

## Run the application and database with Docker

The Dockerfile builds TypeScript using Node.js 22 and creates a runtime image
with only production dependencies. The application runs as the non-root
`node` user. Local dependencies, build output, and environment files are
excluded from the Docker build context.

In `.env`, keep `DATABASE_URL` pointing to `localhost` for commands run on
your computer. Add `DOCKER_DATABASE_URL` by copying that connection URL and
changing only the hostname to `db`, the Compose database service name.
Keep the same database name and credentials, including any URL encoding.
Compose passes this value to the application container as `DATABASE_URL`.
If it is missing, the application exits with a required-configuration error;
the database-only command remains usable.

Stop any local development server using port `3000`, then run:

```bash
docker compose up -d --build
```

Compose starts PostgreSQL and waits for its readiness check before starting
the application at `http://localhost:3000`. The existing PostgreSQL 16 image
and `products_db_data` volume are retained. Starting containers does not run
migrations or seed data automatically; a fresh database still needs the
initial migration and seed described above.

Check the services with `docker compose ps` and the application with
`curl http://localhost:3000/health` and `curl http://localhost:3000/products`.
After code changes, run `docker compose up -d --build` again to rebuild and
replace the application container.

Use `docker compose down` to remove containers and the Compose network while
keeping database data. Do not add `-v` unless you intend to delete the
database volume.
