import { ALLOWED_TABLES, tableNameSchema } from "@poc/shared";
import type { Pool } from "pg";

export type TableColumn = { name: string; dataType: string; nullable: boolean };
export type ForeignKey = { column: string; references: string };
export type TableSchema = { table: string; columns: TableColumn[]; foreignKeys: ForeignKey[] };

export async function listTables(pool: Pool) {
  const result = await pool.query<{ table_name: string }>(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = ANY($1::text[])
     ORDER BY table_name`,
    [ALLOWED_TABLES],
  );
  return result.rows.map((row) => row.table_name);
}

export async function getTableSchema(pool: Pool, tableName: string): Promise<TableSchema> {
  const table = tableNameSchema.parse(tableName);
  const [columnsResult, foreignKeysResult] = await Promise.all([
    pool.query<{ column_name: string; data_type: string; is_nullable: "YES" | "NO" }>(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1
       ORDER BY ordinal_position`,
      [table],
    ),
    pool.query<{ column_name: string; referenced_table: string; referenced_column: string }>(
      `SELECT kcu.column_name, ccu.table_name AS referenced_table, ccu.column_name AS referenced_column
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
       JOIN information_schema.constraint_column_usage ccu
         ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
       WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public' AND tc.table_name = $1
       ORDER BY kcu.column_name`,
      [table],
    ),
  ]);

  return {
    table,
    columns: columnsResult.rows.map((row) => ({ name: row.column_name, dataType: row.data_type, nullable: row.is_nullable === "YES" })),
    foreignKeys: foreignKeysResult.rows.map((row) => ({ column: row.column_name, references: `${row.referenced_table}.${row.referenced_column}` })),
  };
}

export async function getDatabaseSchema(pool: Pool) {
  const tables = await listTables(pool);
  return Promise.all(tables.map((table) => getTableSchema(pool, table)));
}
