import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, getRoomId } from '@/lib/auth'

// Mark messages from a friend as seen by me
export async function POST(req: NextRequest) {
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { friendId, messageIds } = body as { friendId?: string; messageIds?: string[] }
  if (!friendId || !Array.isArray(messageIds) || messageIds.length === 0) {
    return NextResponse.json({ error: 'friendId and messageIds required' }, { status: 400 })
  }

  const roomId = getRoomId(me.id, friendId)
  const now = new Date()

  // Only mark messages that:
  // 1. Are in this room
  // 2. Were sent by the friend (not by me)
  // 3. Are not yet seen
  // 4. Are in the provided messageIds list
  const result = await db.message.updateMany({
    where: {
      roomId,
      senderId: friendId, // messages sent BY the friend
      id: { in: messageIds },
      seenAt: null,
    },
    data: { seenAt: now },
  })

  return NextResponse.json({
    ok: true,
    markedCount: result.count,
    seenAt: now,
    messageIds, // echo back for client to update
  })
}
