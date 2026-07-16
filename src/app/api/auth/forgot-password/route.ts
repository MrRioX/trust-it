import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'send'
    const body = await req.json()

    if (action === 'check') {
      const { identifier, type } = body as { identifier?: string; type?: 'email' | 'phone' }
      if (!identifier || !type) return NextResponse.json({ error: 'Identifier and type required' }, { status: 400 })
      const idNorm = identifier.trim().toLowerCase()
      const user = type === 'email'
        ? await db.user.findUnique({ where: { email: idNorm } })
        : await db.user.findUnique({ where: { phone: identifier.trim() } })
      if (!user) return NextResponse.json({ error: 'No account found with this ' + type }, { status: 404 })
      return NextResponse.json({ ok: true })
    }

    if (action === 'send') {
      const { identifier, type } = body as { identifier?: string; type?: 'email' | 'phone' }
      if (!identifier || !type) return NextResponse.json({ error: 'Identifier and type required' }, { status: 400 })
      const idNorm = identifier.trim().toLowerCase()

      // Find user
      const user = type === 'email'
        ? await db.user.findUnique({ where: { email: idNorm } })
        : await db.user.findUnique({ where: { phone: identifier.trim() } })
      if (!user) return NextResponse.json({ error: 'No account found' }, { status: 404 })

      // Generate secure OTP
      const code = crypto.randomInt(100000, 999999).toString()
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000)

      await db.otp.deleteMany({ where: { phone: idNorm } })
      await db.otp.create({ data: { phone: idNorm, code, verified: false, expiresAt } })

      // Send via gateway
      if (type === 'phone') {
        const gatewayUrl = process.env.SMS_GATEWAY_URL
        const gatewayKey = process.env.SMS_GATEWAY_API_KEY
        if (!gatewayUrl || !gatewayKey) return NextResponse.json({ error: 'Unable to send OTP. Retry later.' }, { status: 503 })
        try {
          const r = await fetch(gatewayUrl, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${gatewayKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: identifier.trim(), message: `Your TrustIT password reset code is ${code}. Valid for 5 minutes.` }),
          })
          if (!r.ok) return NextResponse.json({ error: 'Unable to send OTP. Retry later.' }, { status: 502 })
        } catch { return NextResponse.json({ error: 'Unable to send OTP. Retry later.' }, { status: 502 }) }
      } else {
        const resendKey = process.env.RESEND_API_KEY
        if (!resendKey) return NextResponse.json({ error: 'Unable to send OTP. Retry later.' }, { status: 503 })
        try {
          const r = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: 'Trust It <noreply@resend.dev>', to: [idNorm], subject: 'Reset Your TrustIT Password', html: `<div style="font-family:Arial;"><h2>Trust It</h2><p>Reset code:</p><div style="font-size:32px;font-weight:bold;color:#2196F3;">${code}</div><p>Valid for 5 minutes.</p></div>` }),
          })
          if (!r.ok) return NextResponse.json({ error: 'Unable to send OTP. Retry later.' }, { status: 502 })
        } catch { return NextResponse.json({ error: 'Unable to send OTP. Retry later.' }, { status: 502 }) }
      }

      return NextResponse.json({ ok: true, message: 'OTP Sent Successfully' })
    }

    if (action === 'reset') {
      const { identifier, code, newPassword } = body as { identifier?: string; code?: string; newPassword?: string }
      if (!identifier || !code || !newPassword) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
      if (newPassword.length < 6) return NextResponse.json({ error: 'Password too short' }, { status: 400 })

      const idNorm = identifier.trim().toLowerCase()

      // Verify OTP from database
      const otpRecord = await db.otp.findFirst({ where: { phone: idNorm }, orderBy: { createdAt: 'desc' } })
      if (!otpRecord) return NextResponse.json({ error: 'No code sent. Request a new one.' }, { status: 400 })
      if (otpRecord.verified) return NextResponse.json({ error: 'Code already used.' }, { status: 400 })
      if (new Date() > otpRecord.expiresAt) { await db.otp.delete({ where: { id: otpRecord.id } }); return NextResponse.json({ error: 'Code expired.' }, { status: 400 }) }
      if (otpRecord.code !== code.trim()) return NextResponse.json({ error: 'Invalid code.' }, { status: 400 })

      // Invalidate OTP
      await db.otp.delete({ where: { id: otpRecord.id } })

      // Reset password
      const isEmail = identifier.includes('@')
      const user = isEmail ? await db.user.findUnique({ where: { email: idNorm } }) : await db.user.findUnique({ where: { phone: identifier.trim() } })
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
      await db.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(newPassword) } })

      return NextResponse.json({ ok: true, message: 'Password reset successfully' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (e: any) {
    console.error('forgot-password error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
