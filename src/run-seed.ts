import { Client } from "pg";
import { loadCatalog } from "./catalog.js";
import { seedProducts } from "./seed.js";

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const products = await loadCatalog(
    new URL("../data/products.json", import.meta.url),
  );
  const client = new Client({ connectionString });

  try {
    await client.connect();
    await seedProducts(client, products);
  } finally {
    await client.end();
  }

  console.log(`Seeded ${products.length} products.`);
}

main().catch((error: unknown) => {
  console.error("Product seed failed:", error);
  process.exitCode = 1;
});
