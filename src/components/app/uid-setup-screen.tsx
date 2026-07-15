'use client'

import { useState, useRef, useEffect } from 'react'
import { useApp } from '@/store/app-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AtSign, ArrowRight, Camera, Loader2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4',
  '#0ea5e9', '#3b82f6',
]

export function UidSetupScreen() {
  const { user, setUid: saveUid, uploadProfileImage, getProfileImageUrl, profileImageUrls, updateProfile } = useApp()
  const [uid, setUid] = useState('')
  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [avatarColor, setAvatarColor] = useState(user?.avatarColor || '#6366f1')
  const [busy, setBusy] = useState(false)
  const [uploadingImg, setUploadingImg] = useState(false)
  const [profileImgUrl, setProfileImgUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user?.profileImageMediaId) {
      const cached = profileImageUrls[user.profileImageMediaId]
      if (cached) setProfileImgUrl(cached)
      else getProfileImageUrl(user.profileImageMediaId)
    }
  }, [user?.profileImageMediaId, profileImageUrls, getProfileImageUrl])

  const handleImageUpload = async (file: File | undefined) => {
    if (!file) return
    setUploadingImg(true)
    const mediaId = await uploadProfileImage(file)
    if (mediaId) {
      await updateProfile({ profileImageMediaId: mediaId })
      getProfileImageUrl(mediaId)
    }
    setUploadingImg(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    // Save display name and avatar color first
    if (displayName !== user?.displayName || avatarColor !== user?.avatarColor) {
      await updateProfile({ displayName, avatarColor })
    }
    // Then set the UID
    await saveUid(uid.trim())
    setBusy(false)
  }

  const suggestions = [
    (user?.email?.split('@')[0] || 'user') + '_',
    (displayName || user?.displayName || 'user').toLowerCase().replace(/\s+/g, '_'),
    'user_' + Math.random().toString(36).slice(2, 7),
  ].filter((s, i, arr) => arr.indexOf(s) === i).slice(0, 3)

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <Card className="w-full max-w-md bg-zinc-900 border-zinc-800">
        <CardHeader className="text-center">
          <CardTitle className="text-white text-2xl">Set Up Your Profile</CardTitle>
          <p className="text-zinc-400 text-sm mt-1">Choose your photo, name, and username</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Profile Photo */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="block rounded-full border-2 border-zinc-700 hover:border-zinc-600 overflow-hidden transition-colors"
                  style={{ backgroundColor: avatarColor }}
                  disabled={uploadingImg}
                >
                  {profileImgUrl ? (
                    <img src={profileImgUrl} alt="Profile" className="w-24 h-24 object-cover" />
                  ) : (
                    <div className="w-24 h-24 flex items-center justify-center text-3xl font-bold text-white" style={{ backgroundColor: avatarColor }}>
                      {(displayName || uid || '?').slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-zinc-700 text-white flex items-center justify-center shadow-lg border-2 border-zinc-900 hover:bg-zinc-600"
                  disabled={uploadingImg}
                >
                  {uploadingImg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e.target.files?.[0])} />
              </div>
            </div>

            {/* Display Name */}
            <div className="space-y-2">
              <Label htmlFor="display-name" className="text-zinc-300">Display Name</Label>
              <Input id="display-name" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value.slice(0, 50))} placeholder="Your name" className="bg-zinc-800 border-zinc-700 text-white" />
            </div>

            {/* Avatar Color (only if no photo) */}
            {!profileImgUrl && (
              <div className="space-y-2">
                <Label className="text-zinc-300">Avatar Color</Label>
                <div className="flex flex-wrap gap-2">
                  {AVATAR_COLORS.map((c) => (
                    <button key={c} type="button" onClick={() => setAvatarColor(c)} className={cn('w-7 h-7 rounded-full border-2 transition-transform', avatarColor === c ? 'border-white scale-110' : 'border-zinc-700')} style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            )}

            {/* UID */}
            <div className="space-y-2">
              <Label htmlFor="uid" className="text-zinc-300">Username (UID)</Label>
              <div className="relative">
                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input id="uid" type="text" value={uid} onChange={(e) => setUid(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20))} placeholder="yourname_2026" className="pl-9 bg-zinc-800 border-zinc-700 text-white font-mono" autoComplete="off" autoFocus required />
              </div>
              <p className="text-xs text-zinc-500">3-20 chars: letters, numbers, underscores</p>
            </div>

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button key={s} type="button" onClick={() => setUid(s)} className="px-3 py-1 text-xs rounded-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300">
                    {s}
                  </button>
                ))}
              </div>
            )}

            <Button type="submit" className="w-full bg-zinc-700 hover:bg-zinc-600 text-white gap-1.5" disabled={busy || uid.length < 3}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue <ArrowRight className="w-4 h-4" /></>}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
