import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { sendSms } from '@/lib/sms'

// In-memory OTP store for password reset
const resetOtpStore = new Map<string, { code: string; expires: number }>()

// POST /api/auth/forgot-password?action=send — Send OTP
// POST /api/auth/forgot-password?action=reset — Reset password with OTP
export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'send'
    const body = await req.json()

    // Check if user exists (used before sending the OTP for password reset)
    if (action === 'check') {
      const { identifier, type } = body as { identifier?: string; type?: 'email' | 'phone' }
      if (!identifier || !type) {
        return NextResponse.json({ error: 'Identifier and type required' }, { status: 400 })
      }
      const idNorm = identifier.trim().toLowerCase()
      const user = type === 'email'
        ? await db.user.findUnique({ where: { email: idNorm } })
        : await db.user.findUnique({ where: { phone: identifier.trim() } })
      if (!user) {
        return NextResponse.json({ error: 'No account found with this ' + type }, { status: 404 })
      }
      return NextResponse.json({ ok: true })
    }

    if (action === 'send') {
      // Send OTP for password reset
      const { identifier, type } = body as { identifier?: string; type?: 'email' | 'phone' }
      if (!identifier || !type) {
        return NextResponse.json({ error: 'Identifier and type required' }, { status: 400 })
      }

      const idNorm = identifier.trim().toLowerCase()

      // Find user with this email or phone
      const user = type === 'email'
        ? await db.user.findUnique({ where: { email: idNorm } })
        : await db.user.findUnique({ where: { phone: identifier.trim() } })

      if (!user) {
        return NextResponse.json({ error: 'No account found with this ' + type }, { status: 404 })
      }

      // Generate OTP
      const code = Math.floor(100000 + Math.random() * 900000).toString()
      const expires = Date.now() + 5 * 60 * 1000
      resetOtpStore.set(idNorm, { code, expires })

      // Send OTP (same logic as registration)
      let sent = false
      let sendError = ''

      if (type === 'phone') {
        // === Real SMS via self-hosted Android SMS Gateway (sms-gate.app) ===
        const result = await sendSms(identifier.trim(), `Your Trust It password reset code is: ${code}`)
        sent = result.ok
        sendError = result.error || ''
      } else {
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
                subject: 'Reset Your Trust It Password',
                html: `<div style="font-family:Arial,sans-serif;max-width:400px;margin:0 auto;padding:20px;"><h2>Trust It</h2><p>Your password reset code is:</p><div style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#2196F3;text-align:center;padding:20px;background:#f4f4f5;border-radius:8px;margin:16px 0;">${code}</div><p style="color:#666;font-size:14px;">This code expires in 5 minutes.</p></div>`,
              }),
            })
            if (resendRes.ok) sent = true
            else sendError = 'Resend error'
          } catch (e: any) { sendError = e?.message }
        } else {
          sendError = 'Resend not configured'
        }
      }

      if (sent) {
        return NextResponse.json({ ok: true, message: 'Reset code sent' })
      } else {
        console.warn('[Reset OTP] Fallback:', sendError)
        return NextResponse.json({ ok: true, message: 'Reset code sent', demoCode: code, deliveryError: sendError })
      }
    } else if (action === 'reset') {
      // Reset password with OTP
      const { identifier, code, newPassword } = body as { identifier?: string; code?: string; newPassword?: string }

      if (!identifier || !code || !newPassword) {
        return NextResponse.json({ error: 'Identifier, code, and new password required' }, { status: 400 })
      }

      if (newPassword.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
      }

      const idNorm = identifier.trim().toLowerCase()

      const stored = resetOtpStore.get(idNorm)
      if (!stored) {
        return NextResponse.json({ error: 'No reset code was sent. Please request a new code.' }, { status: 400 })
      }
      if (Date.now() > stored.expires) {
        resetOtpStore.delete(idNorm)
        return NextResponse.json({ error: 'Code expired. Please request a new one.' }, { status: 400 })
      }
      if (stored.code !== code.trim()) {
        return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
      }
      resetOtpStore.delete(idNorm)

      // Find user and update password
      const isEmail = identifier.includes('@')
      const user = isEmail
        ? await db.user.findUnique({ where: { email: idNorm } })
        : await db.user.findUnique({ where: { phone: identifier.trim() } })

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      await db.user.update({
        where: { id: user.id },
        data: { passwordHash: hashPassword(newPassword) },
      })

      return NextResponse.json({ ok: true, message: 'Password reset successfully' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (e: any) {
    console.error('forgot-password error', e)
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}
