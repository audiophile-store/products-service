import { readFile } from "node:fs/promises";
import type { SeedProduct } from "./seed.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) &&
    value.every((entry: unknown) => typeof entry === "string");
}

function isSeedProduct(value: unknown): value is SeedProduct {
  return isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.shortName === "string" &&
    typeof value.generalInfo === "string" &&
    typeof value.type === "string" &&
    typeof value.newProduct === "boolean" &&
    typeof value.popularProduct === "boolean" &&
    typeof value.price === "number" &&
    Number.isFinite(value.price) &&
    typeof value.inStock === "number" &&
    Number.isInteger(value.inStock) &&
    isRecord(value.images) &&
    typeof value.images.cover === "string" &&
    typeof value.images.main === "string" &&
    isStringArray(value.images.gallery) &&
    isStringArray(value.features) &&
    Array.isArray(value.inBox) &&
    value.inBox.every((entry: unknown) =>
      isRecord(entry) &&
      typeof entry.name === "string" &&
      typeof entry.quantity === "number" &&
      Number.isFinite(entry.quantity),
    );
}

export async function loadCatalog(path: string | URL): Promise<SeedProduct[]> {
  const contents = await readFile(path, "utf8");
  const catalog: unknown = JSON.parse(contents);

  if (!isRecord(catalog) || !Array.isArray(catalog.products)) {
    throw new TypeError(
      "Invalid product catalog: expected an object with a products array",
    );
  }

  const products: unknown[] = catalog.products;

  if (!products.every(isSeedProduct)) {
    throw new TypeError(
      "Invalid product catalog: products must contain all required fields with the expected types",
    );
  }

  return products;
}
