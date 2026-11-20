import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Prisma 7 부터는 드라이버 어댑터를 넘겨야 한다 (SQLite → better-sqlite3).
 * 앱은 src/lib/prisma.ts 의 공유 인스턴스를, scripts/ 와 prisma/seed.ts 는 이 함수를 쓴다.
 *
 * SQLite 상대 경로는 실행 위치(cwd) 기준으로 풀린다. Prisma 6 처럼 schema 파일 기준이 아니다.
 * 그래서 로컬 .env 는 file:./prisma/dev.db, Docker 는 절대 경로 file:/app/db/dev.db 를 쓴다.
 *
 * timestampFormat: 기존 DB 는 Prisma 6 방식대로 DateTime 을 밀리초 정수로 저장해 왔다.
 * 어댑터 기본값(iso8601 문자열)을 쓰면 새로 쓰는 행만 문자열이 되어 형식이 섞이고
 * 날짜 정렬·비교(세션 만료 등)가 틀어진다. 반드시 unixepoch-ms 로 맞춘다.
 */
export function createPrismaClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL 이 설정되지 않았습니다.");
  return new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url }, { timestampFormat: "unixepoch-ms" }),
  });
}
