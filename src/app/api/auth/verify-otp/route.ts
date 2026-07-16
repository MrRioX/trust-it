import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { identifier, code } = body as { identifier?: string; code?: string }

    if (!identifier || !code) {
      return NextResponse.json({ error: 'Identifier and code required' }, { status: 400 })
    }

    const idNorm = identifier.trim().toLowerCase()

    // Find the OTP record
    const otpRecord = await db.otp.findFirst({
      where: { phone: idNorm },
      orderBy: { createdAt: 'desc' },
    })

    if (!otpRecord) {
      return NextResponse.json({ error: 'No OTP was sent. Please request a new code.' }, { status: 400 })
    }

    // Check if already verified
    if (otpRecord.verified) {
      return NextResponse.json({ error: 'This code has already been used. Please request a new one.' }, { status: 400 })
    }

    // Check if expired
    if (new Date() > otpRecord.expiresAt) {
      await db.otp.delete({ where: { id: otpRecord.id } })
      return NextResponse.json({ error: 'OTP expired. Please request a new code.' }, { status: 400 })
    }

    // Check if code matches
    if (otpRecord.code !== code.trim()) {
      return NextResponse.json({ error: 'Invalid OTP code.' }, { status: 400 })
    }

    // SUCCESS — invalidate the OTP immediately
    await db.otp.delete({ where: { id: otpRecord.id } })

    return NextResponse.json({ ok: true, message: 'OTP verified successfully' })
  } catch (e: any) {
    console.error('verify-otp error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
