import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import crypto from 'crypto'

// Simple session token = base64(userId:expiry:signature)
// Signature = HMAC-SHA256(secret, userId:expiry)
const SECRET = process.env.SESSION_SECRET || 'dev-secret-change-me'
const COOKIE_NAME = 'enc_chat_session'
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30 // 30 days

function sign(payload: string): string {
  return crypto.createHmac('sha256', SECRET).update(payload).digest('hex')
}

export function createSessionToken(userId: string): string {
  const expiry = Date.now() + SESSION_TTL_MS
  const payload = `${userId}:${expiry}`
  const signature = sign(payload)
  const token = Buffer.from(`${payload}:${signature}`).toString('base64')
  return token
}

export function verifySessionToken(token: string | undefined | null): { userId: string; expiry: number } | null {
  if (!token) return null
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8')
    const parts = decoded.split(':')
    if (parts.length !== 3) return null
    const [userId, expiryStr, signature] = parts
    const expiry = parseInt(expiryStr, 10)
    if (isNaN(expiry) || expiry < Date.now()) return null
    const expectedSig = sign(`${userId}:${expiry}`)
    if (signature !== expectedSig) return null
    return { userId, expiry }
  } catch {
    return null
  }
}

export async function getSession(): Promise<{ userId: string } | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  const result = verifySessionToken(token)
  if (!result) return null
  // Verify user still exists
  const user = await db.user.findUnique({ where: { id: result.userId }, select: { id: true } })
  if (!user) return null
  return { userId: user.id }
}

export async function getCurrentUser() {
  const session = await getSession()
  if (!session) return null
  const user = await db.user.findUnique({ where: { id: session.userId } })
  return user
}

export function setSessionCookie(token: string) {
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_TTL_MS / 1000,
    path: '/',
  }
}

export function clearSessionCookie() {
  return {
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
    path: '/',
  }
}

// Password hashing using PBKDF2 (Node crypto)
const ITERATIONS = 100_000
const KEYLEN = 64

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEYLEN, 'sha512').toString('hex')
  return `pbkdf2$${ITERATIONS}$${salt}$${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const parts = stored.split('$')
    if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false
    const iter = parseInt(parts[1], 10)
    const salt = parts[2]
    const expectedHash = parts[3]
    const hash = crypto.pbkdf2Sync(password, salt, iter, KEYLEN, 'sha512').toString('hex')
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(expectedHash, 'hex'))
  } catch {
    return false
  }
}

export function getRoomId(a: string, b: string): string {
  return [a, b].sort().join('__')
}
