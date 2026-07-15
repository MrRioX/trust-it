'use client'

// Cache-bust version: v4-calls-back-nav
import { useRef, useState, useLayoutEffect, useEffect } from 'react'
import { useApp } from '@/store/app-store'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { UserAvatar } from './user-avatar'
import { CustomizeBackgroundDialog } from './customize-background-dialog'
import { MessageBubble } from './message-bubble'
import { ViewProfileDialog } from './view-profile-dialog'
import { ImagePreviewScreen } from './image-preview-screen'
import {
  ArrowLeft,
  Send,
  Image as ImageIcon,
  Palette,
  MoreVertical,
  Loader2,
  Camera,
  Sun,
  Moon,
  X,
  CornerUpLeft,
  Mic,
  Plus,
  Phone,
  Video,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

function formatLastSeen(lastSeen: string | null | undefined, isOnline: boolean): string {
  if (isOnline) return 'Active now'
  if (!lastSeen) return ''
  const date = new Date(lastSeen)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 15) return 'Active now'
  if (diffSec < 60) return `Active ${diffSec}s ago`
  if (diffMin < 60) return `Active ${diffMin}m ago`
  if (diffHour < 24) return `Active ${diffHour}h ago`
  if (diffDay < 7) return `Active ${diffDay}d ago`
  return `Active ${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
}

export function ChatView({ onBack }: { onBack?: () => void }) {
  const {
    user,
    friends,
    activeFriendId,
    messagesByRoom,
    onlineUsers,
    typingUsers,
    sendMessage,
    sendMedia,
    replyTo,
    setReplyTo,
    theme,
    toggleTheme,
    closeChat,
  } = useApp()

  const friend = friends.find((f) => f.id === activeFriendId)
  const roomId = friend?.roomId
  const messages = roomId ? messagesByRoom[roomId] ?? [] : []

  const [text, setText] = useState('')
  const [bgDialogOpen, setBgDialogOpen] = useState(false)
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [, forceUpdate] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastTypingSent = useRef<boolean>(false)

  // Force re-render every 5 seconds to update last seen time
  useEffect(() => {
    const interval = setInterval(() => forceUpdate(n => n + 1), 5000)
    return () => clearInterval(interval)
  }, [])

  // Browser back button support
  useEffect(() => {
    if (!activeFriendId) return
    // Push a state when chat opens
    window.history.pushState({ chat: activeFriendId }, '')
    const handlePopState = (e: PopStateEvent) => {
      closeChat()
    }
    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [activeFriendId, closeChat])

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length, roomId, replyTo])

  useLayoutEffect(() => {
    if (replyTo) inputRef.current?.focus()
  }, [replyTo])

  if (!friend || !roomId) {
    return (
      <div className="flex-1 hidden md:flex items-center justify-center bg-zinc-950">
        <div className="text-center max-w-md p-8">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mb-4">
            <Camera className="w-8 h-8 text-zinc-500" />
          </div>
          <h2 className="text-xl font-semibold mb-2 text-zinc-100">Your messages</h2>
          <p className="text-sm text-zinc-500">Select a chat to start messaging.</p>
        </div>
      </div>
    )
  }

  const isOnline = onlineUsers.has(friend.id)
  const isTyping = typingUsers[friend.id]
  const statusText = isTyping ? 'typing…' : formatLastSeen(friend.lastSeen, isOnline)

  const handleSend = async () => {
    if (!text.trim() || sending) return
    setSending(true)
    const txt = text.trim()
    setText('')
    if (lastTypingSent.current) {
      useApp.getState().socket?.emit('typing', { toUserId: friend.id, isTyping: false })
      lastTypingSent.current = false
    }
    await sendMessage(txt)
    setSending(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleTextChange = (v: string) => {
    setText(v)
    const socket = useApp.getState().socket
    if (!socket) return
    if (v.trim() && !lastTypingSent.current) {
      socket.emit('typing', { toUserId: friend.id, isTyping: true })
      lastTypingSent.current = true
    }
    if (typingTimer.current) clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => {
      if (lastTypingSent.current) {
        socket.emit('typing', { toUserId: friend.id, isTyping: false })
        lastTypingSent.current = false
      }
    }, 2500)
  }

  const handleFilePicked = (file: File | undefined) => {
    if (!file) return
    setPendingFile(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  const handleSendFromPreview = async (hd: boolean) => {
    if (!pendingFile) return
    setUploading(true)
    await sendMedia(pendingFile, hd)
    setUploading(false)
    setPendingFile(null)
  }

  const handleBack = () => {
    // Go back in browser history (which will trigger popstate → closeChat)
    if (window.history.state?.chat) {
      window.history.back()
    } else {
      closeChat()
    }
  }

  const replyToSenderName = (() => {
    if (!replyTo) return null
    if (replyTo.senderId === user?.id) return 'Yourself'
    const f = friends.find((fr) => fr.id === replyTo.senderId)
    return f?.displayName || f?.uid || 'Unknown'
  })()

  const replyToPreview = replyTo
    ? replyTo.type === 'text' ? replyTo.decryptedText || ''
      : replyTo.type === 'image' ? '📷 Photo' : '🎬 Video'
    : ''

  let bgStyle: React.CSSProperties = { backgroundColor: '#0a0a0a' }
  if (friend.background && friend.background.bgType !== 'default') {
    const v = friend.background.bgValue
    if (friend.background.bgType === 'solid') bgStyle = { backgroundColor: v }
    else if (friend.background.bgType === 'gradient') bgStyle = { background: v }
    else if (friend.background.bgType === 'pattern') bgStyle = { backgroundImage: v, backgroundSize: '20px 20px', backgroundColor: '#0a0a0a' }
  }

  return (
    <div className="flex-1 flex flex-col h-full" style={bgStyle}>
      {friend.background?.bgType === 'custom' && friend.background.bgValue && (
        <CustomBackgroundOverlay mediaId={friend.background.bgValue} />
      )}

      {/* Header */}
      <div className="px-3 py-2 border-b border-zinc-800 bg-zinc-900/95 backdrop-blur flex items-center gap-2 safe-top sticky top-0 z-20">
        {onBack && (
          <Button size="icon" variant="ghost" className="md:hidden h-9 w-9 text-zinc-300 hover:text-white hover:bg-zinc-800" onClick={handleBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <button onClick={() => setProfileDialogOpen(true)} className="flex items-center gap-2 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity">
          <UserAvatar name={friend.displayName} uid={friend.uid} color={friend.avatarColor} profileImageMediaId={friend.profileImageMediaId} size={40} online={isOnline} />
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate text-zinc-100">{friend.displayName || friend.uid}</p>
            <p className={cn('text-xs truncate', isTyping ? 'text-emerald-500' : isOnline ? 'text-emerald-500' : 'text-zinc-500')}>
              {statusText}
            </p>
          </div>
        </button>

        {/* Call buttons */}
        <button
          className="h-9 w-9 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 flex items-center justify-center transition-colors"
          title="Voice call"
          onClick={() => alert('Voice calls coming soon!')}
        >
          <Phone className="w-5 h-5" />
        </button>
        <button
          className="h-9 w-9 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 flex items-center justify-center transition-colors"
          title="Video call"
          onClick={() => alert('Video calls coming soon!')}
        >
          <Video className="w-5 h-5" />
        </button>

        <Button size="icon" variant="ghost" className="h-9 w-9 text-zinc-400 hover:text-white hover:bg-zinc-800" onClick={toggleTheme} title="Toggle theme">
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="h-9 w-9 text-zinc-400 hover:text-white hover:bg-zinc-800">
              <MoreVertical className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setBgDialogOpen(true)}>
              <Palette className="w-4 h-4 mr-2" /> Customize background
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setProfileDialogOpen(true)}>
              <ImageIcon className="w-4 h-4 mr-2" /> View profile
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 scrollbar-thin">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-xs">
              <div className="mx-auto w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mb-3">
                <Camera className="w-5 h-5 text-zinc-500" />
              </div>
              <p className="text-sm text-zinc-500">No messages yet. Send a message to <span className="font-medium text-zinc-300">{friend.displayName || friend.uid}</span>.</p>
            </div>
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === user?.id
            return <MessageBubble key={m.id} message={m} mine={mine} />
          })
        )}
        {uploading && (
          <div className="flex justify-center">
            <div className="px-3 py-1.5 rounded-full bg-zinc-800 text-zinc-300 text-xs flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" /> Encrypting and uploading…
            </div>
          </div>
        )}
      </div>

      {/* Reply preview bar */}
      {replyTo && (
        <div className="px-3 py-2 bg-zinc-900 border-t border-zinc-800 flex items-center gap-2 flex-shrink-0">
          <button onClick={() => setReplyTo(null)} className="text-sky-500 flex-shrink-0"><CornerUpLeft className="w-4 h-4" /></button>
          <div className="flex-1 min-w-0 border-l-2 border-sky-500 pl-2">
            <p className="text-[10px] font-medium text-sky-400">Replying to {replyToSenderName}</p>
            <p className="text-xs text-zinc-400 truncate">{replyToPreview}</p>
          </div>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-500 hover:text-white flex-shrink-0" onClick={() => setReplyTo(null)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Input area */}
      <div className="px-4 py-2 bg-[#222222] safe-bottom flex-shrink-0">
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => handleFilePicked(e.target.files?.[0])} />
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFilePicked(e.target.files?.[0])} />
          <button className="flex-shrink-0 w-9 h-9 rounded-full bg-[#2196F3] hover:bg-[#1976D2] text-white flex items-center justify-center transition-colors disabled:opacity-50" disabled={uploading} onClick={() => cameraInputRef.current?.click()} title="Take photo">
            <Camera className="w-4 h-4" />
          </button>
          <Textarea
            ref={inputRef}
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message..."
            rows={1}
            style={{ backgroundColor: '#333333' }}
            className="flex-1 min-h-[40px] max-h-32 resize-none border-transparent text-zinc-100 placeholder:text-zinc-500 rounded-full px-4 py-2.5 text-base focus-visible:ring-0 focus-visible:ring-offset-0"
            disabled={uploading}
          />
          {text.trim() ? (
            <button className="flex-shrink-0 w-10 h-10 rounded-full bg-zinc-600 hover:bg-zinc-500 text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-50" disabled={!text.trim() || sending} onClick={handleSend} title="Send">
              {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          ) : (
            <>
              <button className="flex-shrink-0 w-10 h-10 rounded-full text-white hover:bg-white/10 flex items-center justify-center transition-colors" title="Voice message" onClick={() => alert('Voice messages coming soon!')}>
                <Mic className="w-5 h-5" />
              </button>
              <button className="flex-shrink-0 w-10 h-10 rounded-full text-white hover:bg-white/10 flex items-center justify-center transition-colors disabled:opacity-50" disabled={uploading} onClick={() => fileInputRef.current?.click()} title="Send photo or video">
                <Plus className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>

      <CustomizeBackgroundDialog open={bgDialogOpen} onOpenChange={setBgDialogOpen} friendId={friend.id} />
      <ViewProfileDialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen} friend={friend} />
      {pendingFile && <ImagePreviewScreen file={pendingFile} onCancel={() => setPendingFile(null)} onSend={handleSendFromPreview} />}
    </div>
  )
}

function CustomBackgroundOverlay({ mediaId }: { mediaId: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  useLayoutEffect(() => {
    let revoke: string | null = null
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/media/${mediaId}`)
        if (!res.ok) return
        const blob = await res.blob()
        if (cancelled) return
        revoke = URL.createObjectURL(blob)
        setUrl(revoke)
      } catch {}
    })()
    return () => { cancelled = true; if (revoke) URL.revokeObjectURL(revoke) }
  }, [mediaId])
  if (!url) return null
  return (
    <div className="absolute inset-0 z-0 transition-opacity duration-500" style={{ backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed', opacity: loaded ? 0.25 : 0 }} onLoad={() => setLoaded(true)}>
      <div className="absolute inset-0 bg-black/50" />
    </div>
  )
}
