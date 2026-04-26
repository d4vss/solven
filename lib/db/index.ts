import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/lib/db/schema";

function resolveSsl(databaseUrl: string): "require" | false {
  try {
    const normalized = databaseUrl.replace(/^postgres(ql)?:/i, "http:");
    const u = new URL(normalized);
    const mode = (u.searchParams.get("sslmode") ?? "").toLowerCase();
    if (mode === "disable") return false;
    if (
      mode === "require" ||
      mode === "verify-ca" ||
      mode === "verify-full" ||
      mode === "no-verify"
    ) {
      return "require";
    }
    const host = u.hostname;
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
      return false;
    }
    // Neon, RDS, Supabase, etc. reject non-TLS connections unless sslmode=disable
    return "require";
  } catch {
    return "require";
  }
}

// Create a singleton connection pool for Next.js
let pool: postgres.Sql | null = null;

function createPool() {
  if (!pool) {
    const databaseUrl = process.env.DATABASE_URL!;
    pool = postgres(databaseUrl, {
      max: 20,
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: resolveSsl(databaseUrl),
      prepare: false,
      transform: {
        undefined: null,
      },
      types: {
        bigint: postgres.BigInt,
      },
    });
  }
  return pool;
}

// Create the base database instance
const db = drizzle(createPool(), { schema: schema });

// Wrap with automatic encryption/decryption
export default db;

// Graceful shutdown function (for manual cleanup if needed)
export async function closeDatabase() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}