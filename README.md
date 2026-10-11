# Audiophile Products Service

The product catalogue API for the Audiophile portfolio project. It serves
product details from PostgreSQL to the webshop and supplies prices and stock
information to the orders service.

**[Live webshop](https://audiophile-store-beryl.vercel.app/)** ·
**[Frontend code](https://github.com/audiophile-store/webshop)**

**Admin demo access:** Contact [Stefan Rakonjac](https://github.com/xarambash)
for private credentials. Product create, edit and delete in the UI are currently demo-only.

## Highlights

- Read-only REST API for the catalogue and individual products.
- Specifications, EUR prices, stock counts and frontend-hosted image paths.
- Validated seed of 13 demo products in one transaction.
- Configurable CORS and explicit API error responses.
- Unit, database and API tests, plus GitHub Actions checks.

**Tech stack:** TypeScript, Node.js, Express, PostgreSQL, Docker and Biome.
The backend is hosted on Render.

## API overview

| Endpoint            | Purpose                                           |
| ------------------- | ------------------------------------------------- |
| `GET /products`     | Catalogue as `{ products: [...] }`, ordered by ID |
| `GET /products/:id` | Product details, or HTTP 404                      |
| `GET /health`       | Process liveness, not database readiness          |
| `GET /version`      | Deployment version                                |

Prices are in euros, not cents. This service has no product write endpoints.

## Run locally

Use Node.js 22 and Docker Compose. Copy `.env.example` to `.env` and replace
the database password placeholders. `DATABASE_URL` uses localhost;
`DOCKER_DATABASE_URL` uses `db:5432`, with the same credentials and database.
Keep credentials out of Git.

For a fresh database:

```bash
npm install
docker compose up -d db
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1' < migrations/001_create_products.sql
npm run seed
npm run dev
```

The API runs at `http://localhost:3000`. Apply the migration and seed only once;
seeding does not overwrite existing products. After database setup, you can
use `docker compose up --build -d` instead of the development server.

| Variable              | Purpose                                                |
| --------------------- | ------------------------------------------------------ |
| `DATABASE_URL`        | PostgreSQL connection string                           |
| `DOCKER_DATABASE_URL` | Database connection from the app container             |
| `CORS_ORIGIN`         | Exact frontend origin; locally `http://localhost:5173` |
| `PORT`                | HTTP port, default `3000`                              |
| `APP_VERSION`         | Version returned by `/version`                         |

On Render, use the production database URL and exact HTTPS webshop
`CORS_ORIGIN`, without a trailing slash. Missing CORS configuration disables
cross-origin browser access.

## Quality checks

`npm run lint`, `npm run build` and `npm run test:local`.
Database tests require `TEST_DATABASE_URL` pointing to a separate `products_test`
database with the initial migration applied; never use production data.
CI runs the checks and builds/scans the Docker image without deploying it.

## Related services

[Orders](https://github.com/audiophile-store/orders-service) ·
[Authentication](https://github.com/audiophile-store/auth-service)

## Author

Stefan Rakonjac — [@xarambash](https://github.com/xarambash)
