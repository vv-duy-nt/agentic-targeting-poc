import { Client } from "minio";
import { z } from "zod";

export const storageConfigSchema = z.object({
  endpoint: z.string().trim().min(1),
  port: z.number().int().positive(),
  useSSL: z.boolean().default(false),
  accessKey: z.string().trim().min(1),
  secretKey: z.string().trim().min(1),
  bucket: z.string().trim().min(1),
  presignedUrlExpirySeconds: z.number().int().positive().default(3_600),
});

export type StorageConfig = z.infer<typeof storageConfigSchema>;
export type StorageConfigInput = z.input<typeof storageConfigSchema>;

export type StorageClient = {
  getPresignedUrl(imageKey: string): Promise<string>;
};

export function createStorageClient(input: StorageConfigInput): StorageClient {
  const config = storageConfigSchema.parse(input);
  const client = new Client({
    endPoint: config.endpoint,
    port: config.port,
    useSSL: config.useSSL,
    accessKey: config.accessKey,
    secretKey: config.secretKey,
  });

  return {
    async getPresignedUrl(imageKey: string): Promise<string> {
      const key = imageKeySchema.parse(imageKey);
      return client.presignedGetObject(
        config.bucket,
        key,
        config.presignedUrlExpirySeconds,
      );
    },
  };
}

const imageKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(1_000)
  .refine(
    (value) => !value.startsWith("/") && !value.split("/").includes(".."),
    "imageKey must be a relative object key without parent traversal.",
  );
