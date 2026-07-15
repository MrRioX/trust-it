'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { UserAvatar } from './user-avatar'
import { useApp, type Friend } from '@/store/app-store'
import { AtSign, Lock, ShieldCheck, MessageSquareLock } from 'lucide-react'

export function ViewProfileDialog({
  open,
  onOpenChange,
  friend,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  friend: Friend | null
}) {
  const { onlineUsers } = useApp()
  if (!friend) return null

  const isOnline = onlineUsers.has(friend.id)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="sr-only">Profile</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center text-center pt-2 pb-4">
          <div className="mb-4">
            <UserAvatar
              name={friend.displayName}
              uid={friend.uid}
              color={friend.avatarColor}
              profileImageMediaId={friend.profileImageMediaId}
              size={96}
              online={isOnline}
            />
          </div>
          <h2 className="text-xl font-bold">
            {friend.displayName || friend.uid}
          </h2>
          <p className="text-sm text-muted-foreground font-mono mt-0.5 flex items-center gap-1">
            <AtSign className="w-3 h-3" />
            {friend.uid}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`text-xs px-2 py-1 rounded-full ${
                isOnline
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {isOnline ? '● Online' : '○ Offline'}
            </span>
          </div>

          {friend.bio && (
            <div className="mt-4 w-full text-left">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Bio
              </p>
              <p className="text-sm leading-relaxed">{friend.bio}</p>
            </div>
          )}

          <div className="mt-5 w-full p-3 rounded-lg bg-muted/50 border border-border text-xs text-muted-foreground space-y-1.5">
            <div className="flex items-start gap-2">
              <Lock className="w-3.5 h-3.5 mt-0.5 text-emerald-600 flex-shrink-0" />
              <p>
                All messages with this user are <strong>end-to-end encrypted</strong>.
                Their public key is stored on the server; their private key never leaves their device.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-3.5 h-3.5 mt-0.5 text-fuchsia-600 flex-shrink-0" />
              <p>
                Profile images are stored as encrypted blobs — only friends can decrypt them.
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            className="mt-4 w-full"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
