'use client'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { useApp } from '@/store/app-store'
import { useEffect } from 'react'

export function UserAvatar({
  name,
  uid,
  color,
  profileImageMediaId,
  size = 40,
  online,
  className,
}: {
  name?: string | null
  uid?: string | null
  color: string
  profileImageMediaId?: string | null
  size?: number
  online?: boolean
  className?: string
}) {
  const { getProfileImageUrl, profileImageUrls } = useApp()

  // Derive URL directly from cache (no setState-in-effect needed)
  const imgUrl = profileImageMediaId ? profileImageUrls[profileImageMediaId] ?? null : null

  // Trigger async fetch if not cached (the store will update state, causing re-render)
  useEffect(() => {
    if (profileImageMediaId && !profileImageUrls[profileImageMediaId]) {
      getProfileImageUrl(profileImageMediaId)
    }
  }, [profileImageMediaId, profileImageUrls, getProfileImageUrl])

  const initials =
    (name?.trim() || uid?.trim() || '?').slice(0, 2).toUpperCase()
  return (
    <div className="relative inline-flex" style={{ width: size, height: size }}>
      <Avatar
        className={cn('border-2 border-background', className)}
        style={{
          width: size,
          height: size,
          backgroundColor: color,
        }}
      >
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={name || uid || 'avatar'}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : null}
        <AvatarFallback
          className="font-semibold text-white"
          style={{ backgroundColor: color, fontSize: size * 0.4 }}
        >
          {initials}
        </AvatarFallback>
      </Avatar>
      {online !== undefined && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-2 border-background',
            online ? 'bg-emerald-500' : 'bg-zinc-400'
          )}
          style={{ width: size * 0.3, height: size * 0.3 }}
        />
      )}
    </div>
  )
}
