import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Use the DATABASE_URL environment variable (set in Vercel/Render)
// Fall back to a local SQLite file for development only
let DB_URL = process.env.DATABASE_URL || 'file:/home/z/trust-it-data/custom.db'

// For PostgreSQL with PgBouncer (Supabase pooler), ensure pgbouncer=true is set
// This prevents "prepared statement already exists" errors (42P05)
if (DB_URL.startsWith('postgresql://') || DB_URL.startsWith('postgres://')) {
  if (!DB_URL.includes('pgbouncer=')) {
    DB_URL += (DB_URL.includes('?') ? '&' : '?') + 'pgbouncer=true&prepared_statements=false'
  }
}

// Log the database URL (without password) for debugging
const safeUrl = DB_URL.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@')
console.log('[db.ts] Using database URL:', safeUrl)
console.log('[db.ts] NODE_ENV:', process.env.NODE_ENV)

// Create a single PrismaClient instance and reuse it across hot reloads
export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
    datasources: {
      db: {
        url: DB_URL,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
