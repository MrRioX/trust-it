import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, getRoomId } from '@/lib/auth'

// Set custom background for a chat room
export async function POST(req: NextRequest) {
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { friendId, bgType, bgValue } = body as {
    friendId?: string
    bgType?: string
    bgValue?: string
  }
  if (!friendId || !bgType) {
    return NextResponse.json({ error: 'friendId and bgType required' }, { status: 400 })
  }

  const validTypes = ['default', 'gradient', 'solid', 'pattern']
  if (!validTypes.includes(bgType)) {
    return NextResponse.json({ error: 'Invalid bgType' }, { status: 400 })
  }

  const roomId = getRoomId(me.id, friendId)

  const bg = await db.chatBackground.upsert({
    where: { userId_roomId: { userId: me.id, roomId } },
    update: { bgType, bgValue: bgValue ?? '' },
    create: { userId: me.id, roomId, bgType, bgValue: bgValue ?? '' },
  })

  return NextResponse.json({
    ok: true,
    background: { bgType: bg.bgType, bgValue: bg.bgValue },
  })
}

// Get background for a room
export async function GET(req: NextRequest) {
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const friendId = url.searchParams.get('friendId')
  if (!friendId) return NextResponse.json({ error: 'friendId required' }, { status: 400 })

  const roomId = getRoomId(me.id, friendId)
  const bg = await db.chatBackground.findUnique({
    where: { userId_roomId: { userId: me.id, roomId } },
  })

  return NextResponse.json({
    background: bg
      ? { bgType: bg.bgType, bgValue: bg.bgValue }
      : { bgType: 'default', bgValue: '' },
  })
}
