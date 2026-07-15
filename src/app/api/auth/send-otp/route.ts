import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// In-memory OTP store (for production, use Redis or DB table)
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
    const expires = Date.now() + 5 * 60 * 1000 // 5 minutes
    otpStore.set(idNorm, { code, expires })

    // Send real OTP via SMS (Twilio) or Email (Resend)
    let sent = false
    let sendError = ''

    if (type === 'phone') {
      // === REAL SMS via Twilio ===
      // Requires: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER env vars
      const twilioSid = process.env.TWILIO_ACCOUNT_SID
      const twilioToken = process.env.TWILIO_AUTH_TOKEN
      const twilioFrom = process.env.TWILIO_PHONE_NUMBER

      if (twilioSid && twilioToken && twilioFrom) {
        try {
          const twilioRes = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
            {
              method: 'POST',
              headers: {
                'Authorization': 'Basic ' + Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64'),
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams({
                To: identifier.trim(),
                From: twilioFrom,
                Body: `Your Trust It verification code is: ${code}`,
              }),
            }
          )
          if (twilioRes.ok) {
            sent = true
          } else {
            const errText = await twilioRes.text()
            sendError = `Twilio error: ${errText.slice(0, 100)}`
          }
        } catch (e: any) {
          sendError = e?.message || 'Twilio network error'
        }
      } else {
        sendError = 'Twilio not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER env vars.'
      }
    } else if (type === 'email') {
      // === REAL Email via Resend ===
      // Requires: RESEND_API_KEY env var
      const resendKey = process.env.RESEND_API_KEY

      if (resendKey) {
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
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
                  <h2 style="color: #0a0a0a;">Trust It</h2>
                  <p>Your verification code is:</p>
                  <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2196F3; text-align: center; padding: 20px; background: #f4f4f5; border-radius: 8px; margin: 16px 0;">
                    ${code}
                  </div>
                  <p style="color: #666; font-size: 14px;">This code expires in 5 minutes. Do not share it with anyone.</p>
                </div>
              `,
            }),
          })
          if (resendRes.ok) {
            sent = true
          } else {
            const errText = await resendRes.text()
            sendError = `Resend error: ${errText.slice(0, 100)}`
          }
        } catch (e: any) {
          sendError = e?.message || 'Resend network error'
        }
      } else {
        sendError = 'Resend not configured. Set RESEND_API_KEY env var.'
      }
    }

    // If OTP was sent successfully, don't return the code
    // If not sent (no API keys configured), return the code for demo/fallback
    if (sent) {
      return NextResponse.json({
        ok: true,
        message: `OTP sent to ${idNorm}`,
      })
    } else {
      // Fallback: return code so the notification toast can show it
      // (used when Twilio/Resend are not configured yet)
      console.warn('[OTP] Delivery failed, returning code for fallback:', sendError)
      return NextResponse.json({
        ok: true,
        message: `OTP sent to ${idNorm}`,
        demoCode: code, // Fallback: shown as notification if real delivery fails
        deliveryError: sendError,
      })
    }
  } catch (e: any) {
    console.error('send-otp error', e)
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}

// Export for sharing with verify route
export { otpStore }
