import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createSessionToken, setSessionCookie, hashPassword } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, phone, password, displayName, uid } = body as {
      email?: string
      phone?: string
      password?: string
      displayName?: string
      uid?: string
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    if (!email && !phone) {
      return NextResponse.json({ error: 'Email or phone is required' }, { status: 400 })
    }

    const emailNorm = email ? email.trim().toLowerCase() : null
    const phoneNorm = phone ? phone.trim() : null

    // Validate UID if provided
    let uidNorm: string | null = null
    if (uid && uid.trim()) {
      uidNorm = uid.trim()
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(uidNorm)) {
        return NextResponse.json({ error: 'UID must be 3-20 chars: letters, numbers, underscores' }, { status: 400 })
      }
      const uidTaken = await db.user.findUnique({ where: { uid: uidNorm } })
      if (uidTaken) {
        return NextResponse.json({ error: 'UID already taken' }, { status: 409 })
      }
    }

    // Check existing email/phone
    if (emailNorm) {
      const e = await db.user.findUnique({ where: { email: emailNorm } })
      if (e) return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    }
    if (phoneNorm) {
      const p = await db.user.findUnique({ where: { phone: phoneNorm } })
      if (p) return NextResponse.json({ error: 'Phone already registered' }, { status: 409 })
    }

    const user = await db.user.create({
      data: {
        email: emailNorm || `phone_${phoneNorm}@trustit.local`, // fallback email if only phone
        phone: phoneNorm || '0000000000',
        passwordHash: hashPassword(password),
        displayName: displayName?.trim() || null,
        uid: uidNorm,
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
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}
