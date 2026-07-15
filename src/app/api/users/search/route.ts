import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// Search user by UID
export async function GET(req: NextRequest) {
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const uid = url.searchParams.get('uid')?.trim()
  if (!uid) return NextResponse.json({ error: 'uid query required' }, { status: 400 })

  const user = await db.user.findUnique({
    where: { uid },
    select: {
      id: true,
      uid: true,
      displayName: true,
      avatarColor: true,
      bio: true,
      publicKey: true,
      profileImageMediaId: true,
    },
  })

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  if (user.id === me.id) return NextResponse.json({ error: 'That is your own UID' }, { status: 400 })

  // Check existing request status
  const existing = await db.friendRequest.findFirst({
    where: {
      OR: [
        { fromId: me.id, toId: user.id },
        { fromId: user.id, toId: me.id },
      ],
    },
  })

  return NextResponse.json({
    user: {
      id: user.id,
      uid: user.uid,
      displayName: user.displayName,
      avatarColor: user.avatarColor,
      bio: user.bio,
      publicKey: user.publicKey,
      profileImageMediaId: user.profileImageMediaId,
    },
    requestStatus: existing?.status ?? null,
  })
}
