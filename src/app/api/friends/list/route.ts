import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, getRoomId } from '@/lib/auth'

// List all friends (accepted requests)
export async function GET() {
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const accepted = await db.friendRequest.findMany({
    where: {
      status: 'accepted',
      OR: [{ fromId: me.id }, { toId: me.id }],
    },
    include: {
      fromUser: { select: { id: true, uid: true, displayName: true, avatarColor: true, bio: true } },
      toUser: { select: { id: true, uid: true, displayName: true, avatarColor: true, bio: true } },
    },
  })

  const friends = accepted.map((r) => {
    const friend = r.fromId === me.id ? r.toUser : r.fromUser
    return {
      ...friend,
      roomId: getRoomId(me.id, friend.id),
    }
  })

  // For each friend, also fetch the last message preview (encrypted, just for ordering)
  const friendIds = friends.map((f) => f.id)
  const lastMessages = await Promise.all(
    friendIds.map(async (fid) => {
      const msgs = await db.message.findMany({
        where: { roomId: getRoomId(me.id, fid) },
        orderBy: { createdAt: 'desc' },
        take: 1,
      })
      return { friendId: fid, last: msgs[0] ?? null }
    })
  )
  const lastMap = new Map(lastMessages.map((m) => [m.friendId, m.last]))

  // Sort friends by last message time (most recent first), then by name
  friends.sort((a, b) => {
    const at = lastMap.get(a.id)?.createdAt?.getTime() ?? 0
    const bt = lastMap.get(b.id)?.createdAt?.getTime() ?? 0
    return bt - at
  })

  return NextResponse.json({
    friends: friends.map((f) => ({
      ...f,
      lastMessage: lastMap.get(f.id)
        ? {
            type: lastMap.get(f.id)!.type,
            createdAt: lastMap.get(f.id)!.createdAt,
          }
        : null,
    })),
  })
}
