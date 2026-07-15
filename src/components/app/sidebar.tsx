'use client'

import { useState, useRef, useEffect } from 'react'
import { useApp, type Friend } from '@/store/app-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { UserAvatar } from './user-avatar'
import { DownloadAppDialog } from './download-app-dialog'
import {
  Search,
  MessageSquareLock,
  LogOut,
  Settings,
  UserCheck,
  Clock,
  Inbox,
  Pencil,
  Sparkles,
  MonitorSmartphone,
  Gamepad2,
  PawPrint,
  Camera,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4',
  '#0ea5e9', '#3b82f6',
]

export function Sidebar({ className }: { className?: string }) {
  const {
    user,
    friends,
    incomingRequests,
    outgoingRequests,
    onlineUsers,
    activeFriendId,
    openChat,
    logout,
    handleRequest,
    updateProfile,
    setMobileTab,
  } = useApp()
  const [search, setSearch] = useState('')

  const filteredFriends = friends.filter((f) => {
    const q = search.toLowerCase()
    if (!q) return true
    return (
      (f.displayName?.toLowerCase().includes(q) ?? false) ||
      (f.uid?.toLowerCase().includes(q) ?? false)
    )
  })

  return (
    <div className={cn('flex flex-col h-full bg-zinc-950 text-zinc-100', className)}>
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 safe-top">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-fuchsia-500 to-rose-500 flex items-center justify-center">
              <MessageSquareLock className="w-4 h-4 text-white" />
            </div>
            <h1 className="font-bold text-lg">Trust It</h1>
          </div>
          <div className="flex items-center gap-1">
            <DownloadAppDialog />
            <ProfileSheet />
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Search chats…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus-visible:border-zinc-700"
          />
        </div>
      </div>

      {/* Incoming friend requests */}
      {incomingRequests.length > 0 && (
        <div className="border-b">
          <div className="px-4 pt-3 pb-1 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <Inbox className="w-3 h-3" />
              Requests
            </span>
            <Badge variant="secondary" className="text-xs">{incomingRequests.length}</Badge>
          </div>
          <ScrollArea className="max-h-48">
            <div className="px-2 pb-2 space-y-1">
              {incomingRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center gap-2 p-2 rounded-md hover:bg-accent/50"
                >
                  <UserAvatar
                    name={req.from.displayName}
                    uid={req.from.uid}
                    color={req.from.avatarColor}
                    size={36}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {req.from.displayName || req.from.uid}
                    </p>
                    <p className="text-xs text-muted-foreground truncate font-mono">
                      @{req.from.uid}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                      onClick={() => handleRequest(req.id, 'accept')}
                      title="Accept"
                    >
                      <UserCheck className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      onClick={() => handleRequest(req.id, 'decline')}
                      title="Decline"
                    >
                      ✕
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Outgoing requests (compact) */}
      {outgoingRequests.length > 0 && (
        <div className="border-b">
          <div className="px-4 pt-3 pb-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              Sent
            </span>
          </div>
          <div className="px-2 pb-2 space-y-1">
            {outgoingRequests.map((req) => (
              <div
                key={req.id}
                className="flex items-center gap-2 p-2 rounded-md opacity-70"
              >
                <UserAvatar
                  name={req.to.displayName}
                  uid={req.to.uid}
                  color={req.to.avatarColor}
                  size={32}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {req.to.displayName || req.to.uid}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">Pending</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chats list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {filteredFriends.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground">
              {friends.length === 0 ? (
                <>
                  <p className="mb-2">No chats yet.</p>
                  <p className="text-xs">Click <strong>Add</strong> at the top to find a friend by their UID.</p>
                </>
              ) : (
                <p>No chats match your search.</p>
              )}
            </div>
          ) : (
            filteredFriends.map((friend) => (
              <ChatListItem
                key={friend.id}
                friend={friend}
                active={activeFriendId === friend.id}
                online={onlineUsers.has(friend.id)}
                onClick={() => openChat(friend.id)}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Coming-soon features placeholder — compact, desktop only */}
      <div className="hidden md:block">
        <ComingSoonFeatures />
      </div>

      {/* Footer / current user — desktop only (mobile uses bottom tab) */}
      {user && (
        <div className="hidden md:flex p-3 border-t border-zinc-800 items-center gap-2">
          <button
            onClick={() => setMobileTab('profile')}
            className="flex items-center gap-2 flex-1 min-w-0 hover:opacity-80 transition-opacity"
          >
            <UserAvatar
              name={user.displayName}
              uid={user.uid}
              color={user.avatarColor}
              profileImageMediaId={user.profileImageMediaId}
              size={36}
              online
            />
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium truncate">
                {user.displayName || 'You'}
              </p>
              <p className="text-xs text-muted-foreground font-mono truncate">
                @{user.uid}
              </p>
            </div>
          </button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => logout()}
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

function ChatListItem({
  friend,
  active,
  online,
  onClick,
}: {
  friend: Friend
  active: boolean
  online: boolean
  onClick: () => void
}) {
  const lastMsg = friend.lastMessage
  const lastTime = lastMsg
    ? new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : ''
  const preview =
    lastMsg?.type === 'image' ? '📷 Photo'
    : lastMsg?.type === 'video' ? '🎬 Video'
    : lastMsg ? 'Encrypted message'
    : 'Say hi 👋'

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors',
        active ? 'bg-zinc-800' : 'hover:bg-zinc-900'
      )}
    >
      <UserAvatar
        name={friend.displayName}
        uid={friend.uid}
        color={friend.avatarColor}
        profileImageMediaId={friend.profileImageMediaId}
        size={44}
        online={online}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium truncate">
            {friend.displayName || friend.uid}
          </p>
          {lastTime && (
            <span className="text-xs text-muted-foreground flex-shrink-0">{lastTime}</span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
            <MessageSquareLock className="w-3 h-3 opacity-60" />
            {preview}
          </p>
          {online && !active && (
            <span className="text-xs text-emerald-600 font-medium flex-shrink-0">online</span>
          )}
        </div>
      </div>
    </button>
  )
}

function ProfileSheet() {
  const { user, updateProfile, uploadProfileImage, getProfileImageUrl, profileImageUrls } = useApp()
  const [open, setOpen] = useState(false)
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

  const handleSave = async () => {
    setSaving(true)
    await updateProfile({ displayName, avatarColor, bio })
    setSaving(false)
    setOpen(false)
  }

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

  return (
    <Sheet open={open} onOpenChange={(o) => {
      setOpen(o)
      if (o) {
        setDisplayName(user?.displayName ?? '')
        setBio(user?.bio ?? '')
        setAvatarColor(user?.avatarColor ?? '#6366f1')
      }
    }}>
      <SheetTrigger asChild>
        <Button size="icon" variant="ghost" className="h-8 w-8">
          <Settings className="w-4 h-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Your profile</SheetTitle>
          <SheetDescription>
            Update your photo, display name, avatar color, and bio.
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-6 space-y-5">
          <div className="flex items-center gap-4 pt-4">
            <div className="relative">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="block rounded-full overflow-hidden border-2 border-border hover:opacity-80 transition-opacity"
                disabled={uploadingImg}
              >
                {profileImgUrl ? (
                  <img src={profileImgUrl} alt="Profile" className="w-16 h-16 object-cover" />
                ) : (
                  <div
                    className="w-16 h-16 flex items-center justify-center text-xl font-bold text-white"
                    style={{ backgroundColor: avatarColor }}
                  >
                    {(displayName || user?.uid || '?').slice(0, 2).toUpperCase()}
                  </div>
                )}
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-foreground text-background flex items-center justify-center shadow-lg border-2 border-background"
                disabled={uploadingImg}
                title="Change photo"
              >
                {uploadingImg ? <span className="text-[8px]">…</span> : <Camera className="w-3 h-3" />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImageUpload(e.target.files?.[0])}
              />
            </div>
            <div>
              <p className="font-mono text-sm text-muted-foreground">@{user?.uid}</p>
              <p className="text-xs text-muted-foreground mt-1">{user?.email}</p>
              <p className="text-xs text-muted-foreground">{user?.phone}</p>
            </div>
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
            <p className="text-xs text-muted-foreground">Used when no profile photo is set.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="display-name">Display name</Label>
            <div className="relative">
              <Pencil className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value.slice(0, 50))}
                placeholder="Your name"
                className="pl-9"
              />
            </div>
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

          <div className="pt-4 border-t space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Encryption status
            </h4>
            <div className="text-xs text-muted-foreground flex items-start gap-2">
              <MessageSquareLock className="w-4 h-4 mt-0.5 text-emerald-600 flex-shrink-0" />
              <p>
                Your private key is stored locally in this browser. Your public key has been
                shared with the server so friends can encrypt messages to you.
              </p>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function ComingSoonFeatures() {
  const features = [
    {
      icon: MonitorSmartphone,
      name: 'Remote Device Access',
      desc: 'Bonded friends can request full device access — screen share, battery, status.',
      color: 'text-sky-600',
    },
    {
      icon: Gamepad2,
      name: 'Duo Games',
      desc: 'Play in-built 2-player games with bonded friends in real time.',
      color: 'text-fuchsia-600',
    },
    {
      icon: PawPrint,
      name: 'Shared Pet',
      desc: 'Bonded friends raise a virtual pet together — it grows as you care for it.',
      color: 'text-amber-600',
    },
  ]
  return (
    <div className="px-4 py-3 border-t bg-muted/30">
      <div className="flex items-center gap-1.5 mb-2">
        <Sparkles className="w-3 h-3 text-fuchsia-600" />
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Coming soon
        </span>
      </div>
      <div className="space-y-1.5">
        {features.map((f) => (
          <div
            key={f.name}
            className="flex items-start gap-2 p-1.5 rounded-md opacity-70"
            title={`${f.name} — ${f.desc}`}
          >
            <f.icon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${f.color}`} />
            <div className="min-w-0">
              <p className="text-xs font-medium leading-tight">{f.name}</p>
              <p className="text-[10px] text-muted-foreground leading-snug line-clamp-2">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
