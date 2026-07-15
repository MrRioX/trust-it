'use client'

import { useState } from 'react'
import { useApp } from '@/store/app-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Lock, Mail, Phone, User, ArrowLeft, ArrowRight, Loader2, Check, KeyRound } from 'lucide-react'

export function AuthScreen() {
  const { login, register } = useApp()
  const [tab, setTab] = useState<'login' | 'register'>('login')

  // Login state
  const [loginId, setLoginId] = useState('')
  const [loginPw, setLoginPw] = useState('')
  const [loginBusy, setLoginBusy] = useState(false)

  // Register state — 3 steps
  const [step, setStep] = useState(1) // 1: name+email/phone, 2: OTP, 3: password
  const [regName, setRegName] = useState('')
  const [regContact, setRegContact] = useState('') // email or phone
  const [contactType, setContactType] = useState<'email' | 'phone'>('email')
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [demoOtp, setDemoOtp] = useState('') // shown in demo mode
  const [otpVerified, setOtpVerified] = useState(false)
  const [regPw, setRegPw] = useState('')
  const [regBusy, setRegBusy] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginBusy(true)
    await login({ identifier: loginId, password: loginPw })
    setLoginBusy(false)
  }

  const isEmail = (val: string) => /^\S+@\S+\.\S+$/.test(val)

  const handleSendOtp = async () => {
    setError('')
    if (!regContact.trim()) {
      setError('Please enter your email or phone number')
      return
    }
    const type = isEmail(regContact) ? 'email' : 'phone'
    setContactType(type)
    setRegBusy(true)
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: regContact, type }),
      })
      const text = await res.text()
      let data: any = null
      try { data = text ? JSON.parse(text) : null } catch {}
      if (!res.ok) {
        setError(data?.error || 'Failed to send OTP')
      } else {
        setOtpSent(true)
        setDemoOtp(data.demoCode || '')
        setStep(2)
      }
    } catch {
      setError('Network error')
    }
    setRegBusy(false)
  }

  const handleVerifyOtp = async () => {
    setError('')
    if (otpCode.length !== 6) {
      setError('Please enter the 6-digit code')
      return
    }
    setRegBusy(true)
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: regContact, code: otpCode }),
      })
      const text = await res.text()
      let data: any = null
      try { data = text ? JSON.parse(text) : null } catch {}
      if (!res.ok) {
        setError(data?.error || 'Invalid code')
      } else {
        setOtpVerified(true)
        setStep(3)
      }
    } catch {
      setError('Network error')
    }
    setRegBusy(false)
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (regPw.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setRegBusy(true)
    const email = contactType === 'email' ? regContact : ''
    const phone = contactType === 'phone' ? regContact : ''
    await register({ email, phone, password: regPw, displayName: regName })
    setRegBusy(false)
  }

  const resetRegister = () => {
    setStep(1)
    setRegName('')
    setRegContact('')
    setOtpSent(false)
    setOtpCode('')
    setDemoOtp('')
    setOtpVerified(false)
    setRegPw('')
    setError('')
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

        <Tabs value={tab} onValueChange={(v) => { setTab(v as 'login' | 'register'); resetRegister(); }}>
          <TabsList className="grid w-full grid-cols-2 bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="login" className="data-[state=active]:bg-zinc-700 data-[state=active]:text-white text-zinc-400">Sign In</TabsTrigger>
            <TabsTrigger value="register" className="data-[state=active]:bg-zinc-700 data-[state=active]:text-white text-zinc-400">Register</TabsTrigger>
          </TabsList>

          {/* LOGIN */}
          <TabsContent value="login">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-6">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-id" className="text-zinc-300">Email, Phone, or Username</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <Input id="login-id" type="text" value={loginId} onChange={(e) => setLoginId(e.target.value)} placeholder="you@example.com / +1... / @username" className="pl-9 bg-zinc-800 border-zinc-700 text-white" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-pw" className="text-zinc-300">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <Input id="login-pw" type="password" value={loginPw} onChange={(e) => setLoginPw(e.target.value)} placeholder="••••••••" className="pl-9 bg-zinc-800 border-zinc-700 text-white" required />
                    </div>
                  </div>
                  <Button type="submit" disabled={loginBusy} className="w-full bg-zinc-700 hover:bg-zinc-600 text-white">
                    {loginBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* REGISTER — 3-step flow */}
          <TabsContent value="register">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-lg">
                    {step === 1 ? 'Create Account' : step === 2 ? 'Verify' : 'Set Password'}
                  </CardTitle>
                  {/* Step indicator */}
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3].map((s) => (
                      <div key={s} className={`w-2 h-2 rounded-full transition-colors ${s <= step ? 'bg-sky-500' : 'bg-zinc-700'}`} />
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {error && (
                  <div className="mb-4 text-sm text-rose-400 bg-rose-950/30 rounded-md p-2 border border-rose-900">
                    {error}
                  </div>
                )}

                {/* Step 1: Name + Email/Phone */}
                {step === 1 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reg-name" className="text-zinc-300">Display Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <Input id="reg-name" type="text" value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="Your name" className="pl-9 bg-zinc-800 border-zinc-700 text-white" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-contact" className="text-zinc-300">Email or Phone</Label>
                      <div className="relative">
                        {isEmail(regContact) ? <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" /> : <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />}
                        <Input id="reg-contact" type="text" value={regContact} onChange={(e) => setRegContact(e.target.value)} placeholder="you@example.com or +1 555 0100" className="pl-9 bg-zinc-800 border-zinc-700 text-white" />
                      </div>
                    </div>
                    <Button onClick={handleSendOtp} disabled={regBusy} className="w-full bg-zinc-700 hover:bg-zinc-600 text-white gap-1.5">
                      {regBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Get Code <ArrowRight className="w-4 h-4" /></>}
                    </Button>
                  </div>
                )}

                {/* Step 2: OTP Verification */}
                {step === 2 && (
                  <div className="space-y-4">
                    <p className="text-sm text-zinc-400 text-center">
                      We sent a 6-digit code to <br />
                      <span className="text-white font-medium">{regContact}</span>
                    </p>
                    {demoOtp && (
                      <p className="text-xs text-sky-400 text-center bg-sky-950/30 rounded p-2">
                        Demo mode: Your code is <strong>{demoOtp}</strong>
                      </p>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="otp" className="text-zinc-300">Enter Code</Label>
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <Input id="otp" type="text" inputMode="numeric" maxLength={6} value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))} placeholder="000000" className="pl-9 bg-zinc-800 border-zinc-700 text-white text-center text-2xl tracking-[0.5em] font-mono" />
                      </div>
                    </div>
                    <Button onClick={handleVerifyOtp} disabled={regBusy || otpCode.length !== 6} className="w-full bg-zinc-700 hover:bg-zinc-600 text-white gap-1.5">
                      {regBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Verify <Check className="w-4 h-4" /></>}
                    </Button>
                    <button onClick={handleSendOtp} className="w-full text-sm text-zinc-400 hover:text-white">
                      Resend code
                    </button>
                    <button onClick={() => { setStep(1); setOtpCode(''); setError(''); }} className="w-full text-sm text-zinc-500 hover:text-white flex items-center justify-center gap-1">
                      <ArrowLeft className="w-3 h-3" /> Back
                    </button>
                  </div>
                )}

                {/* Step 3: Password */}
                {step === 3 && (
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="flex items-center justify-center w-12 h-12 mx-auto rounded-full bg-emerald-500/20">
                      <Check className="w-6 h-6 text-emerald-400" />
                    </div>
                    <p className="text-sm text-zinc-400 text-center">Verified! Set your password.</p>
                    <div className="space-y-2">
                      <Label htmlFor="reg-pw" className="text-zinc-300">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <Input id="reg-pw" type="password" value={regPw} onChange={(e) => setRegPw(e.target.value)} placeholder="Minimum 6 characters" className="pl-9 bg-zinc-800 border-zinc-700 text-white" required />
                      </div>
                    </div>
                    <Button type="submit" disabled={regBusy} className="w-full bg-zinc-700 hover:bg-zinc-600 text-white">
                      {regBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
