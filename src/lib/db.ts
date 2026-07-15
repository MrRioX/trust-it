import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Use the correct database URL — override any stale system env var
// The database is stored OUTSIDE the project directory to prevent
// Next.js file watcher from triggering recompilation on every DB write.
const DB_URL = 'file:/home/z/trust-it-data/custom.db'

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
