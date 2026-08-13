import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // CLI-only (generate/migrate) — DIRECT_URL if set (production, points
    // straight at Postgres bypassing PgBouncer), falling back to
    // DATABASE_URL for local dev where there's no pooler in front of it.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
});
