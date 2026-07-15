'use client'

import { useState, useRef } from 'react'
import { useApp } from '@/store/app-store'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Palette, Check, ImagePlus, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Preset = {
  id: string
  label: string
  bgType: 'default' | 'gradient' | 'solid' | 'pattern' | 'custom'
  bgValue: string
  preview: string // CSS for preview
}

const PRESETS: Preset[] = [
  {
    id: 'default',
    label: 'Default',
    bgType: 'default',
    bgValue: '',
    preview: 'bg-zinc-950',
  },
  {
    id: 'sunset',
    label: 'Sunset',
    bgType: 'gradient',
    bgValue: 'linear-gradient(135deg, #fde68a 0%, #fca5a5 50%, #f9a8d4 100%)',
    preview: '',
  },
  {
    id: 'ocean',
    label: 'Ocean',
    bgType: 'gradient',
    bgValue: 'linear-gradient(135deg, #bae6fd 0%, #a5f3fc 50%, #99f6e4 100%)',
    preview: '',
  },
  {
    id: 'forest',
    label: 'Forest',
    bgType: 'gradient',
    bgValue: 'linear-gradient(135deg, #d9f99d 0%, #86efac 50%, #6ee7b7 100%)',
    preview: '',
  },
  {
    id: 'lavender',
    label: 'Lavender',
    bgType: 'gradient',
    bgValue: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 50%, #f5d0fe 100%)',
    preview: '',
  },
  {
    id: 'rose',
    label: 'Rose',
    bgType: 'gradient',
    bgValue: 'linear-gradient(135deg, #ffe4e6 0%, #fecdd3 50%, #fbcfe8 100%)',
    preview: '',
  },
  {
    id: 'mint',
    label: 'Mint',
    bgType: 'solid',
    bgValue: '#d1fae5',
    preview: '',
  },
  {
    id: 'cream',
    label: 'Cream',
    bgType: 'solid',
    bgValue: '#fef3c7',
    preview: '',
  },
  {
    id: 'sky',
    label: 'Sky',
    bgType: 'solid',
    bgValue: '#dbeafe',
    preview: '',
  },
  {
    id: 'dots',
    label: 'Dots',
    bgType: 'pattern',
    bgValue: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
    preview: '',
  },
  {
    id: 'grid',
    label: 'Grid',
    bgType: 'pattern',
    bgValue: 'linear-gradient(#cbd5e1 1px, transparent 1px), linear-gradient(90deg, #cbd5e1 1px, transparent 1px)',
    preview: '',
  },
]

export function CustomizeBackgroundDialog({
  open,
  onOpenChange,
  friendId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  friendId: string | null
}) {
  const { friends, setBackground, setCustomBackground } = useApp()
  const friend = friends.find((f) => f.id === friendId)
  const current = friend?.background
  const [selected, setSelected] = useState<Preset | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploadingCustom, setUploadingCustom] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const activePreset: Preset = selected ?? (() => {
    if (!current || current.bgType === 'default') return PRESETS[0]
    return (
      PRESETS.find(
        (p) => p.bgType === current.bgType && p.bgValue === current.bgValue
      ) ?? {
        id: 'custom',
        label: 'Custom',
        bgType: current.bgType as any,
        bgValue: current.bgValue,
        preview: '',
      }
    )
  })()

  const handleSave = async () => {
    if (!friendId || !activePreset) return
    setSaving(true)
    await setBackground(friendId, activePreset.bgType, activePreset.bgValue)
    setSaving(false)
    setSelected(null)
    onOpenChange(false)
  }

  const handleGalleryUpload = async (file: File | undefined) => {
    if (!file || !friendId) return
    setUploadingCustom(true)
    await setCustomBackground(friendId, file)
    setUploadingCustom(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => {
      if (!o) setSelected(null)
      onOpenChange(o)
    }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Chat background
          </DialogTitle>
          <DialogDescription>
            Pick a preset or upload your own photo.
          </DialogDescription>
        </DialogHeader>

        {/* Gallery upload button */}
        <div className="mb-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleGalleryUpload(e.target.files?.[0])}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingCustom}
            className={cn(
              'w-full flex items-center gap-3 p-3 rounded-lg border-2 border-dashed transition-all',
              current?.bgType === 'custom'
                ? 'border-fuchsia-500 bg-fuchsia-500/10'
                : 'border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/50',
              uploadingCustom && 'opacity-60'
            )}
          >
            {uploadingCustom ? (
              <Loader2 className="w-5 h-5 animate-spin text-fuchsia-500" />
            ) : (
              <ImagePlus className="w-5 h-5 text-fuchsia-500" />
            )}
            <div className="text-left">
              <p className="text-sm font-medium">
                {uploadingCustom ? 'Uploading…' : 'Upload from gallery'}
              </p>
              <p className="text-xs text-zinc-500">Use any photo as your chat background</p>
            </div>
            {current?.bgType === 'custom' && (
              <Check className="w-5 h-5 text-fuchsia-500 ml-auto" />
            )}
          </button>
        </div>

        {/* Preset grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 py-2">
          {PRESETS.map((preset) => {
            const isActive = activePreset?.id === preset.id
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => setSelected(preset)}
                className={cn(
                  'relative aspect-square rounded-lg border-2 overflow-hidden transition-all',
                  isActive ? 'border-foreground ring-2 ring-foreground/10' : 'border-border hover:border-foreground/40'
                )}
                style={{
                  background:
                    preset.bgType === 'default'
                      ? '#0a0a0a'
                      : preset.bgType === 'pattern'
                      ? `${preset.bgValue} / 16px 16px`
                      : preset.bgValue,
                }}
              >
                {!preset.bgValue && (
                  <div className={preset.preview + ' w-full h-full'} />
                )}
                <span className="absolute bottom-0 inset-x-0 bg-black/30 text-white text-xs py-0.5 px-1 text-center">
                  {preset.label}
                </span>
                {isActive && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-7 h-7 rounded-full bg-foreground text-background flex items-center justify-center">
                      <Check className="w-4 h-4" />
                    </div>
                  </div>
                )}
              </button>
            )
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !selected}>
            {saving ? 'Saving…' : 'Apply'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
