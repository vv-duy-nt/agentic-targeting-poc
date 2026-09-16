import type { Product } from "@poc/shared";
import type { Pool } from "pg";

type ProductRow = { id: string; name: string; category: string; price: string; image_key: string | null; active: boolean };
export type ProductFilter = { category?: string; active?: boolean; limit?: number };

function toProduct(row: ProductRow): Product {
  return { id: Number(row.id), name: row.name, category: row.category, price: Number(row.price), imageKey: row.image_key, active: row.active };
}

export async function findProducts(pool: Pool, filters: ProductFilter = {}): Promise<Product[]> {
  const values: unknown[] = [];
  const clauses: string[] = [];
  if (filters.category) { values.push(filters.category); clauses.push(`category = $${values.length}`); }
  if (filters.active !== undefined) { values.push(filters.active); clauses.push(`active = $${values.length}`); }
  values.push(Math.min(Math.max(filters.limit ?? 5, 1), 100));
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await pool.query<ProductRow>(
    `SELECT id, name, category, price, image_key, active FROM products ${where} ORDER BY price DESC LIMIT $${values.length}`,
    values,
  );
  return result.rows.map(toProduct);
}

export async function getProductById(pool: Pool, id: number): Promise<Product | null> {
  const result = await pool.query<ProductRow>(
    "SELECT id, name, category, price, image_key, active FROM products WHERE id = $1",
    [id],
  );
  return result.rows[0] ? toProduct(result.rows[0]) : null;
}
