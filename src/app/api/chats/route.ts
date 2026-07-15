import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, getRoomId } from '@/lib/auth'

// Get list of chat rooms (uses friends list, but includes all metadata needed for chat list)
export async function GET() {
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const accepted = await db.friendRequest.findMany({
    where: {
      status: 'accepted',
      OR: [{ fromId: me.id }, { toId: me.id }],
    },
    include: {
      fromUser: { select: { id: true, uid: true, displayName: true, avatarColor: true, bio: true, publicKey: true, profileImageMediaId: true, lastSeen: true } },
      toUser: { select: { id: true, uid: true, displayName: true, avatarColor: true, bio: true, publicKey: true, profileImageMediaId: true, lastSeen: true } },
    },
  })

  const friends = accepted.map((r) => {
    const friend = r.fromId === me.id ? r.toUser : r.fromUser
    return { ...friend, roomId: getRoomId(me.id, friend.id) }
  })

  // Fetch last message for each
  const enriched = await Promise.all(
    friends.map(async (f) => {
      const msgs = await db.message.findMany({
        where: { roomId: f.roomId },
        orderBy: { createdAt: 'desc' },
        take: 1,
      })
      const last = msgs[0] ?? null
      // Fetch custom background if set
      const bg = await db.chatBackground.findUnique({
        where: { userId_roomId: { userId: me.id, roomId: f.roomId } },
      })
      return {
        ...f,
        lastMessage: last
          ? { type: last.type, senderId: last.senderId, createdAt: last.createdAt }
          : null,
        background: bg
          ? { bgType: bg.bgType, bgValue: bg.bgValue }
          : { bgType: 'default', bgValue: '' },
      }
    })
  )

  enriched.sort((a, b) => {
    const at = a.lastMessage?.createdAt?.getTime() ?? 0
    const bt = b.lastMessage?.createdAt?.getTime() ?? 0
    return bt - at
  })

  return NextResponse.json({ chats: enriched })
}
