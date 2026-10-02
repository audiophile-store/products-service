import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const product = {
  id: "catalog-test-01",
  title: "Test headphones",
  shortName: "Test",
  generalInfo: "Headphones for testing.",
  type: "headphones",
  newProduct: true,
  popularProduct: false,
  price: 99.99,
  inStock: 5,
  images: {
    cover: "/test/cover.webp",
    main: "/test/main.webp",
    gallery: ["/test/gallery.webp"],
  },
  features: ["Clear sound"],
  inBox: [{ name: "Headphones", quantity: 1 }],
};

async function withCatalogFile(
  contents: string | undefined,
  run: (path: string) => Promise<void>,
) {
  const directory = await mkdtemp(join(tmpdir(), "audiophile-catalog-test-"));
  const path = join(directory, "products.json");

  try {
    if (contents !== undefined) {
      await writeFile(path, contents, "utf8");
    }

    await run(path);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("loads a valid catalog without changing product data", async () => {
  await withCatalogFile(JSON.stringify({ products: [product] }), async (path) => {
    const { loadCatalog } = await import("../src/catalog.js");

    const result = await loadCatalog(path);

    assert.deepEqual(result, [product]);
  });
});

test("reports a missing catalog file instead of returning an empty catalog", async () => {
  await withCatalogFile(undefined, async (path) => {
    const { loadCatalog } = await import("../src/catalog.js");

    await assert.rejects(() => loadCatalog(path), { code: "ENOENT" });
  });
});

test("reports malformed JSON instead of returning an empty catalog", async () => {
  await withCatalogFile('{"products":', async (path) => {
    const { loadCatalog } = await import("../src/catalog.js");

    await assert.rejects(() => loadCatalog(path), SyntaxError);
  });
});

test("rejects invalid catalog and product structures with a clear error", async () => {
  const invalidCatalogs = [
    null,
    [],
    {},
    { products: "not an array" },
    { products: [null] },
    { products: [{ id: "missing-fields" }] },
    { products: [{ ...product, title: 123 }] },
    { products: [{ ...product, newProduct: "true" }] },
    { products: [{ ...product, price: "99.99" }] },
    { products: [{ ...product, inStock: "5" }] },
    { products: [{ ...product, images: { ...product.images, gallery: [123] } }] },
    { products: [{ ...product, features: "not an array" }] },
    { products: [{ ...product, inBox: [{ name: "Headphones", quantity: "1" }] }] },
  ];

  for (const catalog of invalidCatalogs) {
    await withCatalogFile(JSON.stringify(catalog), async (path) => {
      const { loadCatalog } = await import("../src/catalog.js");

      await assert.rejects(
        () => loadCatalog(path),
        { name: "TypeError", message: /Invalid product catalog/ },
      );
    });
  }
});
