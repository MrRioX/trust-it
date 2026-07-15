'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Download,
  Smartphone,
  Apple,
  Chrome,
  CheckCircle2,
  Share,
  PlusSquare,
  X,
  Link2,
  Copy,
  Check,
} from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

function detectPlatform(): 'android' | 'ios' | 'desktop' {
  if (typeof navigator === 'undefined') return 'desktop'
  const ua = navigator.userAgent.toLowerCase()
  if (/iphone|ipad|ipod/.test(ua)) return 'ios'
  if (/android/.test(ua)) return 'android'
  return 'desktop'
}

function detectInstalled(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches
}

export function DownloadAppDialog() {
  const [open, setOpen] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  // Lazy initializers — no setState-in-effect needed
  const [installed, setInstalled] = useState<boolean>(() => detectInstalled())
  const [platform] = useState<'android' | 'ios' | 'desktop'>(() => detectPlatform())

  useEffect(() => {
    // Capture beforeinstallprompt (Android Chrome / desktop Chrome/Edge)
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // Listen for changes in display mode (e.g. after install)
    const mq = window.matchMedia('(display-mode: standalone)')
    const standaloneChange = (e: MediaQueryListEvent) => {
      setInstalled(e.matches)
    }
    mq.addEventListener('change', standaloneChange)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      mq.removeEventListener('change', standaloneChange)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    if (choice.outcome === 'accepted') {
      setInstalled(true)
      setOpen(false)
    }
    setDeferredPrompt(null)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Download className="w-4 h-4" />
          Download App
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Install Trust It App
          </DialogTitle>
          <DialogDescription>
            Install Trust It on your phone or computer for a full-screen, native-app experience. No app store needed.
          </DialogDescription>
        </DialogHeader>

        {installed ? (
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 p-4 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-emerald-900 dark:text-emerald-200">
                You&apos;re using the installed app!
              </p>
              <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-0.5">
                Trust It is running in standalone mode. Find it on your home screen.
              </p>
            </div>
          </div>
        ) : platform === 'android' && deferredPrompt ? (
          <div className="space-y-4">
            <p className="text-sm">
              Tap the button below to install Trust It directly on your Android device.
            </p>
            <Button onClick={handleInstall} className="w-full gap-1.5" size="lg">
              <Download className="w-4 h-4" />
              Install App
            </Button>
          </div>
        ) : (
          <Tabs defaultValue={platform === 'ios' ? 'ios' : platform === 'android' ? 'android' : 'desktop'}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="android" className="gap-1.5">
                <Smartphone className="w-3.5 h-3.5" />
                Android
              </TabsTrigger>
              <TabsTrigger value="ios" className="gap-1.5">
                <Apple className="w-3.5 h-3.5" />
                iPhone
              </TabsTrigger>
              <TabsTrigger value="desktop" className="gap-1.5">
                <Chrome className="w-3.5 h-3.5" />
                Desktop
              </TabsTrigger>
            </TabsList>

            <TabsContent value="android" className="space-y-3 mt-4">
              <ol className="space-y-3 text-sm">
                <Step n={1}>
                  Open this page in <strong>Chrome</strong>, <strong>Edge</strong>, or <strong>Samsung Internet</strong> on your Android phone.
                </Step>
                <Step n={2}>
                  Tap the <strong>three-dot menu</strong> (⋮) in the top-right corner of the browser.
                </Step>
                <Step n={3}>
                  Tap <strong>&quot;Install app&quot;</strong> or <strong>&quot;Add to Home screen&quot;</strong>.
                </Step>
                <Step n={4}>
                  Confirm by tapping <strong>&quot;Install&quot;</strong>. Trust It will appear as an app icon on your home screen.
                </Step>
              </ol>
              <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <Chrome className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <p>Need Chrome 73+ or any modern Android browser. Works offline after first launch.</p>
              </div>
              {deferredPrompt && (
                <Button onClick={handleInstall} className="w-full gap-1.5">
                  <Download className="w-4 h-4" />
                  Or tap here to install now
                </Button>
              )}
            </TabsContent>

            <TabsContent value="ios" className="space-y-3 mt-4">
              <ol className="space-y-3 text-sm">
                <Step n={1}>
                  Open this page in <strong>Safari</strong> on your iPhone or iPad. (Other browsers don&apos;t support iOS install.)
                </Step>
                <Step n={2}>
                  Tap the <strong>Share button</strong>{' '}
                  <Share className="inline-block w-3.5 h-3.5 -mt-0.5 align-middle" /> at the bottom of the screen.
                </Step>
                <Step n={3}>
                  Scroll down and tap <strong>&quot;Add to Home Screen&quot;</strong>{' '}
                  <PlusSquare className="inline-block w-3.5 h-3.5 -mt-0.5 align-middle" />.
                </Step>
                <Step n={4}>
                  Tap <strong>&quot;Add&quot;</strong> in the top-right corner. The Trust It icon will appear on your home screen.
                </Step>
              </ol>
              <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <Apple className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <p>Requires iOS 11.3 or later. Must use Safari — Chrome/Firefox on iOS cannot install PWAs.</p>
              </div>
            </TabsContent>

            <TabsContent value="desktop" className="space-y-3 mt-4">
              <ol className="space-y-3 text-sm">
                <Step n={1}>
                  Open this page in <strong>Chrome</strong> or <strong>Edge</strong> on your computer.
                </Step>
                <Step n={2}>
                  Look for the <strong>install icon</strong>{' '}
                  <Download className="inline-block w-3.5 h-3.5 -mt-0.5 align-middle" /> in the address bar (right side).
                </Step>
                <Step n={3}>
                  Click it and choose <strong>&quot;Install&quot;</strong>. Trust It opens in its own window.
                </Step>
              </ol>
              <p className="text-xs text-muted-foreground">
                On macOS, you can also use Safari 17+ with <strong>File → Add to Dock</strong>.
              </p>
            </TabsContent>
          </Tabs>
        )}

        {/* Direct link / share section */}
        <DirectLinkSection />

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="text-xs text-muted-foreground flex-1 flex items-center gap-1.5">
            <Smartphone className="w-3 h-3" />
            ~3 MB install · Works offline · No app store
          </div>
          <Button variant="outline" onClick={() => setOpen(false)}>
            <X className="w-3.5 h-3.5 mr-1" />
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-fuchsia-500 to-rose-500 text-white text-xs font-bold flex items-center justify-center">
        {n}
      </span>
      <span className="pt-0.5">{children}</span>
    </li>
  )
}

function DirectLinkSection() {
  const [copied, setCopied] = useState(false)
  const currentUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : ''

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      // Fallback for older browsers
      const ta = document.createElement('textarea')
      ta.value = currentUrl
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Trust It — Encrypted Messenger',
          text: 'Install Trust It to send me end-to-end encrypted messages:',
          url: currentUrl,
        })
      } catch (e) {
        // User cancelled — ignore
      }
    } else {
      handleCopy()
    }
  }

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Link2 className="w-3 h-3" />
        Direct link for mobile
      </div>
      <p className="text-xs text-muted-foreground">
        Open this URL on your phone&apos;s browser to install the app:
      </p>
      <div className="flex items-center gap-2">
        <code className="flex-1 text-xs bg-background border rounded px-2 py-1.5 truncate font-mono">
          {currentUrl}
        </code>
        <Button size="sm" variant="outline" onClick={handleCopy} className="flex-shrink-0 h-8">
          {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
        <Button size="sm" variant="outline" onClick={handleShare} className="flex-shrink-0 h-8">
          <Share className="w-3 h-3 mr-1" />
          Share
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground">
        💡 Tip: SMS or email this link to your phone, then open it in Chrome (Android) or Safari (iPhone) to install.
      </p>
    </div>
  )
}
