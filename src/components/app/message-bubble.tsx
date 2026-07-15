'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  Check,
  CheckCheck,
  AlertTriangle,
  Loader2,
  Eye,
  Reply,
  Heart,
} from 'lucide-react'
import { useApp, type DecryptedMessage } from '@/store/app-store'
import { ReactionPicker } from './reaction-picker'
import { UserAvatar } from './user-avatar'

const QUICK_REACTIONS = ['❤️', '😂', '😮', '🔥', '👍']

export function MessageBubble({
  message,
  mine,
}: {
  message: DecryptedMessage
  mine: boolean
}) {
  const { setReplyTo, user, friends, reactToMessage } = useApp()
  const sendTime = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
  const seenTime = message.seenAt
    ? new Date(message.seenAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  const sender = mine ? user : friends.find((f) => f.id === message.senderId)
  const senderName = mine ? 'You' : sender?.displayName || sender?.uid || 'Unknown'

  const [dragX, setDragX] = useState(0)
  const [showSeen, setShowSeen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [showReactionPicker, setShowReactionPicker] = useState(false)
  const [showQuickReactions, setShowQuickReactions] = useState(false)
  const startX = useRef<number | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressTriggered = useRef(false)
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null)
  const bubbleRef = useRef<HTMLDivElement>(null)

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  const onPointerDown = useCallback((clientX: number, clientY: number) => {
    startX.current = clientX
    pointerDownPos.current = { x: clientX, y: clientY }
    setIsDragging(true)
    longPressTriggered.current = false
    clearLongPressTimer()
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true
      setShowReactionPicker(true)
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(30)
    }, 500)
  }, [clearLongPressTimer])

  const onPointerMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging || startX.current === null || !pointerDownPos.current) return
    const dx = clientX - startX.current
    const dy = clientY - pointerDownPos.current.y
    if ((Math.abs(dx) > 10 || Math.abs(dy) > 10) && longPressTimer.current) {
      clearLongPressTimer()
    }
    const min = mine ? -120 : 0
    const max = 80
    const clamped = Math.max(min, Math.min(max, dx))
    setDragX(clamped)
  }, [isDragging, startX, mine, clearLongPressTimer])

  const onPointerUp = useCallback(() => {
    if (!isDragging) return
    setIsDragging(false)
    clearLongPressTimer()
    if (longPressTriggered.current) {
      setDragX(0)
      return
    }
    if (dragX < -60 && mine) {
      setShowSeen(true)
      setTimeout(() => setShowSeen(false), 3500)
    } else if (dragX > 50) {
      setReplyTo(message)
    }
    setDragX(0)
  }, [isDragging, dragX, mine, setReplyTo, message, clearLongPressTimer])

  const onTouchStart = (e: React.TouchEvent) => onPointerDown(e.touches[0].clientX, e.touches[0].clientY)
  const onTouchMove = (e: React.TouchEvent) => onPointerMove(e.touches[0].clientX, e.touches[0].clientY)
  const onTouchEnd = onPointerUp
  const onMouseDown = (e: React.MouseEvent) => onPointerDown(e.clientX, e.clientY)
  const onMouseMove = (e: React.MouseEvent) => onPointerMove(e.clientX, e.clientY)
  const onMouseUp = onPointerUp
  const onMouseLeave = () => { if (isDragging) onPointerUp() }

  const replyToSenderName = (() => {
    if (!message.replyToSender) return null
    if (message.replyToSender === user?.id) return 'You'
    const f = friends.find((fr) => fr.id === message.replyToSender)
    return f?.displayName || f?.uid || 'Unknown'
  })()

  const reactionByName = (() => {
    if (!message.reactionBy) return null
    if (message.reactionBy === user?.id) return 'You'
    const f = friends.find((fr) => fr.id === message.reactionBy)
    return f?.displayName || f?.uid || 'Someone'
  })()

  const handleReact = useCallback((emoji: string) => {
    try { reactToMessage(message.id, emoji) } catch (e) { console.error('reaction failed', e) }
  }, [reactToMessage, message.id])

  const handleCloseReactionPicker = useCallback(() => setShowReactionPicker(false), [])

  const isMedia = message.type === 'image' || message.type === 'video'

  return (
    <div className={cn('flex items-end gap-2', mine ? 'flex-row-reverse' : 'flex-row')}>
      {!mine && (
        <div className="flex-shrink-0 mb-4">
          <UserAvatar
            name={sender?.displayName}
            uid={sender?.uid}
            color={sender?.avatarColor || '#6366f1'}
            profileImageMediaId={sender?.profileImageMediaId}
            size={28}
          />
        </div>
      )}

      <div
        ref={bubbleRef}
        className="relative max-w-[70%] sm:max-w-[60%] touch-pan-y select-none"
        style={{
          transform: `translateX(${dragX}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out',
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
      >
        {/* Left-swipe reveals Seen indicator */}
        {mine && (showSeen || dragX < -30) && (
          <div
            className="absolute right-full top-1/2 -translate-y-1/2 mr-2 px-2 py-1 rounded-md bg-zinc-700 border border-zinc-600 text-xs whitespace-nowrap flex items-center gap-1 shadow-sm"
            style={{ opacity: Math.min(1, Math.abs(dragX) / 60) }}
          >
            {seenTime ? (
              <>
                <Eye className="w-3 h-3 text-sky-400" />
                <span className="text-sky-400 font-medium">Seen {seenTime}</span>
              </>
            ) : (
              <>
                <Check className="w-3 h-3 text-zinc-400" />
                <span className="text-zinc-400">Delivered</span>
              </>
            )}
          </div>
        )}

        {/* Right-swipe reveals Reply icon */}
        {dragX > 20 && (
          <div
            className="absolute left-full top-1/2 -translate-y-1/2 ml-2 w-9 h-9 rounded-full bg-zinc-700 text-white flex items-center justify-center shadow-md"
            style={{ opacity: Math.min(1, dragX / 60) }}
          >
            <Reply className="w-4 h-4" />
          </div>
        )}

        {/* Reaction picker popup — positioned to stay within viewport */}
        {showReactionPicker && (
          <ReactionPicker
            onReact={handleReact}
            onClose={handleCloseReactionPicker}
            currentReaction={message.reaction}
            anchorRef={bubbleRef}
          />
        )}

        <div
          className={cn(
            'rounded-2xl px-3 py-2 shadow-sm relative',
            mine
              ? 'bg-zinc-700 text-zinc-50 rounded-br-md'
              : 'bg-zinc-800 text-zinc-50 rounded-bl-md',
            message.pending && 'opacity-60',
            message.error && 'ring-2 ring-rose-500'
          )}
        >
          {!mine && (
            <p className="text-[11px] font-semibold text-sky-400 mb-0.5">{senderName}</p>
          )}

          {message.replyToId && message.replyToSnippet && (
            <div className={cn(
              'mb-1.5 px-2 py-1 rounded-md text-xs border-l-2',
              mine ? 'bg-black/30 border-zinc-400' : 'bg-black/30 border-sky-500'
            )}>
              <p className={cn('font-medium text-[10px] mb-0.5', mine ? 'text-zinc-300' : 'text-sky-400')}>
                {replyToSenderName ? `Replying to ${replyToSenderName}` : 'Reply'}
              </p>
              <p className="truncate text-zinc-400">{message.replyToSnippet}</p>
            </div>
          )}

          {message.type === 'text' && (
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
              {message.decryptedText ?? (message.error ? 'Failed to decrypt' : 'Decrypting…')}
            </p>
          )}

          {message.type === 'image' && (
            <>
              {message.decryptedMediaUrl ? (
                <a href={message.decryptedMediaUrl} target="_blank" rel="noreferrer" className="block">
                  <img src={message.decryptedMediaUrl} alt="Image" className="rounded-xl max-w-full max-h-80 object-cover" />
                </a>
              ) : (
                <div className="w-48 h-48 flex items-center justify-center bg-black/30 rounded-xl">
                  {message.error ? <AlertTriangle className="w-6 h-6 text-rose-500" /> : <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />}
                </div>
              )}
            </>
          )}

          {message.type === 'video' && (
            <>
              {message.decryptedMediaUrl ? (
                <video src={message.decryptedMediaUrl} controls className="rounded-xl max-w-full max-h-80" />
              ) : (
                <div className="w-48 h-32 flex items-center justify-center bg-black/30 rounded-xl">
                  {message.error ? <AlertTriangle className="w-6 h-6 text-rose-500" /> : <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />}
                </div>
              )}
            </>
          )}

          {/* Time row */}
          <div className={cn('flex items-center gap-1.5 mt-0.5 text-[10px]', mine ? 'text-zinc-400 justify-end' : 'text-zinc-500')}>
            <span>{sendTime}</span>
            {mine && !message.error && (
              <>
                {message.pending ? (
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                ) : message.seenAt ? (
                  <>
                    <span className="opacity-60">·</span>
                    <span className="text-sky-400">Seen {seenTime}</span>
                    <CheckCheck className="w-3 h-3 text-sky-400" />
                  </>
                ) : (
                  <Check className="w-3 h-3" title="Delivered" />
                )}
              </>
            )}
            {message.error && <AlertTriangle className="w-2.5 h-2.5" />}
          </div>
        </div>

        {/* Quick reaction bar under media (Instagram-style) */}
        {isMedia && message.decryptedMediaUrl && (
          <div className={cn('flex items-center gap-1 mt-1', mine ? 'justify-end' : 'justify-start')}>
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={(e) => { e.stopPropagation(); handleReact(emoji) }}
                className={cn(
                  'w-7 h-7 flex items-center justify-center rounded-full hover:bg-zinc-700 transition-all hover:scale-125 active:scale-95 text-sm',
                  message.reaction === emoji && 'bg-zinc-700 scale-110'
                )}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Reaction badge */}
        {message.reaction && (
          <div
            className={cn(
              'absolute -bottom-2 px-1.5 py-0.5 rounded-full bg-zinc-700 border-2 border-zinc-900 text-sm shadow-md',
              mine ? 'left-2' : 'right-2'
            )}
            title={`${reactionByName} reacted ${message.reaction}`}
          >
            {message.reaction}
          </div>
        )}
      </div>
    </div>
  )
}
