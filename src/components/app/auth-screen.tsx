'use client'

import { useState, useEffect, useRef } from 'react'
import { useApp } from '@/store/app-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Lock, Mail, Phone, User, ArrowLeft, ArrowRight, Loader2, Check, KeyRound, MessageSquare } from 'lucide-react'

const COUNTRY_CODES = [
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+1', country: 'USA', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+86', country: 'China', flag: '🇨🇳' },
  { code: '+81', country: 'Japan', flag: '🇯🇵' },
  { code: '+82', country: 'Korea', flag: '🇰🇷' },
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
  { code: '+966', country: 'Saudi', flag: '🇸🇦' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
  { code: '+49', country: 'Germany', flag: '🇩🇪' },
  { code: '+33', country: 'France', flag: '🇫🇷' },
  { code: '+92', country: 'Pakistan', flag: '🇵🇰' },
  { code: '+880', country: 'Bangladesh', flag: '🇧🇩' },
  { code: '+94', country: 'Sri Lanka', flag: '🇱🇰' },
  { code: '+977', country: 'Nepal', flag: '🇳🇵' },
]

export function AuthScreen() {
  const { login, register } = useApp()
  const [tab, setTab] = useState<'login' | 'register'>('login')

  // Login
  const [loginId, setLoginId] = useState('')
  const [loginPw, setLoginPw] = useState('')
  const [loginBusy, setLoginBusy] = useState(false)

  // Register
  const [step, setStep] = useState(1)
  const [regName, setRegName] = useState('')
  const [regContact, setRegContact] = useState('')
  const [contactType, setContactType] = useState<'email' | 'phone'>('email')
  const [countryCode, setCountryCode] = useState('+91')
  const [otpCode, setOtpCode] = useState('')
  const [otpTimer, setOtpTimer] = useState(0)
  const [regPw, setRegPw] = useState('')
  const [regBusy, setRegBusy] = useState(false)
  const [error, setError] = useState('')
  const [otpNotification, setOtpNotification] = useState<string | null>(null)
  const otpInputRef = useRef<HTMLInputElement>(null)

  // OTP countdown timer
  useEffect(() => {
    if (otpTimer > 0) {
      const t = setTimeout(() => setOtpTimer(otpTimer - 1), 1000)
      return () => clearTimeout(t)
    }
  }, [otpTimer])

  // Auto-hide OTP notification after 8 seconds
  useEffect(() => {
    if (otpNotification) {
      const t = setTimeout(() => setOtpNotification(null), 8000)
      return () => clearTimeout(t)
    }
  }, [otpNotification])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginBusy(true)
    await login({ identifier: loginId, password: loginPw })
    setLoginBusy(false)
  }

  const isEmail = (val: string) => /^\S+@\S+\.\S+$/.test(val)

  const getFullContact = () => {
    if (contactType === 'phone') {
      return countryCode + regContact.replace(/\D/g, '')
    }
    return regContact.trim().toLowerCase()
  }

  const handleSendOtp = async () => {
    setError('')
    if (!regContact.trim()) {
      setError('Please enter your email or phone number')
      return
    }
    const type = isEmail(regContact) ? 'email' : 'phone'
    setContactType(type)
    const fullContact = getFullContact()

    setRegBusy(true)
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: fullContact, type }),
      })
      const text = await res.text()
      let data: any = null
      try { data = text ? JSON.parse(text) : null } catch {}
      if (!res.ok) {
        setError(data?.error || 'Failed to send OTP')
      } else {
        setStep(2)
        setOtpTimer(30) // 30 second resend cooldown
        // Show OTP as a notification (simulates receiving an SMS/email)
        if (data.demoCode) {
          setOtpNotification(data.demoCode)
          // Auto-fill after 2 seconds for fast UX
          setTimeout(() => {
            setOtpCode(data.demoCode)
            otpInputRef.current?.focus()
          }, 2000)
        }
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
        body: JSON.stringify({ identifier: getFullContact(), code: otpCode }),
      })
      const text = await res.text()
      let data: any = null
      try { data = text ? JSON.parse(text) : null } catch {}
      if (!res.ok) {
        setError(data?.error || 'Invalid code')
      } else {
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
    const email = contactType === 'email' ? getFullContact() : ''
    const phone = contactType === 'phone' ? getFullContact() : ''
    await register({ email, phone, password: regPw, displayName: regName })
    setRegBusy(false)
  }

  const resetRegister = () => {
    setStep(1)
    setRegName('')
    setRegContact('')
    setOtpCode('')
    setRegPw('')
    setError('')
    setOtpNotification(null)
    setOtpTimer(0)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      {/* OTP notification toast (looks like a phone notification) */}
      {otpNotification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-zinc-800 border border-zinc-700 rounded-xl shadow-2xl p-4 flex items-start gap-3 max-w-sm animate-in slide-in-from-top-4 duration-300">
          <div className="w-10 h-10 rounded-lg bg-zinc-700 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-5 h-5 text-sky-400" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-zinc-400 font-medium">Trust It</p>
            <p className="text-sm text-white">Your verification code: <span className="font-bold text-sky-400 text-lg tracking-wider">{otpNotification}</span></p>
          </div>
          <button onClick={() => setOtpNotification(null)} className="text-zinc-500 hover:text-white">
            <ArrowLeft className="w-4 h-4 rotate-45" />
          </button>
        </div>
      )}

      <div className="w-full max-w-md">
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
                      <Input id="login-id" type="text" value={loginId} onChange={(e) => setLoginId(e.target.value)} placeholder="you@example.com / +91... / @username" className="pl-9 bg-zinc-800 border-zinc-700 text-white" required />
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

          {/* REGISTER */}
          <TabsContent value="register">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-lg">
                    {step === 1 ? 'Create Account' : step === 2 ? 'Verify' : 'Set Password'}
                  </CardTitle>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3].map((s) => (
                      <div key={s} className={`w-2 h-2 rounded-full transition-colors ${s <= step ? 'bg-sky-500' : 'bg-zinc-700'}`} />
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {error && (
                  <div className="mb-4 text-sm text-rose-400 bg-rose-950/30 rounded-md p-2 border border-rose-900">{error}</div>
                )}

                {/* Step 1: Name + Contact */}
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
                      <div className="flex gap-2">
                        {/* Country code selector — only shown for phone */}
                        {!isEmail(regContact) && regContact.length > 0 ? (
                          <Select value={countryCode} onValueChange={setCountryCode}>
                            <SelectTrigger className="w-28 bg-zinc-800 border-zinc-700 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-800 border-zinc-700 max-h-60">
                              {COUNTRY_CODES.map((cc) => (
                                <SelectItem key={cc.code} value={cc.code} className="text-white">
                                  <span className="mr-2">{cc.flag}</span> {cc.code}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : null}
                        <div className="relative flex-1">
                          {isEmail(regContact) ? <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" /> : <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />}
                          <Input id="reg-contact" type="text" value={regContact} onChange={(e) => setRegContact(e.target.value)} placeholder="Email or phone number" className="pl-9 bg-zinc-800 border-zinc-700 text-white" />
                        </div>
                      </div>
                    </div>
                    <Button onClick={handleSendOtp} disabled={regBusy} className="w-full bg-zinc-700 hover:bg-zinc-600 text-white gap-1.5">
                      {regBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Get Code <ArrowRight className="w-4 h-4" /></>}
                    </Button>
                  </div>
                )}

                {/* Step 2: OTP */}
                {step === 2 && (
                  <div className="space-y-4">
                    <p className="text-sm text-zinc-400 text-center">
                      Enter the 6-digit code sent to<br />
                      <span className="text-white font-medium">{getFullContact()}</span>
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="otp" className="text-zinc-300">Verification Code</Label>
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <Input ref={otpInputRef} id="otp" type="text" inputMode="numeric" maxLength={6} value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))} placeholder="000000" className="pl-9 bg-zinc-800 border-zinc-700 text-white text-center text-2xl tracking-[0.5em] font-mono" />
                      </div>
                    </div>
                    <Button onClick={handleVerifyOtp} disabled={regBusy || otpCode.length !== 6} className="w-full bg-zinc-700 hover:bg-zinc-600 text-white gap-1.5">
                      {regBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Verify <Check className="w-4 h-4" /></>}
                    </Button>
                    <div className="flex items-center justify-between">
                      <button onClick={() => { setStep(1); setOtpCode(''); setError(''); }} className="text-sm text-zinc-500 hover:text-white flex items-center gap-1">
                        <ArrowLeft className="w-3 h-3" /> Back
                      </button>
                      {otpTimer > 0 ? (
                        <span className="text-sm text-zinc-600">Resend in {otpTimer}s</span>
                      ) : (
                        <button onClick={handleSendOtp} className="text-sm text-sky-400 hover:text-sky-300">Resend code</button>
                      )}
                    </div>
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
