'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  X,
  Send,
  Image as ImageIcon,
  Check,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function ImagePreviewScreen({
  file,
  onCancel,
  onSend,
}: {
  file: File | null
  onCancel: () => void
  onSend: (hd: boolean) => Promise<void>
}) {
  if (!file) return null

  // Use a key-based remount so the inner component creates a fresh URL per file
  return <PreviewInner key={file.name + file.size + file.lastModified} file={file} onCancel={onCancel} onSend={onSend} />
}

function PreviewInner({
  file,
  onCancel,
  onSend,
}: {
  file: File
  onCancel: () => void
  onSend: (hd: boolean) => Promise<void>
}) {
  const [hd, setHd] = useState(false)
  const [sending, setSending] = useState(false)

  // Lazy init — create URL once when component mounts (per file, due to key)
  const [previewUrl] = useState<string>(() => URL.createObjectURL(file))

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const isVideo = file.type.startsWith('video/')

  const handleSend = async () => {
    setSending(true)
    await onSend(hd)
    setSending(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Top bar — back + HD toggle in top-right (like WhatsApp screenshot) */}
      <div className="flex items-center justify-between p-3 safe-top bg-black/50 backdrop-blur">
        <Button
          size="icon"
          variant="ghost"
          className="h-10 w-10 rounded-full text-white hover:bg-white/10"
          onClick={onCancel}
          disabled={sending}
        >
          <X className="w-5 h-5" />
        </Button>

        {/* HD toggle — in the top-right corner, like WhatsApp */}
        {!isVideo && (
          <button
            onClick={() => setHd(!hd)}
            disabled={sending}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
              hd
                ? 'bg-sky-500 text-white'
                : 'bg-white/10 text-white hover:bg-white/20'
            )}
          >
            {hd ? <Check className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            HD
          </button>
        )}
      </div>

      {/* Preview area — centered image/video */}
      <div className="flex-1 flex items-center justify-center p-4 min-h-0 overflow-hidden">
        {isVideo ? (
          <video
            src={previewUrl}
            controls
            className="max-w-full max-h-full rounded-lg"
          />
        ) : (
          <img
            src={previewUrl}
            alt="Preview"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        )}
      </div>

      {/* Caption bar + quality info + Send button */}
      <div className="p-3 bg-black/50 backdrop-blur border-t border-white/10 safe-bottom">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 bg-white/5 rounded-full px-4 py-2.5 text-white/40 text-sm">
            Add a caption…
          </div>
        </div>

        {/* Quality info + Send button */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-white/50">
            <ImageIcon className="w-3.5 h-3.5" />
            <span>
              {isVideo
                ? 'Video'
                : hd
                ? 'HD quality (2048px, less compression)'
                : 'Standard quality (1024px, compressed)'}
            </span>
          </div>
          <Button
            onClick={handleSend}
            disabled={sending}
            className="rounded-full bg-gradient-to-br from-fuchsia-500 to-rose-500 hover:from-fuchsia-600 hover:to-rose-600 text-white gap-1.5"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
