'use client'

import { useState } from 'react'
import { useApp } from '@/store/app-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Lock, Mail, Phone, User, AtSign, ArrowLeft, Loader2 } from 'lucide-react'

export function AuthScreen() {
  const { login, register } = useApp()
  const [tab, setTab] = useState<'login' | 'register' | 'forgot'>('login')

  // Login
  const [loginId, setLoginId] = useState('')
  const [loginPw, setLoginPw] = useState('')

  // Register
  const [regName, setRegName] = useState('')
  const [regUid, setRegUid] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regPw, setRegPw] = useState('')

  // Forgot
  const [fpEmail, setFpEmail] = useState('')
  const [fpPhone, setFpPhone] = useState('')
  const [fpNewPw, setFpNewPw] = useState('')
  const [fpDone, setFpDone] = useState(false)

  const [busy, setBusy] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    await login({ identifier: loginId, password: loginPw })
    setBusy(false)
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    await register({
      email: regEmail,
      phone: regPhone,
      password: regPw,
      displayName: regName,
      uid: regUid,
    })
    setBusy(false)
  }

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: fpEmail, phone: fpPhone, newPassword: fpNewPw }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(data.error || 'Failed to reset password')
      } else {
        setFpDone(true)
        setTimeout(() => {
          setTab('login')
          setFpDone(false)
          setFpEmail('')
          setFpPhone('')
          setFpNewPw('')
        }, 2000)
      }
    } catch {
      alert('Failed to reset password')
    }
    setBusy(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-zinc-700 to-zinc-900 border border-zinc-700 flex items-center justify-center mb-4 shadow-2xl">
            <span className="text-5xl font-black text-white" style={{ fontFamily: 'Arial Black, sans-serif' }}>T</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Trust It</h1>
        </div>

        {tab === 'forgot' ? (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <div className="flex items-center gap-3">
                <button onClick={() => setTab('login')} className="text-zinc-400 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <CardTitle className="text-white text-lg">Reset Password</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {fpDone ? (
                <div className="text-center py-8">
                  <p className="text-emerald-400 font-medium">Password reset successfully!</p>
                  <p className="text-zinc-500 text-sm mt-1">Redirecting to login…</p>
                </div>
              ) : (
                <form onSubmit={handleForgot} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fp-email" className="text-zinc-300">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <Input id="fp-email" type="email" value={fpEmail} onChange={(e) => setFpEmail(e.target.value)} placeholder="you@example.com" className="pl-9 bg-zinc-800 border-zinc-700 text-white" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fp-phone" className="text-zinc-300">Phone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <Input id="fp-phone" type="tel" value={fpPhone} onChange={(e) => setFpPhone(e.target.value)} placeholder="+1 555 0100" className="pl-9 bg-zinc-800 border-zinc-700 text-white" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fp-pw" className="text-zinc-300">New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <Input id="fp-pw" type="password" value={fpNewPw} onChange={(e) => setFpNewPw(e.target.value)} placeholder="••••••••" className="pl-9 bg-zinc-800 border-zinc-700 text-white" required />
                    </div>
                  </div>
                  <Button type="submit" disabled={busy} className="w-full bg-zinc-700 hover:bg-zinc-600">
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reset Password'}
                  </Button>
                  <p className="text-xs text-zinc-500 text-center">Enter your registered email and phone to verify your identity.</p>
                </form>
              )}
            </CardContent>
          </Card>
        ) : (
          <Tabs value={tab} onValueChange={(v) => setTab(v as 'login' | 'register')}>
            <TabsList className="grid w-full grid-cols-2 bg-zinc-900 border border-zinc-800">
              <TabsTrigger value="login" className="data-[state=active]:bg-zinc-700 data-[state=active]:text-white text-zinc-400">Sign In</TabsTrigger>
              <TabsTrigger value="register" className="data-[state=active]:bg-zinc-700 data-[state=active]:text-white text-zinc-400">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="pt-6">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-id" className="text-zinc-300">Email or Phone</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <Input id="login-id" type="text" value={loginId} onChange={(e) => setLoginId(e.target.value)} placeholder="you@example.com" className="pl-9 bg-zinc-800 border-zinc-700 text-white" required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-pw" className="text-zinc-300">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <Input id="login-pw" type="password" value={loginPw} onChange={(e) => setLoginPw(e.target.value)} placeholder="••••••••" className="pl-9 bg-zinc-800 border-zinc-700 text-white" required />
                      </div>
                    </div>
                    <Button type="submit" disabled={busy} className="w-full bg-zinc-700 hover:bg-zinc-600 text-white">
                      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
                    </Button>
                    <button type="button" onClick={() => setTab('forgot')} className="w-full text-sm text-zinc-400 hover:text-white">
                      Forgot password?
                    </button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="pt-6">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reg-name" className="text-zinc-300">Display Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <Input id="reg-name" type="text" value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="Your name" className="pl-9 bg-zinc-800 border-zinc-700 text-white" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-uid" className="text-zinc-300">Username (UID)</Label>
                      <div className="relative">
                        <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <Input id="reg-uid" type="text" value={regUid} onChange={(e) => setRegUid(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20))} placeholder="yourname_2026" className="pl-9 bg-zinc-800 border-zinc-700 text-white font-mono" />
                      </div>
                      <p className="text-xs text-zinc-500">3-20 chars: letters, numbers, underscores</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-email" className="text-zinc-300">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <Input id="reg-email" type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder="you@example.com" className="pl-9 bg-zinc-800 border-zinc-700 text-white" required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-phone" className="text-zinc-300">Phone</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <Input id="reg-phone" type="tel" value={regPhone} onChange={(e) => setRegPhone(e.target.value)} placeholder="+1 555 0100" className="pl-9 bg-zinc-800 border-zinc-700 text-white" required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-pw" className="text-zinc-300">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <Input id="reg-pw" type="password" value={regPw} onChange={(e) => setRegPw(e.target.value)} placeholder="Min 6 characters" className="pl-9 bg-zinc-800 border-zinc-700 text-white" required />
                      </div>
                    </div>
                    <Button type="submit" disabled={busy} className="w-full bg-zinc-700 hover:bg-zinc-600 text-white">
                      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  )
}
