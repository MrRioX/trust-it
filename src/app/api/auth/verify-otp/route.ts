import { NextRequest, NextResponse } from 'next/server'

// Verify OTP
const otpStore = new Map<string, { code: string; expires: number }>()

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { identifier, code } = body as { identifier?: string; code?: string }

    if (!identifier || !code) {
      return NextResponse.json({ error: 'Identifier and code required' }, { status: 400 })
    }

    const idNorm = identifier.trim().toLowerCase()
    const stored = otpStore.get(idNorm)

    if (!stored) {
      return NextResponse.json({ error: 'No OTP was sent. Please request a new code.' }, { status: 400 })
    }

    if (Date.now() > stored.expires) {
      otpStore.delete(idNorm)
      return NextResponse.json({ error: 'OTP expired. Please request a new code.' }, { status: 400 })
    }

    if (stored.code !== code.trim()) {
      return NextResponse.json({ error: 'Invalid OTP code' }, { status: 400 })
    }

    // Valid — remove the OTP
    otpStore.delete(idNorm)

    return NextResponse.json({ ok: true, message: 'OTP verified' })
  } catch (e: any) {
    console.error('verify-otp error', e)
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}

// Export the store so send-otp route can share it (in same serverless instance)
export { otpStore }
