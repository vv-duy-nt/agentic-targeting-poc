import dotenv from "dotenv"; import { fileURLToPath } from "node:url"; import { buildApp } from "./app.js"; import { loadEnv } from "./config/env.js";
dotenv.config({path:fileURLToPath(new URL("../../../.env",import.meta.url))});
const env=loadEnv(); const app=await buildApp(env); await app.listen({host:"0.0.0.0",port:env.API_PORT});
