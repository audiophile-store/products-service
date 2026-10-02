import type { Client } from "pg";

export interface SeedProduct {
  id: string;
  title: string;
  shortName: string;
  generalInfo: string;
  type: string;
  newProduct: boolean;
  popularProduct: boolean;
  price: number;
  inStock: number;
  images: {
    cover: string;
    main: string;
    gallery: string[];
  };
  features: string[];
  inBox: { name: string; quantity: number }[];
}

export async function seedProducts(
  client: Client,
  products: readonly SeedProduct[],
): Promise<void> {
  await client.query("BEGIN");

  try {
    for (const product of products) {
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
          product.shortName,
          product.generalInfo,
          product.type,
          product.newProduct,
          product.popularProduct,
          product.price,
          product.inStock,
          JSON.stringify(product.images),
          JSON.stringify(product.features),
          JSON.stringify(product.inBox),
        ],
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      throw new AggregateError(
        [error, rollbackError],
        "Product seed failed and its transaction could not be rolled back",
      );
    }

    throw error;
  }
}
