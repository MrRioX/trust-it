'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

// Instagram-style reaction emojis — same set as Instagram reels/stories
const REACTION_EMOJIS = ['❤️', '😂', '😮', '😢', '🔥', '👍', '👏', '🎉']

export function ReactionPicker({
  onReact,
  onClose,
  currentReaction,
}: {
  onReact: (emoji: string) => void
  onClose: () => void
  currentReaction?: string | null
}) {
  const ref = useRef<HTMLDivElement>(null)

  // Close on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    // Delay adding the listener so the same touch that opened it doesn't close it
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }, 150)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  const handleEmojiClick = (emoji: string) => {
    try {
      onReact(emoji)
    } catch (e) {
      console.error('react callback failed', e)
    }
    onClose()
  }

  return (
    <>
      {/* Semi-transparent backdrop (doesn't block touch, just visual) */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      {/* Reaction panel — Instagram-style horizontal bar */}
      <div
        ref={ref}
        className="absolute -top-14 left-1/2 -translate-x-1/2 z-50 bg-zinc-800 border border-zinc-700 rounded-full px-2 py-1.5 flex items-center gap-0.5 shadow-2xl"
        style={{
          animation: 'reactionPopIn 0.2s ease-out',
        }}
      >
        {REACTION_EMOJIS.map((emoji, index) => (
          <button
            key={emoji}
            onClick={(e) => {
              e.stopPropagation()
              handleEmojiClick(emoji)
            }}
            onTouchStart={(e) => {
              e.stopPropagation()
            }}
            className={cn(
              'w-9 h-9 flex items-center justify-center rounded-full hover:bg-zinc-700 transition-all text-xl',
              'hover:scale-125 active:scale-95',
              currentReaction === emoji && 'bg-zinc-700 scale-110'
            )}
            style={{
              animation: `reactionEmojiPop 0.3s ease-out ${index * 0.03}s both`,
            }}
            aria-label={`React with ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
      <style jsx>{`
        @keyframes reactionPopIn {
          from {
            opacity: 0;
            transform: translateX(-50%) scale(0.5) translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) scale(1) translateY(0);
          }
        }
        @keyframes reactionEmojiPop {
          from {
            opacity: 0;
            transform: scale(0);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </>
  )
}
