import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// Set / update UID
export async function POST(req: NextRequest) {
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { uid } = body as { uid?: string }
  if (!uid) return NextResponse.json({ error: 'uid required' }, { status: 400 })

  const uidNorm = uid.trim()
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(uidNorm)) {
    return NextResponse.json({ error: 'UID must be 3-20 chars: letters, numbers, underscores' }, { status: 400 })
  }

  const taken = await db.user.findUnique({ where: { uid: uidNorm } })
  if (taken && taken.id !== me.id) {
    return NextResponse.json({ error: 'UID already taken' }, { status: 409 })
  }

  const updated = await db.user.update({
    where: { id: me.id },
    data: { uid: uidNorm },
  })

  return NextResponse.json({
    ok: true,
    user: {
      id: updated.id,
      email: updated.email,
      phone: updated.phone,
      uid: updated.uid,
      displayName: updated.displayName,
      avatarColor: updated.avatarColor,
      bio: updated.bio,
      publicKey: updated.publicKey,
    },
  })
}

// Update profile (displayName, avatarColor, bio, publicKey)
export async function PATCH(req: NextRequest) {
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { displayName, avatarColor, bio, publicKey, profileImageMediaId } = body as {
    displayName?: string
    avatarColor?: string
    bio?: string
    publicKey?: string
    profileImageMediaId?: string | null
  }

  const data: any = {}
  if (displayName !== undefined) data.displayName = displayName.trim().slice(0, 50) || null
  if (avatarColor !== undefined) {
    if (/^#[0-9a-fA-F]{6}$/.test(avatarColor)) data.avatarColor = avatarColor
  }
  if (bio !== undefined) data.bio = bio.trim().slice(0, 200) || null
  if (publicKey !== undefined) data.publicKey = publicKey
  if (profileImageMediaId !== undefined) data.profileImageMediaId = profileImageMediaId || null

  const updated = await db.user.update({ where: { id: me.id }, data })

  return NextResponse.json({
    ok: true,
    user: {
      id: updated.id,
      email: updated.email,
      phone: updated.phone,
      uid: updated.uid,
      displayName: updated.displayName,
      avatarColor: updated.avatarColor,
      bio: updated.bio,
      publicKey: updated.publicKey,
      profileImageMediaId: updated.profileImageMediaId,
    },
  })
}
