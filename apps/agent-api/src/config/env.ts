import { z } from "zod";
const schema = z.object({ API_PORT:z.coerce.number().default(3001), POSTGRES_HOST:z.string(), POSTGRES_PORT:z.coerce.number(), POSTGRES_DB:z.string(), POSTGRES_ADMIN_USER:z.string(), POSTGRES_ADMIN_PASSWORD:z.string(), POSTGRES_AGENT_USER:z.string(), POSTGRES_AGENT_PASSWORD:z.string(), SQL_TIMEOUT_MS:z.coerce.number().default(5000) });
export type Env=z.infer<typeof schema>; export const loadEnv=()=>schema.parse(process.env);
