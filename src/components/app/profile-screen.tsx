'use client'

import { useApp } from '@/store/app-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { UserAvatar } from './user-avatar'
import { DownloadAppDialog } from './download-app-dialog'
import { useState, useRef, useEffect } from 'react'
import {
  Pencil,
  Camera,
  LogOut,
  MessageSquareLock,
  ShieldCheck,
  AtSign,
  Mail,
  Phone,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4',
  '#0ea5e9', '#3b82f6',
]

export function ProfileScreen() {
  const { user, updateProfile, uploadProfileImage, logout, getProfileImageUrl, profileImageUrls } = useApp()
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [bio, setBio] = useState(user?.bio ?? '')
  const [avatarColor, setAvatarColor] = useState(user?.avatarColor ?? '#6366f1')
  const [saving, setSaving] = useState(false)
  const [uploadingImg, setUploadingImg] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Derive profile image URL directly from store cache
  const profileImgUrl = user?.profileImageMediaId
    ? profileImageUrls[user.profileImageMediaId] ?? null
    : null

  // Trigger async fetch of profile image if not cached
  useEffect(() => {
    if (user?.profileImageMediaId && !profileImageUrls[user.profileImageMediaId]) {
      getProfileImageUrl(user.profileImageMediaId)
    }
  }, [user?.profileImageMediaId, profileImageUrls, getProfileImageUrl])

  if (!user) return null

  const handleSave = async () => {
    setSaving(true)
    await updateProfile({ displayName, avatarColor, bio })
    setSaving(false)
  }

  const handleImageUpload = async (file: File | undefined) => {
    if (!file) return
    setUploadingImg(true)
    const mediaId = await uploadProfileImage(file)
    if (mediaId) {
      // Save mediaId to profile
      await updateProfile({ profileImageMediaId: mediaId })
      // Trigger fetch of new profile image
      getProfileImageUrl(mediaId)
    }
    setUploadingImg(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="min-h-full bg-background">
      {/* Header with profile image */}
      <div className="bg-gradient-to-br from-fuchsia-600 via-rose-500 to-amber-500 text-white p-6 pt-12 safe-top">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">Profile</h1>
          <DownloadAppDialog />
        </div>
        <div className="flex flex-col items-center">
          <div className="relative">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="block rounded-full border-4 border-white/30 hover:border-white/50 transition-colors overflow-hidden"
              style={{ backgroundColor: avatarColor }}
              disabled={uploadingImg}
            >
              {profileImgUrl ? (
                <img
                  src={profileImgUrl}
                  alt="Profile"
                  className="w-24 h-24 object-cover"
                />
              ) : (
                <div
                  className="w-24 h-24 flex items-center justify-center text-3xl font-bold"
                  style={{ backgroundColor: avatarColor }}
                >
                  {(displayName || user.uid || '?').slice(0, 2).toUpperCase()}
                </div>
              )}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white text-fuchsia-600 flex items-center justify-center shadow-lg border-2 border-fuchsia-100"
              disabled={uploadingImg}
              title="Change profile photo"
            >
              {uploadingImg ? (
                <span className="text-xs">…</span>
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleImageUpload(e.target.files?.[0])}
            />
          </div>
          <h2 className="text-xl font-bold mt-3">
            {displayName || user.uid}
          </h2>
          <p className="text-white/80 font-mono text-sm flex items-center gap-1">
            <AtSign className="w-3 h-3" />
            {user.uid}
          </p>
        </div>
      </div>

      {/* Account info */}
      <div className="p-4 space-y-3">
        <div className="rounded-lg bg-muted/40 p-3 space-y-1">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Mail className="w-3 h-3" />
            Email
          </p>
          <p className="text-sm font-medium">{user.email}</p>
        </div>
        <div className="rounded-lg bg-muted/40 p-3 space-y-1">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Phone className="w-3 h-3" />
            Phone
          </p>
          <p className="text-sm font-medium">{user.phone}</p>
        </div>
      </div>

      {/* Edit profile */}
      <div className="p-4 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <Pencil className="w-3.5 h-3.5" />
          Edit profile
        </h3>

        <div className="space-y-2">
          <Label>Display name</Label>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value.slice(0, 50))}
            placeholder="Your name"
          />
        </div>

        <div className="space-y-2">
          <Label>Avatar color</Label>
          <div className="flex flex-wrap gap-2">
            {AVATAR_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setAvatarColor(c)}
                className={cn(
                  'w-8 h-8 rounded-full border-2 transition-transform',
                  avatarColor === c ? 'border-foreground scale-110' : 'border-transparent'
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Used when no profile photo is set.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 200))}
            placeholder="A short bio"
            rows={3}
          />
          <p className="text-xs text-muted-foreground text-right">{bio.length}/200</p>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? 'Saving…' : 'Save profile'}
        </Button>
      </div>

      {/* Encryption status */}
      <div className="p-4 pt-0">
        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 p-3 space-y-1.5">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            Encryption status
          </h4>
          <p className="text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
            <MessageSquareLock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            Your private key is stored only in this browser. Your public key has been shared with the server so friends can encrypt messages to you.
          </p>
        </div>
      </div>

      {/* Sign out */}
      <div className="p-4 pt-0">
        <Button
          variant="outline"
          className="w-full text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
          onClick={() => logout()}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign out
        </Button>
      </div>
    </div>
  )
}
