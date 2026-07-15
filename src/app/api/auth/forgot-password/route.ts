import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

// Reset password using email + phone verification
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, phone, newPassword } = body as {
      email?: string
      phone?: string
      newPassword?: string
    }

    if (!email || !phone || !newPassword) {
      return NextResponse.json({ error: 'Email, phone, and new password are required' }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const emailNorm = email.trim().toLowerCase()
    const phoneNorm = phone.trim()

    // Find user with matching email AND phone
    const user = await db.user.findFirst({
      where: { email: emailNorm, phone: phoneNorm },
    })

    if (!user) {
      return NextResponse.json({ error: 'Email and phone do not match any account' }, { status: 404 })
    }

    // Update password
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash: hashPassword(newPassword) },
    })

    return NextResponse.json({ ok: true, message: 'Password reset successfully' })
  } catch (e: any) {
    console.error('forgot-password error', e)
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}
