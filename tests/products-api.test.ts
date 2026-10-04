import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import { Client } from "pg";
import { seedProducts } from "../src/seed.js";
import type { SeedProduct } from "../src/seed.js";

function createProduct(id: string, price: number): SeedProduct {
  return {
    id,
    title: `Test headphones ${id}`,
    shortName: `Test ${id}`,
    generalInfo: "Headphones for API testing.",
    type: "headphones",
    newProduct: true,
    popularProduct: false,
    price,
    inStock: 5,
    images: {
      cover: "/test/cover.webp",
      main: "/test/main.webp",
      gallery: ["/test/gallery-1.webp", "/test/gallery-2.webp"],
    },
    features: ["Clear sound"],
    inBox: [{ name: "Headphones", quantity: 1 }],
  };
}

async function withTestApp(
  run: (
    client: Client,
    get: (path: string, headers?: HeadersInit) => Promise<Response>,
  ) => Promise<void>,
) {
  const connectionString = process.env.TEST_DATABASE_URL;

  assert.ok(connectionString, "TEST_DATABASE_URL is required");
  assert.equal(
    new URL(connectionString).pathname,
    "/products_test",
    "Tests must use the products_test database",
  );

  const { createApp } = await import("../src/app.js");
  const client = new Client({ connectionString });

  try {
    await client.connect();

    const database = await client.query("SELECT current_database() AS name");
    assert.equal(database.rows[0].name, "products_test");
    await client.query(
      "CREATE TEMP TABLE products (LIKE public.products INCLUDING ALL)",
    );
    await client.query("SET search_path TO pg_temp");

    const app = createApp(client);
    const server = app.listen(0, "127.0.0.1");

    try {
      await once(server, "listening");
      const address = server.address();
      assert.ok(address && typeof address !== "string");

      const get = (path: string, headers?: HeadersInit) => fetch(
        `http://127.0.0.1:${address.port}${path}`,
        { headers, signal: AbortSignal.timeout(5000) },
      );

      await run(client, get);
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
    }
  } finally {
    await client.end();
  }
}

test("GET /products returns camelCase products ordered by ID with numeric EUR prices", async () => {
  await withTestApp(async (client, get) => {
    const last = createProduct("api-z", 599);
    const first = createProduct("api-a", 99.99);
    await seedProducts(client, [last, first]);

    const response = await get("/products");

    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", /application\/json/);
    assert.deepEqual(await response.json(), { products: [first, last] });
  });
});

test("GET /products returns an empty products array for an empty table", async () => {
  await withTestApp(async (_client, get) => {
    const response = await get("/products");

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { products: [] });
  });
});

test("GET /products/:id returns only the requested product", async () => {
  await withTestApp(async (client, get) => {
    const requested = createProduct("api-requested", 99.99);
    await seedProducts(client, [
      createProduct("api-other", 599),
      requested,
    ]);

    const response = await get("/products/api-requested");

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), requested);
  });
});

test("GET /products/:id returns 404 for an unknown ID", async () => {
  await withTestApp(async (client, get) => {
    await seedProducts(client, [createProduct("api-existing", 599)]);

    const response = await get("/products/api-missing");

    assert.equal(response.status, 404);
  });
});

for (const path of ["/products", "/products/api-existing"]) {
  test(`GET ${path} returns 500 without database details when the query fails`, async () => {
    await withTestApp(async (client, get) => {
      await client.query("DROP TABLE products");

      const response = await get(path);
      const body = await response.text();

      assert.equal(response.status, 500);
      assert.doesNotMatch(
        body,
        /relation "products" does not exist|42P01|node_modules|SELECT\s/i,
      );
    });
  });
}

test("product reads allow only the configured browser origin", async () => {
  const previousOrigin = process.env.CORS_ORIGIN;
  const allowedOrigin = "http://localhost:5173";

  try {
    process.env.CORS_ORIGIN = allowedOrigin;
    await withTestApp(async (client, get) => {
      await seedProducts(client, [createProduct("cors-product", 99.99)]);

      const list = await get("/products", { origin: allowedOrigin });
      const single = await get("/products/cors-product", { origin: allowedOrigin });

      assert.equal(list.status, 200);
      assert.equal(list.headers.get("access-control-allow-origin"), allowedOrigin);
      assert.equal(single.status, 200);
      assert.equal(
        single.headers.get("access-control-allow-origin"),
        allowedOrigin,
      );
    });

    await withTestApp(async (_client, get) => {
      const response = await get("/products", {
        origin: "https://evil.example",
      });

      assert.equal(response.status, 200);
      assert.equal(response.headers.get("access-control-allow-origin"), null);
    });

    delete process.env.CORS_ORIGIN;
    await withTestApp(async (_client, get) => {
      const response = await get("/products", { origin: allowedOrigin });

      assert.equal(response.status, 200);
      assert.equal(response.headers.get("access-control-allow-origin"), null);
    });
  } finally {
    if (previousOrigin === undefined) {
      delete process.env.CORS_ORIGIN;
    } else {
      process.env.CORS_ORIGIN = previousOrigin;
    }
  }
});

test("GET /health and GET /version preserve their existing responses", async () => {
  await withTestApp(async (client, get) => {
    await client.query("DROP TABLE products");

    const health = await get("/health");
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { status: "ok" });

    const version = await get("/version");
    assert.equal(version.status, 200);
    assert.deepEqual(await version.json(), {
      version: process.env.APP_VERSION || "0.1.0",
    });
  });
});
