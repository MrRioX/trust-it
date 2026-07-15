'use client'

import { useState } from 'react'
import { useApp, type PublicUser } from '@/store/app-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UserPlus, Search, Check, Loader2, AtSign, ArrowLeft } from 'lucide-react'
import { UserAvatar } from './user-avatar'
import { DownloadAppDialog } from './download-app-dialog'

export function SearchScreen({ onBack }: { onBack?: () => void }) {
  const { searchByUid, sendFriendRequest } = useApp()
  const [uid, setUid] = useState('')
  const [results, setResults] = useState<PublicUser[]>([])
  const [busy, setBusy] = useState(false)
  const [sending, setSending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uid.trim()) return
    setBusy(true)
    setError(null)
    setResults([])
    const r = await searchByUid(uid.trim())
    if ('error' in r) {
      setError(r.error)
    } else if (r.results && r.results.length > 0) {
      setResults(r.results as PublicUser[])
    } else {
      setResults([r.user])
    }
    setBusy(false)
  }

  const handleSend = async (userId: string) => {
    setSending(userId)
    const r = await sendFriendRequest(userId)
    setSending(null)
    if (r.ok) {
      setResults(prev => prev.filter(u => u.id !== userId))
    } else if (r.error) {
      setError(r.error)
    }
  }

  return (
    <div className="min-h-full bg-zinc-950 text-zinc-100">
      <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 text-white p-4 pt-12">
        <div className="flex items-center justify-between mb-3">
          {onBack && (
            <Button size="icon" variant="ghost" className="h-9 w-9 text-white hover:bg-white/10" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <h1 className="text-xl font-bold flex-1">Search</h1>
          <DownloadAppDialog />
        </div>
        <p className="text-white/60 text-sm">Find friends by UID or name</p>
      </div>

      <div className="p-4 space-y-4">
        <form onSubmit={handleSearch} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="search-uid-mobile" className="text-zinc-300">Search</Label>
            <div className="relative">
              <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                id="search-uid-mobile"
                value={uid}
                onChange={(e) => setUid(e.target.value)}
                placeholder="UID or name..."
                className="pl-9 bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                autoFocus
              />
            </div>
          </div>
          <Button type="submit" disabled={busy || !uid.trim()} className="w-full gap-1.5 bg-zinc-700 hover:bg-zinc-600">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search
          </Button>
        </form>

        {error && (
          <div className="text-sm text-rose-400 bg-rose-950/30 rounded-md p-3 border border-rose-900">
            {error}
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-zinc-500 uppercase tracking-wide">{results.length} user(s) found</p>
            {results.map((user) => (
              <div key={user.id} className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800 bg-zinc-900">
                <UserAvatar
                  name={user.displayName}
                  uid={user.uid}
                  color={user.avatarColor}
                  profileImageMediaId={user.profileImageMediaId}
                  size={48}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate text-zinc-100">
                    {user.displayName || user.uid}
                  </p>
                  <p className="text-sm text-zinc-500 font-mono truncate">@{user.uid}</p>
                  {user.bio && <p className="text-xs text-zinc-600 truncate mt-0.5">{user.bio}</p>}
                </div>
                {(user as any).isFriend ? (
                  <span className="text-xs px-2 py-1 rounded-full bg-emerald-950/50 text-emerald-400 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Friends
                  </span>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleSend(user.id)}
                    disabled={sending === user.id}
                    className="gap-1.5 bg-zinc-700 hover:bg-zinc-600"
                  >
                    {sending === user.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                    Add
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="pt-4 border-t border-zinc-800">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">Tips</h3>
          <ul className="space-y-1.5 text-xs text-zinc-500">
            <li>• Search by exact UID or partial name</li>
            <li>• Ask your friend for their UID — they can find it in their Profile tab</li>
            <li>• You can only message someone after they accept your friend request</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
