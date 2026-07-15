import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createSessionToken, setSessionCookie, verifyPassword } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { identifier, password } = body as { identifier?: string; password?: string }

    if (!identifier || !password) {
      return NextResponse.json({ error: 'Identifier and password are required' }, { status: 400 })
    }

    const idNorm = identifier.trim().toLowerCase()

    // Try by email, phone, or UID
    const user = await db.user.findFirst({
      where: {
        OR: [
          { email: idNorm },
          { phone: identifier.trim() },
          { uid: idNorm },
        ],
      },
    })

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const token = createSessionToken(user.id)
    const res = NextResponse.json({
      ok: true,
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
      },
    })
    res.cookies.set(setSessionCookie(token))
    return res
  } catch (e: any) {
    console.error('login error', e)
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}
