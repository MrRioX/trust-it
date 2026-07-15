'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

const REACTION_EMOJIS = ['❤️', '😂', '😮', '😢', '🔥', '👍', '👏', '🎉']

export function ReactionPicker({
  onReact,
  onClose,
  currentReaction,
  anchorRef,
}: {
  onReact: (emoji: string) => void
  onClose: () => void
  currentReaction?: string | null
  anchorRef?: React.RefObject<HTMLDivElement>
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ top?: number; left?: number; bottom?: number; right?: number }>({})

  useEffect(() => {
    // Calculate position based on anchor element to keep picker within viewport
    if (anchorRef?.current) {
      const rect = anchorRef.current.getBoundingClientRect()
      const pickerWidth = 320 // approximate width of the picker
      const pickerHeight = 48

      let left = rect.left + rect.width / 2 - pickerWidth / 2
      // Clamp to viewport
      left = Math.max(8, Math.min(left, window.innerWidth - pickerWidth - 8))

      // If there's room above, put it above; otherwise below
      const top = rect.top - pickerHeight - 8
      if (top > 8) {
        setPosition({ top: rect.top - pickerHeight - 8, left })
      } else {
        setPosition({ top: rect.bottom + 8, left })
      }
    }
  }, [anchorRef])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
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
    try { onReact(emoji) } catch (e) { console.error('react callback failed', e) }
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        ref={ref}
        className="fixed z-50 bg-zinc-800 border border-zinc-700 rounded-full px-2 py-1.5 flex items-center gap-0.5 shadow-2xl"
        style={{
          top: position.top !== undefined ? `${position.top}px` : undefined,
          left: position.left !== undefined ? `${position.left}px` : undefined,
          animation: 'reactionPopIn 0.2s ease-out',
        }}
      >
        {REACTION_EMOJIS.map((emoji, index) => (
          <button
            key={emoji}
            onClick={(e) => { e.stopPropagation(); handleEmojiClick(emoji) }}
            onTouchStart={(e) => { e.stopPropagation() }}
            className={cn(
              'w-9 h-9 flex items-center justify-center rounded-full hover:bg-zinc-700 transition-all hover:scale-125 active:scale-95 text-xl',
              currentReaction === emoji && 'bg-zinc-700 scale-110'
            )}
            style={{ animation: `reactionEmojiPop 0.3s ease-out ${index * 0.03}s both` }}
            aria-label={`React with ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
      <style jsx>{`
        @keyframes reactionPopIn {
          from { opacity: 0; transform: scale(0.5) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes reactionEmojiPop {
          from { opacity: 0; transform: scale(0); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  )
}
