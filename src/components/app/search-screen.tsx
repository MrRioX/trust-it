'use client'

import { useState, useEffect, useRef } from 'react'
import { useApp, type PublicUser } from '@/store/app-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Check, Loader2, AtSign, ArrowLeft, UserPlus } from 'lucide-react'
import { UserAvatar } from './user-avatar'
import { DownloadAppDialog } from './download-app-dialog'

export function SearchScreen({ onBack }: { onBack?: () => void }) {
  const { sendFriendRequest } = useApp()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PublicUser[]>([])
  const [busy, setBusy] = useState(false)
  const [sending, setSending] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Instagram-style live search — debounce 300ms
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    if (!query.trim()) {
      // Use a microtask to avoid setState in effect body
      Promise.resolve().then(() => {
        setResults([])
        setSearched(false)
      })
      return
    }
    debounceTimer.current = setTimeout(async () => {
      setBusy(true)
      try {
        const res = await fetch(`/api/users/search?uid=${encodeURIComponent(query.trim())}`)
        const text = await res.text()
        let data: any = null
        try { data = text ? JSON.parse(text) : null } catch {}
        if (res.ok && data) {
          const allResults = data.results || (data.user ? [data.user] : [])
          setResults(allResults)
        } else {
          setResults([])
        }
      } catch {
        setResults([])
      }
      setSearched(true)
      setBusy(false)
    }, 300)
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current) }
  }, [query])

  const handleSend = async (userId: string) => {
    setSending(userId)
    const r = await sendFriendRequest(userId)
    setSending(null)
    if (r.ok) {
      setResults(prev => prev.filter(u => u.id !== userId))
    }
  }

  return (
    <div className="min-h-full bg-zinc-950 text-zinc-100">
      <div className="bg-zinc-900 border-b border-zinc-800 p-4 pt-12">
        <div className="flex items-center justify-between mb-3">
          {onBack && (
            <Button size="icon" variant="ghost" className="h-9 w-9 text-zinc-300 hover:text-white hover:bg-zinc-800" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <h1 className="text-xl font-bold flex-1 text-white">Search</h1>
          <DownloadAppDialog />
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or UID..."
            className="pl-9 bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
            autoFocus
          />
          {busy && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-zinc-500" />}
        </div>
      </div>

      <div className="p-2">
        {/* Results */}
        {results.map((user) => (
          <div key={user.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-900 transition-colors">
            <UserAvatar
              name={user.displayName}
              uid={user.uid}
              color={user.avatarColor}
              profileImageMediaId={user.profileImageMediaId}
              size={44}
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate text-zinc-100">
                {user.displayName || user.uid}
              </p>
              <p className="text-sm text-zinc-500 font-mono truncate">@{user.uid}</p>
            </div>
            {(user as any).isFriend ? (
              <span className="text-xs px-2 py-1 rounded-full bg-emerald-950/50 text-emerald-400 flex items-center gap-1">
                <Check className="w-3 h-3" /> Friends
              </span>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleSend(user.id)}
                disabled={sending === user.id}
                className="text-sky-400 hover:text-sky-300 hover:bg-zinc-800 gap-1.5"
              >
                {sending === user.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                Add
              </Button>
            )}
          </div>
        ))}

        {/* No results */}
        {searched && !busy && results.length === 0 && query.trim() && (
          <div className="text-center py-12">
            <p className="text-zinc-500 text-sm">No users found for "{query}"</p>
          </div>
        )}

        {/* Initial state */}
        {!searched && !query.trim() && (
          <div className="text-center py-12">
            <AtSign className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">Search for friends by name or UID</p>
          </div>
        )}
      </div>
    </div>
  )
}
