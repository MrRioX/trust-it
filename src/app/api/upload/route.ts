import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, getRoomId } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import crypto from 'crypto'

const UPLOAD_DIR = process.env.NODE_ENV === 'production' ? '/tmp/uploads' : '/home/z/trust-it-data/uploads'

export async function POST(req: NextRequest) {
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const toUserId = formData.get('toUserId') as string | null
  const kind = (formData.get('kind') as string | null) || 'message' // 'message' | 'profile'
  if (!file) {
    return NextResponse.json({ error: 'file required' }, { status: 400 })
  }
  if (kind === 'message' && !toUserId) {
    return NextResponse.json({ error: 'toUserId required for message uploads' }, { status: 400 })
  }

  let roomId = 'profile' // for profile images, no room
  if (kind === 'message' && toUserId) {
    // Verify friendship
    const friendship = await db.friendRequest.findFirst({
      where: {
        status: 'accepted',
        OR: [
          { fromId: me.id, toId: toUserId },
          { fromId: toUserId, toId: me.id },
        ],
      },
    })
    if (!friendship) {
      return NextResponse.json({ error: 'Not friends with this user' }, { status: 403 })
    }
    roomId = getRoomId(me.id, toUserId)
  }

  // Limit file size: 25MB for messages, 8MB for profile images
  const MAX = kind === 'profile' ? 8 * 1024 * 1024 : 25 * 1024 * 1024
  const buffer = Buffer.from(await file.arrayBuffer())
  if (buffer.length > MAX) {
    return NextResponse.json({ error: `File too large (max ${MAX / 1024 / 1024}MB)` }, { status: 413 })
  }

  if (!existsSync(UPLOAD_DIR)) await mkdir(UPLOAD_DIR, { recursive: true })

  const mediaId = crypto.randomBytes(16).toString('hex')
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
  const fileName = `${mediaId}.${ext}`
  const filePath = path.join(UPLOAD_DIR, fileName)
  await writeFile(filePath, buffer)

  const contentType = file.type || 'application/octet-stream'

  // Sidecar metadata for access control + retrieval
  await writeFile(
    `${filePath}.meta.json`,
    JSON.stringify({
      mediaId,
      roomId,
      senderId: me.id,
      kind,
      contentType,
      originalName: file.name,
      size: buffer.length,
      createdAt: new Date().toISOString(),
    })
  )

  return NextResponse.json({
    ok: true,
    mediaId,
    contentType,
    size: buffer.length,
    kind,
  })
}
