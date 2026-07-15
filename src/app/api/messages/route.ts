import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, getRoomId } from '@/lib/auth'

// GET messages for a room
export async function GET(req: NextRequest) {
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const friendId = url.searchParams.get('friendId')
  const before = url.searchParams.get('before') // ISO string for pagination
  if (!friendId) return NextResponse.json({ error: 'friendId required' }, { status: 400 })

  const roomId = getRoomId(me.id, friendId)
  const messages = await db.message.findMany({
    where: {
      roomId,
      ...(before ? { createdAt: { lt: new Date(before) } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return NextResponse.json({
    messages: messages.reverse().map((m) => ({
      id: m.id,
      roomId: m.roomId,
      senderId: m.senderId,
      encryptedData: m.encryptedData,
      type: m.type,
      mediaId: m.mediaId,
      seenAt: m.seenAt,
      replyToId: m.replyToId,
      replyToSnippet: m.replyToSnippet,
      replyToSender: m.replyToSender,
      reaction: m.reaction,
      reactionBy: m.reactionBy,
      createdAt: m.createdAt,
    })),
  })
}

// POST a new message (the encryptedData is the AES-GCM-encrypted ciphertext, base64)
export async function POST(req: NextRequest) {
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { toUserId, encryptedData, type, mediaId, clientId, replyToId, replyToSnippet, replyToSender } = body as {
    toUserId?: string
    encryptedData?: string
    type?: string
    mediaId?: string
    clientId?: string
    replyToId?: string
    replyToSnippet?: string
    replyToSender?: string
  }
  if (!toUserId || !encryptedData || !type) {
    return NextResponse.json({ error: 'toUserId, encryptedData, type required' }, { status: 400 })
  }

  const roomId = getRoomId(me.id, toUserId)

  // Verify friendship
  const friendship = await db.friendRequest.findFirst({
    where: {
      status: 'accepted',
      OR: [
        { fromId: me.id, toId: toUserId },
        { fromId: toUserId, toId: me.id },
      ],
    },
  })
  if (!friendship) {
    return NextResponse.json({ error: 'Not friends with this user' }, { status: 403 })
  }

  const message = await db.message.create({
    data: {
      roomId,
      senderId: me.id,
      encryptedData,
      type,
      mediaId: mediaId ?? null,
      replyToId: replyToId ?? null,
      replyToSnippet: replyToSnippet ?? null,
      replyToSender: replyToSender ?? null,
    },
  })

  return NextResponse.json({
    ok: true,
    message: {
      id: message.id,
      roomId: message.roomId,
      senderId: message.senderId,
      encryptedData: message.encryptedData,
      type: message.type,
      mediaId: message.mediaId,
      seenAt: message.seenAt,
      replyToId: message.replyToId,
      replyToSnippet: message.replyToSnippet,
      replyToSender: message.replyToSender,
      reaction: message.reaction,
      reactionBy: message.reactionBy,
      createdAt: message.createdAt,
    },
  })
}
