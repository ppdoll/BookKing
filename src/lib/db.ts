import { PrismaClient } from "@prisma/client";

/**
 * Neon 서버리스 최적화 — 직접 연결 대신 커넥션 풀러(-pooler) 엔드포인트로 접속한다.
 * Vercel 함수는 인스턴스마다 새 TCP+TLS 연결을 만들기 때문에 직접 연결은 수립 비용이 크다.
 * (prisma db push 같은 CLI는 .env의 DATABASE_URL 원본(직접 연결)을 그대로 사용)
 */
function toPooledUrl(raw: string | undefined) {
  if (!raw) return raw;
  try {
    const url = new URL(raw);
    const [endpoint, ...rest] = url.hostname.split(".");
    if (url.hostname.endsWith(".neon.tech") && !endpoint.endsWith("-pooler")) {
      url.hostname = [`${endpoint}-pooler`, ...rest].join(".");
      url.searchParams.set("pgbouncer", "true"); // PgBouncer 경유 시 prepared statement 비활성화
      url.searchParams.set("connect_timeout", "15");
    }
    return url.toString();
  } catch {
    return raw;
  }
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ datasourceUrl: toPooledUrl(process.env.DATABASE_URL) });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
