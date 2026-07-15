import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET: fetch lastSeen for a friend
export async function GET(req: NextRequest) {
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const userId = url.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { lastSeen: true },
  })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  return NextResponse.json({ lastSeen: user.lastSeen })
}

// POST: update my own lastSeen (called periodically by the client)
export async function POST(req: NextRequest) {
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await db.user.update({
    where: { id: me.id },
    data: { lastSeen: new Date() },
  })

  return NextResponse.json({ ok: true, lastSeen: new Date() })
}
