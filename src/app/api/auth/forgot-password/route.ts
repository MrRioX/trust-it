import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

// In-memory OTP store for password reset
const resetOtpStore = new Map<string, { code: string; expires: number }>()

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'send'
    const body = await req.json()

    // Check if user exists
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

      // Generate OTP
      const code = Math.floor(100000 + Math.random() * 900000).toString()
      const expires = Date.now() + 5 * 60 * 1000
      resetOtpStore.set(idNorm, { code, expires })

      let sent = false
      let sendError = ''

      if (type === 'phone') {
        // SMSGate
        const smsgateUser = process.env.SMSGATE_USERNAME
        const smsgatePass = process.env.SMSGATE_PASSWORD
        if (smsgateUser && smsgatePass) {
          try {
            const smsRes = await fetch('https://api.sms-gate.app/3rdparty/v1/messages', {
              method: 'POST',
              headers: {
                'Authorization': 'Basic ' + Buffer.from(`${smsgateUser}:${smsgatePass}`).toString('base64'),
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                message: `Your Trust It password reset code is: ${code}`,
                phoneNumbers: [identifier.trim()],
              }),
            })
            if (smsRes.ok || smsRes.status === 202) sent = true
            else { const t = await smsRes.text(); sendError = `SMSGate: ${smsRes.status} ${t.slice(0, 150)}` }
          } catch (e: any) { sendError = e?.message }
        } else { sendError = 'SMSGate not configured' }
      } else {
        const resendKey = process.env.RESEND_API_KEY
        if (resendKey) {
          try {
            const r = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ from: 'Trust It <noreply@resend.dev>', to: [idNorm], subject: 'Reset Your Trust It Password', html: `<div style="font-family:Arial;"><h2>Trust It</h2><p>Reset code:</p><div style="font-size:32px;font-weight:bold;color:#2196F3;">${code}</div></div>` }),
            })
            if (r.ok) sent = true; else sendError = 'Resend error'
          } catch (e: any) { sendError = e?.message }
        } else { sendError = 'Email not configured' }
      }

      if (sent) return NextResponse.json({ ok: true, message: 'Reset code sent' })
      else return NextResponse.json({ ok: false, error: sendError || 'Failed to send' }, { status: 500 })
    }

    if (action === 'reset') {
      const { identifier, code, newPassword } = body as { identifier?: string; code?: string; newPassword?: string }
      if (!identifier || !code || !newPassword) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
      if (newPassword.length < 6) return NextResponse.json({ error: 'Password too short' }, { status: 400 })

      const idNorm = identifier.trim().toLowerCase()
      const stored = resetOtpStore.get(idNorm)
      if (!stored) return NextResponse.json({ error: 'No code sent. Request a new one.' }, { status: 400 })
      if (Date.now() > stored.expires) { resetOtpStore.delete(idNorm); return NextResponse.json({ error: 'Code expired' }, { status: 400 }) }
      if (stored.code !== code.trim()) return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
      resetOtpStore.delete(idNorm)

      const isEmail = identifier.includes('@')
      const user = isEmail ? await db.user.findUnique({ where: { email: idNorm } }) : await db.user.findUnique({ where: { phone: identifier.trim() } })
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
      await db.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(newPassword) } })
      return NextResponse.json({ ok: true, message: 'Password reset successfully' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (e: any) {
    console.error('forgot-password error', e)
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}
