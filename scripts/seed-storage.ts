import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { Client } from "minio";

process.loadEnvFile(".env");

const required = [
  "MINIO_ENDPOINT",
  "MINIO_PORT",
  "MINIO_ACCESS_KEY",
  "MINIO_SECRET_KEY",
  "MINIO_BUCKET",
] as const;

for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing ${key} in .env`);
}

const client = new Client({
  endPoint: process.env.MINIO_ENDPOINT!,
  port: Number(process.env.MINIO_PORT!),
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ACCESS_KEY!,
  secretKey: process.env.MINIO_SECRET_KEY!,
});
const bucket = process.env.MINIO_BUCKET!;
const assetRoot = join(process.cwd(), "demo-data", "images");

async function listFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  }));
  return files.flat();
}

const contentType = (key: string) => key.endsWith(".png") ? "image/png" : "image/jpeg";

async function seed() {
  if (!(await client.bucketExists(bucket))) await client.makeBucket(bucket);

  const files = await listFiles(assetRoot);
  for (const file of files) {
    const key = relative(assetRoot, file).replaceAll("\\", "/");
    await client.putObject(bucket, key, await readFile(file), undefined, { "Content-Type": contentType(key) });
  }
  console.log(`Uploaded ${files.length} assets to bucket ${bucket}.`);
}

seed().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
