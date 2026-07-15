import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// List incoming + outgoing friend requests
export async function GET() {
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [incoming, outgoing] = await Promise.all([
    db.friendRequest.findMany({
      where: { toId: me.id, status: 'pending' },
      include: {
        fromUser: {
          select: { id: true, uid: true, displayName: true, avatarColor: true, bio: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    db.friendRequest.findMany({
      where: { fromId: me.id, status: 'pending' },
      include: {
        toUser: {
          select: { id: true, uid: true, displayName: true, avatarColor: true, bio: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return NextResponse.json({
    incoming: incoming.map((r) => ({
      id: r.id,
      from: r.fromUser,
      createdAt: r.createdAt,
    })),
    outgoing: outgoing.map((r) => ({
      id: r.id,
      to: r.toUser,
      createdAt: r.createdAt,
    })),
  })
}
