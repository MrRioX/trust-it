import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// Send friend request by target userId (resolved via UID search)
export async function POST(req: NextRequest) {
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { toUserId } = body as { toUserId?: string }
  if (!toUserId) return NextResponse.json({ error: 'toUserId required' }, { status: 400 })
  if (toUserId === me.id) return NextResponse.json({ error: 'Cannot friend yourself' }, { status: 400 })

  const target = await db.user.findUnique({ where: { id: toUserId } })
  if (!target) return NextResponse.json({ error: 'Target user not found' }, { status: 404 })

  // Check existing
  const existing = await db.friendRequest.findFirst({
    where: {
      OR: [
        { fromId: me.id, toId: toUserId },
        { fromId: toUserId, toId: me.id },
      ],
    },
  })

  if (existing) {
    if (existing.status === 'accepted') {
      return NextResponse.json({ error: 'Already friends' }, { status: 400 })
    }
    if (existing.status === 'pending' && existing.fromId === me.id) {
      return NextResponse.json({ error: 'Request already sent' }, { status: 400 })
    }
    if (existing.status === 'pending' && existing.fromId === toUserId) {
      // They sent us a request; auto-accept
      await db.friendRequest.update({
        where: { id: existing.id },
        data: { status: 'accepted' },
      })
      return NextResponse.json({ ok: true, autoAccepted: true })
    }
    // declined -> reset to pending
    await db.friendRequest.update({
      where: { id: existing.id },
      data: { status: 'pending', fromId: me.id, toId: toUserId },
    })
    return NextResponse.json({ ok: true })
  }

  await db.friendRequest.create({
    data: { fromId: me.id, toId: toUserId, status: 'pending' },
  })

  return NextResponse.json({ ok: true })
}
