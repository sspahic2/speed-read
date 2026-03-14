import { PrismaClient } from '../../prisma/generated/client'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('Missing DIRECT_URL or DATABASE_URL for Prisma.')
}

const adapter = new PrismaPg({
  connectionString,
})

const globalForPrisma = global as unknown as {
    prisma?: PrismaClient
}

function createPrismaClient() {
  return new PrismaClient({
    adapter,
  })
}

function hasBillingDelegates(client: PrismaClient | undefined): client is PrismaClient {
  return Boolean(client && 'billing' in client && 'billingWebhookEvent' in client)
}

const prisma = hasBillingDelegates(globalForPrisma.prisma)
  ? globalForPrisma.prisma
  : createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
