import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// Accept or decline a friend request
export async function POST(req: NextRequest) {
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { requestId, action } = body as { requestId?: string; action?: 'accept' | 'decline' }
  if (!requestId || !action) {
    return NextResponse.json({ error: 'requestId and action required' }, { status: 400 })
  }

  const request = await db.friendRequest.findUnique({ where: { id: requestId } })
  if (!request || request.toId !== me.id) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  }
  if (request.status !== 'pending') {
    return NextResponse.json({ error: 'Request already handled' }, { status: 400 })
  }

  if (action === 'accept') {
    await db.friendRequest.update({
      where: { id: requestId },
      data: { status: 'accepted' },
    })
    return NextResponse.json({ ok: true, status: 'accepted' })
  } else {
    await db.friendRequest.update({
      where: { id: requestId },
      data: { status: 'declined' },
    })
    return NextResponse.json({ ok: true, status: 'declined' })
  }
}
