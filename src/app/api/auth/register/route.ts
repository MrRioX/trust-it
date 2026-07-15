import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createSessionToken, setSessionCookie, hashPassword } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, phone, password, displayName } = body as {
      email?: string
      phone?: string
      password?: string
      displayName?: string
    }

    if (!email || !phone || !password) {
      return NextResponse.json({ error: 'Email, phone, and password are required' }, { status: 400 })
    }

    const emailNorm = email.trim().toLowerCase()
    const phoneNorm = phone.trim()

    if (!/^\S+@\S+\.\S+$/.test(emailNorm)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const existing = await db.user.findFirst({
      where: { OR: [{ email: emailNorm }, { phone: phoneNorm }] },
    })
    if (existing) {
      return NextResponse.json({ error: 'Email or phone already registered' }, { status: 409 })
    }

    const user = await db.user.create({
      data: {
        email: emailNorm,
        phone: phoneNorm,
        passwordHash: hashPassword(password),
        displayName: displayName?.trim() || null,
      },
    })

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
    console.error('register error', e)
    return NextResponse.json({ error: e?.message || 'Server error', stack: e?.stack?.slice(0, 200) }, { status: 500 })
  }
}
