import { NextResponse } from 'next/server'
import { getCurrentUser, clearSessionCookie } from '@/lib/auth'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ user: null })
  }
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      uid: user.uid,
      displayName: user.displayName,
      avatarColor: user.avatarColor,
      bio: user.bio,
      publicKey: user.publicKey,
      profileImageMediaId: user.profileImageMediaId,
      createdAt: user.createdAt,
    },
  })
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(clearSessionCookie())
  return res
}
