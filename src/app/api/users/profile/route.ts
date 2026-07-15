import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// Get profile of a user (by id or by self)
export async function GET(req: NextRequest) {
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const userId = url.searchParams.get('userId') ?? me.id

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      uid: true,
      displayName: true,
      avatarColor: true,
      bio: true,
      email: userId === me.id ? true : false,
      phone: userId === me.id ? true : false,
      publicKey: true,
    },
  })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  return NextResponse.json({ user })
}
