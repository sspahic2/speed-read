import { defineConfig } from "prisma/config";

const dbUrl = process.env.DIRECT_URL;
if (!dbUrl) {
  throw new Error("DATABASE_URL is missing. Set it in your environment or .env file.");
}

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    url: dbUrl,
    shadowDatabaseUrl: process.env.DATABASE_URL ?? undefined,
  },
});
