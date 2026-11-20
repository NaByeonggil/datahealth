// Prisma 7 CLI 설정 — migrate·generate·studio·db seed 가 읽는다.
// Prisma 7 은 .env 를 자동으로 읽지 않으므로 dotenv 로 직접 불러온다.
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
