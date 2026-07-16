import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { identifier, type } = body as { identifier?: string; type?: 'email' | 'phone' }

    if (!identifier || !type) {
      return NextResponse.json({ error: 'Identifier and type required' }, { status: 400 })
    }

    // Validate phone number format
    if (type === 'phone') {
      const phone = identifier.trim()
      if (!/^\+\d{10,15}$/.test(phone)) {
        return NextResponse.json({ error: 'Invalid phone number. Must include country code (e.g. +919876543210).' }, { status: 400 })
      }

      // Check if already registered
      const existing = await db.user.findUnique({ where: { phone } })
      if (existing) {
        return NextResponse.json({ error: 'This phone number is already registered' }, { status: 409 })
      }

      // Generate cryptographically secure 6-digit OTP
      const code = crypto.randomInt(100000, 999999).toString()
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

      // Delete any previous OTPs for this phone, then save new one
      await db.otp.deleteMany({ where: { phone } })
      await db.otp.create({
        data: { phone, code, verified: false, expiresAt },
      })

      // Call Android SMS Gateway (SERVER-SIDE ONLY — API key never exposed to client)
      const gatewayUrl = process.env.SMS_GATEWAY_URL // e.g. http://192.168.1.5:8080/send
      const gatewayKey = process.env.SMS_GATEWAY_API_KEY

      if (!gatewayUrl || !gatewayKey) {
        console.error('[OTP] SMS_GATEWAY_URL or SMS_GATEWAY_API_KEY not configured')
        return NextResponse.json({ error: 'Unable to send OTP. Retry later.' }, { status: 503 })
      }

      try {
        const gatewayRes = await fetch(gatewayUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${gatewayKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone: phone,
            message: `Your TrustIT verification code is ${code}. Valid for 5 minutes.`,
          }),
        })

        if (!gatewayRes.ok) {
          const errText = await gatewayRes.text()
          console.error('[OTP] Gateway returned', gatewayRes.status, errText)
          return NextResponse.json({ error: 'Unable to send OTP. Retry later.' }, { status: 502 })
        }

        // Success
        return NextResponse.json({ ok: true, message: 'OTP Sent Successfully' })

      } catch (e: any) {
        console.error('[OTP] Gateway network error:', e?.message)
        return NextResponse.json({ error: 'Unable to send OTP. Retry later.' }, { status: 502 })
      }

    } else if (type === 'email') {
      // Email OTP via Resend
      const email = identifier.trim().toLowerCase()
      if (!/^\S+@\S+\.\S+$/.test(email)) {
        return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
      }

      const existing = await db.user.findUnique({ where: { email } })
      if (existing) {
        return NextResponse.json({ error: 'This email is already registered' }, { status: 409 })
      }

      const code = crypto.randomInt(100000, 999999).toString()
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000)

      await db.otp.deleteMany({ where: { phone: email } })
      await db.otp.create({
        data: { phone: email, code, verified: false, expiresAt },
      })

      const resendKey = process.env.RESEND_API_KEY
      if (!resendKey) {
        return NextResponse.json({ error: 'Unable to send OTP. Retry later.' }, { status: 503 })
      }

      try {
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Trust It <noreply@resend.dev>',
            to: [email],
            subject: 'Your TrustIT Verification Code',
            html: `<div style="font-family:Arial;max-width:400px;margin:0 auto;padding:20px;"><h2>Trust It</h2><p>Your verification code is:</p><div style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#2196F3;text-align:center;padding:20px;background:#f4f4f5;border-radius:8px;">${code}</div><p style="color:#666;font-size:14px;">Valid for 5 minutes.</p></div>`,
          }),
        })

        if (!resendRes.ok) {
          console.error('[OTP] Resend returned', resendRes.status)
          return NextResponse.json({ error: 'Unable to send OTP. Retry later.' }, { status: 502 })
        }

        return NextResponse.json({ ok: true, message: 'OTP Sent Successfully' })
      } catch (e: any) {
        console.error('[OTP] Resend error:', e?.message)
        return NextResponse.json({ error: 'Unable to send OTP. Retry later.' }, { status: 502 })
      }
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (e: any) {
    console.error('send-otp error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
