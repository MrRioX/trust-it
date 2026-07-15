import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, getRoomId } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import crypto from 'crypto'

const UPLOAD_DIR = '/home/z/trust-it-data/uploads'

export async function POST(req: NextRequest) {
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const friendId = formData.get('friendId') as string | null
  if (!file || !friendId) {
    return NextResponse.json({ error: 'file and friendId required' }, { status: 400 })
  }

  const MAX = 5 * 1024 * 1024 // 5MB for backgrounds
  const buffer = Buffer.from(await file.arrayBuffer())
  if (buffer.length > MAX) {
    return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 413 })
  }

  if (!existsSync(UPLOAD_DIR)) await mkdir(UPLOAD_DIR, { recursive: true })

  const mediaId = crypto.randomBytes(16).toString('hex')
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
  const fileName = `${mediaId}.${ext}`
  const filePath = path.join(UPLOAD_DIR, fileName)
  await writeFile(filePath, buffer)

  const contentType = file.type || 'application/octet-stream'
  const roomId = getRoomId(me.id, friendId)

  await writeFile(
    `${filePath}.meta.json`,
    JSON.stringify({
      mediaId,
      roomId: 'background',
      senderId: me.id,
      kind: 'background',
      contentType,
      originalName: file.name,
      size: buffer.length,
      createdAt: new Date().toISOString(),
    })
  )

  // Save background as custom type with the mediaId as the value
  await db.chatBackground.upsert({
    where: { userId_roomId: { userId: me.id, roomId } },
    update: { bgType: 'custom', bgValue: mediaId },
    create: { userId: me.id, roomId, bgType: 'custom', bgValue: mediaId },
  })

  return NextResponse.json({
    ok: true,
    background: { bgType: 'custom', bgValue: mediaId },
  })
}
