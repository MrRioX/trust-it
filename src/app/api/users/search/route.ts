import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// Search users by UID or display name (partial match)
export async function GET(req: NextRequest) {
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const query = url.searchParams.get('uid')?.trim()
  if (!query) return NextResponse.json({ error: 'Search query required' }, { status: 400 })

  // First try exact UID match
  const exactMatch = await db.user.findUnique({
    where: { uid: query },
    select: {
      id: true, uid: true, displayName: true, avatarColor: true, bio: true,
      publicKey: true, profileImageMediaId: true,
    },
  })

  if (exactMatch && exactMatch.id !== me.id) {
    const existing = await db.friendRequest.findFirst({
      where: { OR: [{ fromId: me.id, toId: exactMatch.id }, { fromId: exactMatch.id, toId: me.id }] },
    })
    return NextResponse.json({
      user: exactMatch,
      results: [exactMatch],
      requestStatus: existing?.status ?? null,
    })
  }

  // Partial match on UID or displayName (case-insensitive)
  const results = await db.user.findMany({
    where: {
      AND: [
        { id: { not: me.id } },
        { uid: { not: null } },
        {
          OR: [
            { uid: { contains: query, mode: 'insensitive' } },
            { displayName: { contains: query, mode: 'insensitive' } },
          ],
        },
      ],
    },
    select: {
      id: true, uid: true, displayName: true, avatarColor: true, bio: true,
      publicKey: true, profileImageMediaId: true,
    },
    take: 10,
  })

  if (results.length === 0) {
    return NextResponse.json({ error: 'No users found' }, { status: 404 })
  }

  // Check friend status for all results
  const friendIds = results.map(r => r.id)
  const friendships = await db.friendRequest.findMany({
    where: {
      status: 'accepted',
      OR: [
        { fromId: me.id, toId: { in: friendIds } },
        { fromId: { in: friendIds }, toId: me.id },
      ],
    },
  })
  const friendSet = new Set(friendships.map(f => f.fromId === me.id ? f.toId : f.fromId))

  const resultsWithStatus = results.map(r => ({
    ...r,
    isFriend: friendSet.has(r.id),
  }))

  return NextResponse.json({
    user: results[0],
    results: resultsWithStatus,
    requestStatus: null,
  })
}
