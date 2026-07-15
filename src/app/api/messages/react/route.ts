import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, getRoomId } from '@/lib/auth'

// React to a message (set or clear emoji reaction)
export async function POST(req: NextRequest) {
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { messageId, emoji } = body as { messageId?: string; emoji?: string | null }
  if (!messageId) return NextResponse.json({ error: 'messageId required' }, { status: 400 })

  // Find the message and verify access
  const message = await db.message.findUnique({ where: { id: messageId } })
  if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 })

  // Verify the user is a participant in this room
  const participants = message.roomId.split('__')
  if (!participants.includes(me.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Toggle reaction: if same emoji already set by this user, clear it; otherwise set it
  const newReaction = message.reaction === emoji && message.reactionBy === me.id ? null : emoji ?? null

  const updated = await db.message.update({
    where: { id: messageId },
    data: {
      reaction: newReaction,
      reactionBy: newReaction ? me.id : null,
    },
  })

  return NextResponse.json({
    ok: true,
    messageId: updated.id,
    reaction: updated.reaction,
    reactionBy: updated.reactionBy,
  })
}
