'use client'

import { useState } from 'react'
import { useApp } from '@/store/app-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Lock, Mail, Phone, User, ShieldCheck, MessageSquareLock } from 'lucide-react'
import { DownloadAppDialog } from './download-app-dialog'

export function AuthScreen() {
  const { login, register } = useApp()
  const [tab, setTab] = useState<'login' | 'register'>('login')

  // Login form
  const [loginIdentifier, setLoginIdentifier] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // Register form
  const [regEmail, setRegEmail] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regDisplayName, setRegDisplayName] = useState('')

  const [busy, setBusy] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    await login({ identifier: loginIdentifier, password: loginPassword })
    setBusy(false)
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    await register({
      email: regEmail,
      phone: regPhone,
      password: regPassword,
      displayName: regDisplayName,
    })
    setBusy(false)
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left brand panel */}
      <div className="lg:flex-1 bg-gradient-to-br from-fuchsia-600 via-rose-500 to-amber-500 text-white p-8 lg:p-16 flex flex-col justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-amber-200 blur-3xl" />
        </div>
        {/* Download app button — top-right */}
        <div className="absolute top-4 right-4 z-20">
          <DownloadAppDialog />
        </div>
        <div className="relative z-10 max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <MessageSquareLock className="w-7 h-7" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Trust It</h1>
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold leading-tight mb-4">
            Private messages,<br />end-to-end encrypted.
          </h2>
          <p className="text-white/80 text-lg mb-8">
            A secure messenger where only you and your friends can read your conversations.
            Send text, images, and videos — all encrypted on your device.
          </p>
          <ul className="space-y-3">
            <li className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-amber-200" />
              <span>ECDH + AES-GCM end-to-end encryption</span>
            </li>
            <li className="flex items-center gap-3">
              <MessageSquareLock className="w-5 h-5 text-amber-200" />
              <span>Real-time delivery via WebSocket</span>
            </li>
            <li className="flex items-center gap-3">
              <User className="w-5 h-5 text-amber-200" />
              <span>Find friends by UID only</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Right form panel */}
      <div className="lg:flex-1 bg-background p-6 lg:p-16 flex items-center justify-center">
        <Card className="w-full max-w-md shadow-xl border-border/60">
          <CardHeader>
            <CardTitle className="text-2xl">Welcome</CardTitle>
            <CardDescription>
              Sign in or create your encrypted messenger account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={(v) => setTab(v as 'login' | 'register')}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Sign in</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-id">Email or phone</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="login-id"
                        type="text"
                        autoComplete="username"
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                        placeholder="you@example.com or +1 555 0100"
                        className="pl-9"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-pw">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="login-pw"
                        type="password"
                        autoComplete="current-password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pl-9"
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy ? 'Signing in…' : 'Sign in'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-name">Display name (optional)</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="reg-name"
                        type="text"
                        value={regDisplayName}
                        onChange={(e) => setRegDisplayName(e.target.value)}
                        placeholder="Your name"
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="reg-email"
                        type="email"
                        autoComplete="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="pl-9"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-phone">Phone number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="reg-phone"
                        type="tel"
                        autoComplete="tel"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="+1 555 0100"
                        className="pl-9"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-pw">Password (min 6 chars)</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="reg-pw"
                        type="password"
                        autoComplete="new-password"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pl-9"
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy ? 'Creating account…' : 'Create account'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
