# audiophile-products-service
Products microservice for the Audiophile store: REST API for the product catalogue, backed by PostgreSQL

## Local development

Use Node.js 20.6 or newer. Copy `.env.example` to `.env` and configure your local values.
Run `npm run dev` to start the development server with variables loaded from `.env`.
The production command, `npm start`, uses environment variables provided by the hosting platform.

## Build and start

Run `npm run build` to compile the TypeScript source from `src` into `dist`, then run `npm start`.
The project uses ECMAScript modules.

## Lint

Run `npm run lint` to check TypeScript files in `src` and `tests` with Biome's
recommended lint rules. Errors and warnings cause a nonzero exit code.
The command does not modify files, and formatting is disabled.
Biome is a development dependency and is not installed in the runtime image.

## Tests

Database tests require a separate database named `products_test`, with the
initial migration applied. For a fresh local setup, start PostgreSQL and
prepare it once:

```bash
docker compose up -d db
docker compose exec db sh -c 'createdb -U "$POSTGRES_USER" products_test'
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d products_test -v ON_ERROR_STOP=1' < migrations/001_create_products.sql
```

Set `TEST_DATABASE_URL` in `.env` to the host PostgreSQL connection URL with
the database name changed to `products_test`. Run `npm run test:local` to
load `.env` and execute all tests.

`npm test` executes the same tests without loading an environment file.
It expects `TEST_DATABASE_URL` to be supplied by the environment, as in CI.
Database tests reject other database names and clean up their test data.

## Continuous integration

The `CI` workflow in `.github/workflows/ci.yml` runs on pull requests targeting
`main` and pushes to `main`. Its `Lint, build and tests` job installs locked
dependencies, applies the initial migration to a fresh PostgreSQL 16 test
database, and runs `npm run lint`, `npm run build`, and `npm test` on Node.js 22.

The test database exists only for that job. Its credentials are disposable
test values, not production secrets; the workflow does not load `.env` or
connect to local or production databases. Checkout, Node setup, and Trivy
actions are pinned to commit SHAs, with read-only repository permissions.

After those checks pass, the `Docker build and image scan` job builds the
runtime image from the Dockerfile, tagged with the commit SHA. It refreshes
the base image and uses Trivy 0.75.0 to scan operating-system and application
packages for known vulnerabilities. All severities, including findings
without fixes, appear in the scan logs. A separate enforcement step fails
the job for `HIGH` or `CRITICAL` findings with available fixes; other findings
remain visible but do not fail that policy check. Scanner errors still fail
the job. The vulnerability database is updated by Trivy, so results may change
even when application code is unchanged.

Workflow results appear in the pull request checks and the repository's
Actions tab. Requiring a successful check before merge needs a separate
branch protection or ruleset setting. Images are not published to a registry,
and deployment is not part of this workflow.

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

The runtime stage removes the bundled npm package and its `npm`/`npx` commands
after installing production dependencies, reducing unnecessary tooling and
its vulnerable dependencies. The build stage retains npm. Containers start
with `node dist/index.js`, not `npm start`; npm commands remain available
on your development machine. If seeding is explicitly needed inside a
container, use `docker compose exec app node dist/run-seed.js`, which uses
the container's database configuration and still rejects existing IDs.

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
