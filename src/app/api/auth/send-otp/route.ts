import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// In-memory OTP store (resets on server restart — for production, use Redis or DB)
// For a real production app, you'd send this via Twilio/SendGrid
// Here we return the OTP in the response so the user can see it (demo mode)
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
      : await db.user.findFirst({ where: { phone: identifier.trim() } })

    if (existing) {
      return NextResponse.json({ error: 'This ' + type + ' is already registered' }, { status: 409 })
    }

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expires = Date.now() + 5 * 60 * 1000 // 5 minutes

    otpStore.set(idNorm, { code, expires })

    // In production, send via Twilio (SMS) or SendGrid (email)
    // For now, return the code so the user can see it
    console.log(`[OTP] ${type} ${idNorm}: ${code}`)

    return NextResponse.json({
      ok: true,
      message: `OTP sent to ${idNorm}`,
      // Demo mode: return the code so user can enter it
      demoCode: code,
    })
  } catch (e: any) {
    console.error('send-otp error', e)
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}
