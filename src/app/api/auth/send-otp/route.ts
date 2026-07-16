import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const otpStore = new Map<string, { code: string; expires: number }>()

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { identifier, type } = body as { identifier?: string; type?: 'email' | 'phone' }

    if (!identifier || !type) {
      return NextResponse.json({ error: 'Identifier and type required' }, { status: 400 })
    }

    const idNorm = identifier.trim().toLowerCase()

    // Check if already registered
    const existing = type === 'email'
      ? await db.user.findUnique({ where: { email: idNorm } })
      : await db.user.findUnique({ where: { phone: identifier.trim() } })

    if (existing) {
      return NextResponse.json({ error: 'This ' + type + ' is already registered' }, { status: 409 })
    }

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expires = Date.now() + 5 * 60 * 1000
    otpStore.set(idNorm, { code, expires })

    let sent = false
    let sendError = ''

    if (type === 'phone') {
      // === SMSGate ===
      const smsgateUser = process.env.SMSGATE_USERNAME
      const smsgatePass = process.env.SMSGATE_PASSWORD

      if (!smsgateUser || !smsgatePass) {
        return NextResponse.json({
          error: 'SMS not configured. Add SMSGATE_USERNAME and SMSGATE_PASSWORD on Vercel, or use email instead.'
        }, { status: 500 })
      }

      try {
        const smsRes = await fetch('https://api.sms-gate.app/3rdparty/v1/messages', {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + Buffer.from(`${smsgateUser}:${smsgatePass}`).toString('base64'),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: `Your Trust It verification code is: ${code}`,
            phoneNumbers: [identifier.trim()],
          }),
        })

        if (smsRes.ok || smsRes.status === 202) {
          sent = true
        } else {
          // Get the EXACT error from SMSGate
          const errText = await smsRes.text()
          sendError = `SMSGate returned ${smsRes.status}: ${errText.slice(0, 300)}`
          console.error('[SMSGate Error]', sendError)
        }
      } catch (e: any) {
        sendError = `SMSGate network error: ${e?.message}`
        console.error('[SMSGate Network Error]', e)
      }
    } else if (type === 'email') {
      // === Resend ===
      const resendKey = process.env.RESEND_API_KEY

      if (!resendKey) {
        return NextResponse.json({
          error: 'Email OTP not configured. Add RESEND_API_KEY on Vercel, or use phone instead.'
        }, { status: 500 })
      }

      try {
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Trust It <noreply@resend.dev>',
            to: [idNorm],
            subject: 'Your Trust It Verification Code',
            html: `<div style="font-family:Arial,sans-serif;max-width:400px;margin:0 auto;padding:20px;"><h2>Trust It</h2><p>Your verification code is:</p><div style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#2196F3;text-align:center;padding:20px;background:#f4f4f5;border-radius:8px;margin:16px 0;">${code}</div><p style="color:#666;font-size:14px;">This code expires in 5 minutes.</p></div>`,
          }),
        })

        if (resendRes.ok) {
          sent = true
        } else {
          const errText = await resendRes.text()
          sendError = `Resend returned ${resendRes.status}: ${errText.slice(0, 200)}`
          console.error('[Resend Error]', sendError)
        }
      } catch (e: any) {
        sendError = `Resend network error: ${e?.message}`
      }
    }

    if (sent) {
      return NextResponse.json({ ok: true, message: `OTP sent to ${idNorm}` })
    } else {
      return NextResponse.json({
        ok: false,
        error: sendError || 'Failed to send OTP. Check server logs for details.',
      }, { status: 500 })
    }
  } catch (e: any) {
    console.error('send-otp error', e)
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}

export { otpStore }
