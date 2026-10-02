import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "pg";

const productColumns = [
  "id", "title", "short_name", "general_info", "type",
  "new_product", "popular_product", "price", "in_stock",
  "images", "features", "in_box",
] as const;

type ProductColumn = (typeof productColumns)[number];

async function assertProductRejected(
  column: ProductColumn,
  value: string | number | boolean | null,
  expected: { code: string; column?: string; constraint?: string },
) {
  const connectionString = process.env.TEST_DATABASE_URL;

  assert.ok(connectionString, "TEST_DATABASE_URL is required");
  assert.equal(
    new URL(connectionString).pathname,
    "/products_test",
    "Tests must use the products_test database",
  );

  const values: (string | number | boolean | null)[] = [
    "test-invalid-product",
    "Test headphones",
    "Test",
    "Headphones for testing.",
    "headphones",
    true,
    false,
    "99.99",
    5,
    JSON.stringify({
      cover: "/test/cover.webp",
      main: "/test/main.webp",
      gallery: ["/test/gallery.webp"],
    }),
    JSON.stringify(["Clear sound"]),
    JSON.stringify([{ name: "Headphones", quantity: 1 }]),
  ];
  values[productColumns.indexOf(column)] = value;

  const client = new Client({ connectionString });

  try {
    await client.connect();

    const database = await client.query("SELECT current_database() AS name");
    assert.equal(database.rows[0].name, "products_test");

    await client.query("BEGIN");

    try {
      await assert.rejects(
        () => client.query(
          `INSERT INTO products (${productColumns.join(", ")})
           VALUES (${productColumns.map((_, index) => `$${index + 1}`).join(", ")})`,
          values,
        ),
        expected,
      );
    } finally {
      await client.query("ROLLBACK");
    }
  } finally {
    await client.end();
  }
}

test("stores and reads a product with its JSONB data and exact price", async () => {
  const connectionString = process.env.TEST_DATABASE_URL;

  assert.ok(connectionString, "TEST_DATABASE_URL is required");
  assert.equal(
    new URL(connectionString).pathname,
    "/products_test",
    "Tests must use the products_test database",
  );

  const client = new Client({ connectionString });

  const product = {
    id: "test-01",
    title: "Test headphones",
    short_name: "Test",
    general_info: "Headphones for testing.",
    type: "headphones",
    new_product: true,
    popular_product: false,
    price: "99.99",
    in_stock: 5,
    images: {
      cover: "/test/cover.webp",
      main: "/test/main.webp",
      gallery: ["/test/gallery.webp"],
    },
    features: ["Clear sound"],
    in_box: [{ name: "Headphones", quantity: 1 }],
  };

  try {
    await client.connect();

    const database = await client.query("SELECT current_database() AS name");
    assert.equal(database.rows[0].name, "products_test");

    await client.query("BEGIN");

    try {
      await client.query(
        `INSERT INTO products (
          id, title, short_name, general_info, type,
          new_product, popular_product, price, in_stock,
          images, features, in_box
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11, $12
        )`,
        [
          product.id,
          product.title,
          product.short_name,
          product.general_info,
          product.type,
          product.new_product,
          product.popular_product,
          product.price,
          product.in_stock,
          JSON.stringify(product.images),
          JSON.stringify(product.features),
          JSON.stringify(product.in_box),
        ],
      );

      const result = await client.query(
        `SELECT
          id, title, short_name, general_info, type,
          new_product, popular_product, price, in_stock,
          images, features, in_box
        FROM products WHERE id = $1`,
        [product.id],
      );

      assert.deepEqual(result.rows, [product]);
    } finally {
      await client.query("ROLLBACK");
    }
  } finally {
    await client.end();
  }
});

for (const column of productColumns) {
  test(`rejects NULL in required field ${column}`, async () => {
    await assertProductRejected(column, null, {
      code: "23502",
      column,
    });
  });
}

const requiredTextColumns = [
  "id", "title", "short_name", "general_info", "type",
] as const;

for (const column of requiredTextColumns) {
  for (const value of ["", "   "]) {
    test(`rejects ${value === "" ? "empty" : "space-only"} text in ${column}`, async () => {
      await assertProductRejected(column, value, {
        code: "23514",
        constraint: `products_${column}_nonempty`,
      });
    });
  }
}

test("rejects a product with negative stock", async () => {
  await assertProductRejected("in_stock", -1, {
    code: "23514",
    constraint: "products_in_stock_nonnegative",
  });
});

test("rejects a product with a duplicate ID", async () => {
  const connectionString = process.env.TEST_DATABASE_URL;

  assert.ok(connectionString, "TEST_DATABASE_URL is required");
  assert.equal(
    new URL(connectionString).pathname,
    "/products_test",
    "Tests must use the products_test database",
  );

  const client = new Client({ connectionString });
  const insertQuery = `INSERT INTO products (
    id, title, short_name, general_info, type,
    new_product, popular_product, price, in_stock,
    images, features, in_box
  ) VALUES (
    $1, $2, $3, $4, $5, $6,
    $7, $8, $9, $10, $11, $12
  )`;
  const values = [
    "test-duplicate-id",
    "Test headphones",
    "Test",
    "Headphones for testing.",
    "headphones",
    true,
    false,
    "99.99",
    5,
    JSON.stringify({
      cover: "/test/cover.webp",
      main: "/test/main.webp",
      gallery: ["/test/gallery.webp"],
    }),
    JSON.stringify(["Clear sound"]),
    JSON.stringify([{ name: "Headphones", quantity: 1 }]),
  ];

  try {
    await client.connect();

    const database = await client.query("SELECT current_database() AS name");
    assert.equal(database.rows[0].name, "products_test");

    await client.query("BEGIN");

    try {
      await client.query(insertQuery, values);

      await assert.rejects(
        () => client.query(insertQuery, values),
        {
          code: "23505",
          constraint: "products_pkey",
        },
      );
    } finally {
      await client.query("ROLLBACK");
    }
  } finally {
    await client.end();
  }
});

test("rejects a product with a negative price", async () => {
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

    await client.query("BEGIN");

    try {
      await assert.rejects(
        () =>
          client.query(
            `INSERT INTO products (
              id, title, short_name, general_info, type,
              new_product, popular_product, price, in_stock,
              images, features, in_box
            ) VALUES (
              $1, $2, $3, $4, $5, $6,
              $7, $8, $9, $10, $11, $12
            )`,
            [
              "test-negative-price",
              "Test headphones",
              "Test",
              "Headphones for testing.",
              "headphones",
              true,
              false,
              "-1.00",
              5,
              JSON.stringify({
                cover: "/test/cover.webp",
                main: "/test/main.webp",
                gallery: ["/test/gallery.webp"],
              }),
              JSON.stringify(["Clear sound"]),
              JSON.stringify([{ name: "Headphones", quantity: 1 }]),
            ],
          ),
        {
          code: "23514",
          constraint: "products_price_nonnegative",
        },
      );
    } finally {
      await client.query("ROLLBACK");
    }
  } finally {
    await client.end();
  }
});