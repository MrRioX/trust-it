'use client'

import { useState } from 'react'
import { useApp } from '@/store/app-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UserPlus, Search, Check, Loader2, AtSign, ArrowLeft } from 'lucide-react'
import { UserAvatar } from './user-avatar'
import { DownloadAppDialog } from './download-app-dialog'

export function SearchScreen({ onBack }: { onBack?: () => void }) {
  const { searchByUid, sendFriendRequest } = useApp()
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
      setUid('')
      setResult(null)
    } else if (r.error) {
      setResult({ kind: 'error', message: r.error })
    }
  }

  return (
    <div className="min-h-full bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="bg-gradient-to-br from-fuchsia-600 to-rose-600 text-white p-4 pt-12 safe-top">
        <div className="flex items-center justify-between mb-3">
          {onBack && (
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9 text-white hover:bg-white/10"
              onClick={onBack}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <h1 className="text-xl font-bold flex-1">Search</h1>
          <DownloadAppDialog />
        </div>
        <p className="text-white/80 text-sm">
          Find friends by their UID to start chatting
        </p>
      </div>

      {/* Search form */}
      <div className="p-4 space-y-4">
        <form onSubmit={handleSearch} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="search-uid-mobile" className="text-zinc-300">Friend&apos;s UID</Label>
            <div className="relative">
              <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                id="search-uid-mobile"
                value={uid}
                onChange={(e) => setUid(e.target.value)}
                placeholder="e.g. bob_2026"
                className="pl-9 font-mono bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                autoFocus
              />
            </div>
          </div>
          <Button type="submit" disabled={busy || !uid.trim()} className="w-full gap-1.5 bg-gradient-to-br from-fuchsia-500 to-rose-500 hover:from-fuchsia-600 hover:to-rose-600">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search
          </Button>
        </form>

        {result?.kind === 'error' && (
          <div className="text-sm text-rose-400 bg-rose-950/30 rounded-md p-3 border border-rose-900">
            {result.message}
          </div>
        )}

        {result?.kind === 'user' && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800 bg-zinc-900">
              <UserAvatar
                name={result.user.displayName}
                uid={result.user.uid}
                color={result.user.avatarColor}
                profileImageMediaId={result.user.profileImageMediaId}
                size={56}
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate text-zinc-100">
                  {result.user.displayName || result.user.uid}
                </p>
                <p className="text-sm text-zinc-500 font-mono truncate">
                  @{result.user.uid}
                </p>
                {result.user.bio && (
                  <p className="text-xs text-zinc-600 truncate mt-0.5">{result.user.bio}</p>
                )}
              </div>
              {result.status === 'accepted' && (
                <span className="text-xs px-2 py-1 rounded-full bg-emerald-950/50 text-emerald-400 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Friends
                </span>
              )}
              {result.status === 'pending' && (
                <span className="text-xs px-2 py-1 rounded-full bg-amber-950/50 text-amber-400">
                  Pending
                </span>
              )}
            </div>
            {!result.status && (
              <Button
                onClick={handleSend}
                disabled={sending}
                className="w-full gap-1.5 bg-gradient-to-br from-fuchsia-500 to-rose-500 hover:from-fuchsia-600 hover:to-rose-600"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Send friend request
              </Button>
            )}
          </div>
        )}

        {/* Tips */}
        <div className="pt-4 border-t border-zinc-800">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">Tips</h3>
          <ul className="space-y-1.5 text-xs text-zinc-500">
            <li>• UIDs are case-sensitive</li>
            <li>• Ask your friend for their UID — they can find it in their Profile tab</li>
            <li>• You can only message someone after they accept your friend request</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
