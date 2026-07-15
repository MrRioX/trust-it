'use client'

import { useState } from 'react'
import { useApp } from '@/store/app-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { AtSign, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react'

export function UidSetupScreen() {
  const { user, setUid: saveUid } = useApp()
  const [uid, setUid] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    await saveUid(uid.trim())
    setBusy(false)
  }

  const suggestions = [
    (user?.email?.split('@')[0] || 'user') + '_',
    (user?.displayName || 'user').toLowerCase().replace(/\s+/g, '_'),
    'user_' + Math.random().toString(36).slice(2, 7),
  ].filter((s, i, arr) => arr.indexOf(s) === i).slice(0, 3)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-fuchsia-50 via-rose-50 to-amber-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-border/60">
        <CardHeader className="text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-rose-500 flex items-center justify-center mb-3">
            <AtSign className="w-7 h-7 text-white" />
          </div>
          <CardTitle className="text-2xl">Pick your unique ID</CardTitle>
          <CardDescription>
            Your UID is how friends find you online. Choose carefully — others will add you by typing exactly this.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="uid">Your UID</Label>
              <div className="relative">
                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="uid"
                  type="text"
                  value={uid}
                  onChange={(e) => setUid(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20))}
                  placeholder="e.g. alice_2026"
                  className="pl-9 text-lg font-mono"
                  autoComplete="off"
                  autoFocus
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                3–20 characters: letters, numbers, underscores. No spaces.
              </p>
            </div>

            {suggestions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Suggestions
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setUid(s)}
                      className="px-3 py-1 text-sm rounded-full bg-muted hover:bg-muted/80 border border-border transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-lg bg-muted/50 border border-border p-3 text-xs text-muted-foreground space-y-1">
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 mt-0.5 text-emerald-600 flex-shrink-0" />
                <p>
                  After setting your UID, your end-to-end encryption key pair is generated locally in your browser.
                  The private key never leaves this device — not even the server can read it.
                </p>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={busy || uid.length < 3}>
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
