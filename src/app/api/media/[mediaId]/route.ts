import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const UPLOAD_DIR = '/home/z/trust-it-data/uploads'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ mediaId: string }> }) {
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { mediaId } = await ctx.params
  if (!/^[\w-]+$/.test(mediaId)) {
    return NextResponse.json({ error: 'Invalid mediaId' }, { status: 400 })
  }

  const fs = await import('fs/promises')
  let entries: string[] = []
  try {
    entries = await fs.readdir(UPLOAD_DIR)
  } catch {
    return NextResponse.json({ error: 'Media not found' }, { status: 404 })
  }

  // Find the meta file first
  const metaFile = entries.find((e) => e.startsWith(`${mediaId}.`) && e.endsWith('.meta.json'))
  if (!metaFile) {
    return NextResponse.json({ error: 'Media metadata not found' }, { status: 404 })
  }
  const metaPath = path.join(UPLOAD_DIR, metaFile)
  const metaRaw = await readFile(metaPath, 'utf8')
  const meta = JSON.parse(metaRaw) as {
    mediaId: string
    roomId: string
    senderId: string
    kind: string
    contentType: string
    originalName: string
    size: number
    createdAt: string
  }

  // Access control:
  // - profile images: any authenticated user can fetch (used to display profile pictures)
  // - background images: any authenticated user can fetch (they're per-user, but stored as plain images)
  // - message media: only room participants (or the sender) can fetch
  if (meta.kind !== 'profile' && meta.kind !== 'background') {
    const participants = meta.roomId.split('__')
    if (!participants.includes(me.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  // Find the actual data file (without the .meta.json suffix)
  const dataFileName = metaFile.replace(/\.meta\.json$/, '')
  const dataPath = path.join(UPLOAD_DIR, dataFileName)
  if (!existsSync(dataPath)) {
    return NextResponse.json({ error: 'Media data not found' }, { status: 404 })
  }

  const data = await readFile(dataPath)
  return new NextResponse(data, {
    headers: {
      'Content-Type': meta.contentType || 'application/octet-stream',
      'Content-Length': String(data.length),
      'Cache-Control': 'private, max-age=3600',
      'Content-Disposition': `inline; filename="${meta.originalName}"`,
    },
  })
}
