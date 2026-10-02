import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "pg";

function createCatalog() {
  return Array.from({ length: 13 }, (_, index) => ({
    id: `seed-${String(index + 1).padStart(2, "0")}`,
    title: `Test headphones ${index + 1}`,
    shortName: `Test ${index + 1}`,
    generalInfo: `Description for test product ${index + 1}.`,
    type: "headphones",
    newProduct: index % 2 === 0,
    popularProduct: index % 3 === 0,
    price: index === 0 ? 99.99 : 100 + index,
    inStock: index,
    images: {
      cover: `/test-${index + 1}/cover.webp`,
      main: `/test-${index + 1}/main.webp`,
      gallery: [
        `/test-${index + 1}/gallery-1.webp`,
        `/test-${index + 1}/gallery-2.webp`,
      ],
    },
    features: ["Clear sound", `Feature ${index + 1}`],
    inBox: [
      { name: "Headphones", quantity: 1 },
      { name: "Cable", quantity: 2 },
    ],
  }));
}

async function withTestDatabase(run: (client: Client) => Promise<void>) {
  const connectionString = process.env.TEST_DATABASE_URL;

  assert.ok(connectionString, "TEST_DATABASE_URL is required");
  assert.equal(
    new URL(connectionString).pathname,
    "/products_test",
    "Tests must use the products_test database",
  );

  const client = new Client({ connectionString });

  try {
    await client.connect();

    const database = await client.query("SELECT current_database() AS name");
    assert.equal(database.rows[0].name, "products_test");

    await client.query(
      "CREATE TEMP TABLE products (LIKE public.products INCLUDING ALL)",
    );
    await client.query("SET search_path TO pg_temp");

    await run(client);
  } finally {
    await client.end();
  }
}

test("seeds all 13 products and preserves every field", async () => {
  await withTestDatabase(async (client) => {
    const { seedProducts } = await import("../src/seed.js");
    const catalog = createCatalog();

    await seedProducts(client, catalog);

    const result = await client.query("SELECT * FROM products ORDER BY id");
    const expected = catalog.map((product) => ({
      id: product.id,
      title: product.title,
      short_name: product.shortName,
      general_info: product.generalInfo,
      type: product.type,
      new_product: product.newProduct,
      popular_product: product.popularProduct,
      price: product.price.toFixed(2),
      in_stock: product.inStock,
      images: product.images,
      features: product.features,
      in_box: product.inBox,
    }));

    assert.equal(result.rowCount, 13);
    assert.deepEqual(result.rows, expected);
  });
});

test("rejects a repeated seed without modifying existing products", async () => {
  await withTestDatabase(async (client) => {
    const { seedProducts } = await import("../src/seed.js");
    const catalog = createCatalog();

    await seedProducts(client, catalog);
    await client.query(
      "UPDATE products SET title = $1, in_stock = $2 WHERE id = $3",
      ["Manually updated title", 777, "seed-01"],
    );
    const before = await client.query("SELECT * FROM products ORDER BY id");

    await assert.rejects(
      () => seedProducts(client, catalog),
      { code: "23505", constraint: "products_pkey" },
    );

    const after = await client.query("SELECT * FROM products ORDER BY id");
    assert.deepEqual(after.rows, before.rows);
  });
});

test("rolls back the entire seed on a late failure and preserves existing data", async () => {
  await withTestDatabase(async (client) => {
    const { seedProducts } = await import("../src/seed.js");
    const catalog = createCatalog();
    const firstProduct = catalog[0];
    assert.ok(firstProduct);
    const existingProduct = {
      ...firstProduct,
      id: "existing-product",
    };

    await seedProducts(client, [existingProduct]);
    const before = await client.query("SELECT * FROM products ORDER BY id");

    const invalidCatalog = catalog.map((product, index) =>
      index === catalog.length - 1 ? { ...product, price: -1 } : product,
    );

    await assert.rejects(
      () => seedProducts(client, invalidCatalog),
      { code: "23514", constraint: "products_price_nonnegative" },
    );

    const after = await client.query("SELECT * FROM products ORDER BY id");
    assert.deepEqual(after.rows, before.rows);
  });
});
