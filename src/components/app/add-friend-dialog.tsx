'use client'

import { useState } from 'react'
import { useApp } from '@/store/app-store'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UserPlus, Search, Check, Loader2, AtSign } from 'lucide-react'
import { UserAvatar } from './user-avatar'

export function AddFriendDialog() {
  const { searchByUid, sendFriendRequest } = useApp()
  const [open, setOpen] = useState(false)
  const [uid, setUid] = useState('')
  const [result, setResult] = useState<
    | null
    | { kind: 'user'; user: any; status: string | null }
    | { kind: 'error'; message: string }
  >(null)
  const [busy, setBusy] = useState(false)
  const [sending, setSending] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uid.trim()) return
    setBusy(true)
    setResult(null)
    const r = await searchByUid(uid.trim())
    if ('error' in r) {
      setResult({ kind: 'error', message: r.error })
    } else {
      setResult({ kind: 'user', user: r.user, status: r.requestStatus })
    }
    setBusy(false)
  }

  const handleSend = async () => {
    if (result?.kind !== 'user') return
    setSending(true)
    const r = await sendFriendRequest(result.user.id)
    setSending(false)
    if (r.ok) {
      // Reset and close
      setUid('')
      setResult(null)
      setOpen(false)
    } else if (r.error) {
      setResult({ kind: 'error', message: r.error })
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => {
      setOpen(o)
      if (!o) {
        setUid('')
        setResult(null)
      }
    }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <UserPlus className="w-4 h-4" />
          Add
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add a friend</DialogTitle>
          <DialogDescription>
            Search by their UID. UIDs are case-sensitive.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSearch} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="search-uid">Friend&apos;s UID</Label>
            <div className="relative">
              <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="search-uid"
                value={uid}
                onChange={(e) => setUid(e.target.value)}
                placeholder="e.g. bob_2026"
                className="pl-9 font-mono"
                autoFocus
              />
            </div>
          </div>
          <Button type="submit" disabled={busy || !uid.trim()} className="w-full gap-1.5">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search
          </Button>
        </form>

        {result?.kind === 'error' && (
          <div className="text-sm text-rose-600 bg-rose-50 dark:bg-rose-950/30 dark:text-rose-400 rounded-md p-3 border border-rose-200 dark:border-rose-900">
            {result.message}
          </div>
        )}

        {result?.kind === 'user' && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/40">
              <UserAvatar
                name={result.user.displayName}
                uid={result.user.uid}
                color={result.user.avatarColor}
                size={48}
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">
                  {result.user.displayName || result.user.uid}
                </p>
                <p className="text-sm text-muted-foreground font-mono truncate">
                  @{result.user.uid}
                </p>
              </div>
              {result.status === 'accepted' && (
                <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Friends
                </span>
              )}
              {result.status === 'pending' && (
                <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                  Pending
                </span>
              )}
            </div>
            {!result.status && (
              <Button
                onClick={handleSend}
                disabled={sending}
                className="w-full gap-1.5"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Send friend request
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
