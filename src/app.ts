import express from "express";
import type { NextFunction, Request, Response } from "express";
import type { Client, Pool } from "pg";
import type { SeedProduct } from "./seed.js";

const productFields = `
  id, title, short_name AS "shortName", general_info AS "generalInfo", type,
  new_product AS "newProduct", popular_product AS "popularProduct",
  price::double precision AS price, in_stock AS "inStock",
  images, features, in_box AS "inBox"
`;

export function createApp(database: Client | Pool) {
  const app = express();

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/version", (_req, res) => {
    res.json({ version: process.env.APP_VERSION || "0.1.0" });
  });

  app.get("/products", async (_req, res) => {
    const result = await database.query<SeedProduct>(
      `SELECT ${productFields} FROM products ORDER BY id`,
    );

    res.json({ products: result.rows });
  });

  app.get("/products/:id", async (req, res) => {
    const result = await database.query<SeedProduct>(
      `SELECT ${productFields} FROM products WHERE id = $1`,
      [req.params.id],
    );
    const product = result.rows[0];

    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    res.json(product);
  });

  app.use((
    error: unknown,
    _req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    console.error("Products API request failed:", error);

    if (res.headersSent) {
      next(error);
      return;
    }

    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
