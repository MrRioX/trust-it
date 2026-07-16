'use client'

import { useState, useEffect, useRef } from 'react'
import { useApp } from '@/store/app-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Lock, Mail, Phone, User, ArrowLeft, ArrowRight, Loader2, Check, KeyRound } from 'lucide-react'
import { firebaseAuth, isFirebaseConfigured } from '@/lib/firebase'
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from 'firebase/auth'

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

// Reusable country code selector — always visible
function CountryCodeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[100px] bg-zinc-800 border-zinc-700 text-white flex-shrink-0">
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
  )
}

export function AuthScreen() {
  const { login, register } = useApp()
  const [tab, setTab] = useState<'login' | 'register' | 'forgot'>('login')

  // Login
  const [loginId, setLoginId] = useState('')
  const [loginPw, setLoginPw] = useState('')
  const [loginBusy, setLoginBusy] = useState(false)

  // Register
  const [step, setStep] = useState(1)
  const [regName, setRegName] = useState('')
  const [regContact, setRegContact] = useState('')
  const [contactType, setContactType] = useState<'email' | 'phone'>('phone')
  const [countryCode, setCountryCode] = useState('+91')
  const [otpCode, setOtpCode] = useState('')
  const [otpTimer, setOtpTimer] = useState(0)
  const [regPw, setRegPw] = useState('')
  const [regBusy, setRegBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null)
  const otpInputRef = useRef<HTMLInputElement>(null)

  // Forgot password
  const [fpContact, setFpContact] = useState('')
  const [fpType, setFpType] = useState<'email' | 'phone'>('phone')
  const [fpCountryCode, setFpCountryCode] = useState('+91')
  const [fpStep, setFpStep] = useState(1)
  const [fpOtp, setFpOtp] = useState('')
  const [fpNewPw, setFpNewPw] = useState('')
  const [fpBusy, setFpBusy] = useState(false)
  const [fpDone, setFpDone] = useState(false)
  const [fpTimer, setFpTimer] = useState(0)
  const [fpConfirmationResult, setFpConfirmationResult] = useState<ConfirmationResult | null>(null)

  useEffect(() => {
    if (otpTimer > 0) { const t = setTimeout(() => setOtpTimer(otpTimer - 1), 1000); return () => clearTimeout(t) }
  }, [otpTimer])
  useEffect(() => {
    if (fpTimer > 0) { const t = setTimeout(() => setFpTimer(fpTimer - 1), 1000); return () => clearTimeout(t) }
  }, [fpTimer])

  const isEmail = (val: string) => /^\S+@\S+\.\S+$/.test(val)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginBusy(true)
    await login({ identifier: loginId, password: loginPw })
    setLoginBusy(false)
  }

  // === REGISTRATION ===
  const getFullContact = () => {
    if (contactType === 'email') return regContact.trim().toLowerCase()
    return countryCode + regContact.replace(/\D/g, '')
  }

  const setupRecaptcha = () => {
    if (!firebaseAuth || !isFirebaseConfigured) return false
    try {
      // Always clear existing reCAPTCHA before creating a new one
      if ((window as any).recaptchaVerifier) {
        try { (window as any).recaptchaVerifier.clear() } catch {}
        ;(window as any).recaptchaVerifier = null
      }
      // Clear the container DOM element too
      const container = document.getElementById('recaptcha-container')
      if (container) container.innerHTML = ''
      // Create fresh verifier
      const verifier = new RecaptchaVerifier(firebaseAuth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {},
      })
      ;(window as any).recaptchaVerifier = verifier
      verifier.render().catch(() => {})
      return true
    } catch { return false }
  }

  const handleSendOtp = async () => {
    setError('')
    if (!regContact.trim()) { setError('Please enter your email or phone number'); return }
    const type = isEmail(regContact) ? 'email' : 'phone'
    setContactType(type)
    const fullContact = type === 'phone' ? countryCode + regContact.replace(/\D/g, '') : regContact.trim().toLowerCase()
    setRegBusy(true)

    if (type === 'phone') {
      // === FIREBASE PHONE AUTH (real SMS, no fake) ===
      if (!firebaseAuth || !isFirebaseConfigured) {
        setError('Firebase is not configured. Add Firebase env vars on Vercel.')
        setRegBusy(false)
        return
      }
      try {
        setupRecaptcha()
        const verifier = (window as any).recaptchaVerifier
        if (!verifier) { setError('reCAPTCHA not ready. Please try again.'); setRegBusy(false); return }
        const result = await signInWithPhoneNumber(firebaseAuth, fullContact, verifier)
        setConfirmationResult(result)
        setStep(2)
        setOtpTimer(30)
      } catch (e: any) {
        setError(e?.message || 'Failed to send SMS. Make sure your number is correct.')
        if ((window as any).recaptchaVerifier) { try { (window as any).recaptchaVerifier.clear() } catch {} (window as any).recaptchaVerifier = null }
      }
    } else {
      // === EMAIL OTP via server (Resend) ===
      try {
        const res = await fetch('/api/auth/send-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier: fullContact, type: 'email' }) })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) { setError(data?.error || 'Failed to send OTP') }
        else if (data.demoCode) {
          // Resend not configured — show error, don't fake it
          setError('Email OTP service not configured. Add RESEND_API_KEY on Vercel, or use phone number instead.')
        } else {
          setStep(2); setOtpTimer(30)
        }
      } catch { setError('Network error') }
    }
    setRegBusy(false)
  }

  const handleVerifyOtp = async () => {
    setError('')
    if (otpCode.length !== 6) { setError('Please enter the 6-digit code'); return }
    setRegBusy(true)

    if (contactType === 'phone' && confirmationResult) {
      // Firebase verification (real)
      try {
        await confirmationResult.confirm(otpCode)
        setStep(3)
      } catch (e: any) {
        setError(e?.message || 'Invalid code. Please try again.')
      }
    } else {
      // Server-side verification (email)
      try {
        const res = await fetch('/api/auth/verify-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier: getFullContact(), code: otpCode }) })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) { setError(data?.error || 'Invalid code') }
        else { setStep(3) }
      } catch { setError('Network error') }
    }
    setRegBusy(false)
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (regPw.length < 6) { setError('Password must be at least 6 characters'); return }
    setRegBusy(true)
    const email = contactType === 'email' ? getFullContact() : ''
    const phone = contactType === 'phone' ? getFullContact() : ''
    await register({ email, phone, password: regPw, displayName: regName })
    setRegBusy(false)
  }

  // === FORGOT PASSWORD ===
  const getFpFullContact = () => {
    if (fpType === 'email') return fpContact.trim().toLowerCase()
    return fpCountryCode + fpContact.replace(/\D/g, '')
  }

  const handleFpSendOtp = async () => {
    setError('')
    if (!fpContact.trim()) { setError('Please enter your email or phone'); return }
    const type = isEmail(fpContact) ? 'email' : 'phone'
    setFpType(type)
    const fullContact = type === 'phone' ? fpCountryCode + fpContact.replace(/\D/g, '') : fpContact.trim().toLowerCase()
    setFpBusy(true)

    if (type === 'phone') {
      // Firebase for phone reset
      if (!firebaseAuth || !isFirebaseConfigured) {
        setError('Firebase is not configured. Add Firebase env vars on Vercel.')
        setFpBusy(false); return
      }
      try {
        setupRecaptcha()
        const verifier = (window as any).recaptchaVerifier
        if (!verifier) { setError('reCAPTCHA not ready. Try again.'); setFpBusy(false); return }
        // Check if user exists first
        const checkRes = await fetch('/api/auth/forgot-password?action=check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier: fullContact, type }) })
        if (!checkRes.ok) { const d = await checkRes.json().catch(() => ({})); setError(d?.error || 'No account found'); setFpBusy(false); return }
        const result = await signInWithPhoneNumber(firebaseAuth, fullContact, verifier)
        setFpConfirmationResult(result)
        setFpStep(2); setFpTimer(30)
      } catch (e: any) {
        setError(e?.message || 'Failed to send SMS')
        if ((window as any).recaptchaVerifier) { try { (window as any).recaptchaVerifier.clear() } catch {} (window as any).recaptchaVerifier = null }
      }
    } else {
      // Email via server
      try {
        const res = await fetch('/api/auth/forgot-password?action=send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier: fullContact, type: 'email' }) })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) { setError(data?.error || 'Failed') }
        else if (data.demoCode) { setError('Email OTP not configured. Use phone number instead.') }
        else { setFpStep(2); setFpTimer(30) }
      } catch { setError('Network error') }
    }
    setFpBusy(false)
  }

  const handleFpReset = async () => {
    setError('')
    if (fpOtp.length !== 6) { setError('Enter the 6-digit code'); return }
    if (fpNewPw.length < 6) { setError('Password must be at least 6 characters'); return }
    setFpBusy(true)

    if (fpType === 'phone' && fpConfirmationResult) {
      // Firebase verify
      try {
        await fpConfirmationResult.confirm(fpOtp)
        // Now reset password on server
        const res = await fetch('/api/auth/forgot-password?action=reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier: getFpFullContact(), code: 'firebase-verified', newPassword: fpNewPw }) })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) { setError(data?.error || 'Reset failed') }
        else { setFpDone(true); setTimeout(() => { setTab('login'); setFpStep(1); setFpDone(false); setFpContact(''); setFpOtp(''); setFpNewPw('') }, 2000) }
      } catch (e: any) { setError(e?.message || 'Invalid code') }
    } else {
      // Email server-side
      try {
        const res = await fetch('/api/auth/forgot-password?action=reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier: getFpFullContact(), code: fpOtp, newPassword: fpNewPw }) })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) { setError(data?.error || 'Reset failed') }
        else { setFpDone(true); setTimeout(() => { setTab('login'); setFpStep(1); setFpDone(false); setFpContact(''); setFpOtp(''); setFpNewPw('') }, 2000) }
      } catch { setError('Network error') }
    }
    setFpBusy(false)
  }

  const resetRegister = () => {
    setStep(1); setRegName(''); setRegContact(''); setOtpCode(''); setRegPw(''); setError(''); setOtpTimer(0); setConfirmationResult(null)
    if ((window as any).recaptchaVerifier) { try { (window as any).recaptchaVerifier.clear() } catch {} (window as any).recaptchaVerifier = null }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <div id="recaptcha-container"></div>

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
                <button onClick={() => { setTab('login'); setFpStep(1); setError('') }} className="text-zinc-400 hover:text-white"><ArrowLeft className="w-5 h-5" /></button>
                <CardTitle className="text-white text-lg">Reset Password</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {fpDone ? (
                <div className="text-center py-8">
                  <Check className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                  <p className="text-emerald-400 font-medium">Password reset successfully!</p>
                  <p className="text-zinc-500 text-sm mt-1">Redirecting to login…</p>
                </div>
              ) : fpStep === 1 ? (
                <div className="space-y-4">
                  {error && <div className="text-sm text-rose-400 bg-rose-950/30 rounded-md p-2 border border-rose-900">{error}</div>}
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Email or Phone</Label>
                    <div className="flex gap-2">
                      <CountryCodeSelect value={fpCountryCode} onChange={setFpCountryCode} />
                      <div className="relative flex-1">
                        {isEmail(fpContact) ? <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" /> : <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />}
                        <Input type="text" value={fpContact} onChange={(e) => setFpContact(e.target.value)} placeholder="Email or phone number" className="pl-9 bg-zinc-800 border-zinc-700 text-white" />
                      </div>
                    </div>
                  </div>
                  <Button onClick={handleFpSendOtp} disabled={fpBusy} className="w-full bg-zinc-700 hover:bg-zinc-600 text-white">{fpBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Reset Code'}</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {error && <div className="text-sm text-rose-400 bg-rose-950/30 rounded-md p-2 border border-rose-900">{error}</div>}
                  <p className="text-sm text-zinc-400 text-center">Code sent to <span className="text-white font-medium">{getFpFullContact()}</span></p>
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Verification Code</Label>
                    <div className="relative"><KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" /><Input type="text" inputMode="numeric" maxLength={6} value={fpOtp} onChange={(e) => setFpOtp(e.target.value.replace(/\D/g, ''))} placeholder="000000" className="pl-9 bg-zinc-800 border-zinc-700 text-white text-center text-2xl tracking-[0.5em] font-mono" /></div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300">New Password</Label>
                    <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" /><Input type="password" value={fpNewPw} onChange={(e) => setFpNewPw(e.target.value)} placeholder="Min 6 characters" className="pl-9 bg-zinc-800 border-zinc-700 text-white" /></div>
                  </div>
                  <Button onClick={handleFpReset} disabled={fpBusy || fpOtp.length !== 6 || fpNewPw.length < 6} className="w-full bg-zinc-700 hover:bg-zinc-600 text-white">{fpBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reset Password'}</Button>
                  <div className="flex justify-between">
                    <button onClick={() => { setFpStep(1); setFpOtp(''); setError(''); }} className="text-sm text-zinc-500 hover:text-white flex items-center gap-1"><ArrowLeft className="w-3 h-3" /> Back</button>
                    {fpTimer > 0 ? <span className="text-sm text-zinc-600">Resend in {fpTimer}s</span> : <button onClick={handleFpSendOtp} className="text-sm text-sky-400 hover:text-sky-300">Resend code</button>}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
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
                      <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" /><Input id="login-id" type="text" value={loginId} onChange={(e) => setLoginId(e.target.value)} placeholder="you@example.com / +91... / @username" className="pl-9 bg-zinc-800 border-zinc-700 text-white" required /></div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-pw" className="text-zinc-300">Password</Label>
                      <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" /><Input id="login-pw" type="password" value={loginPw} onChange={(e) => setLoginPw(e.target.value)} placeholder="••••••••" className="pl-9 bg-zinc-800 border-zinc-700 text-white" required /></div>
                    </div>
                    <Button type="submit" disabled={loginBusy} className="w-full bg-zinc-700 hover:bg-zinc-600 text-white">{loginBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}</Button>
                    <button type="button" onClick={() => { setTab('forgot'); setError(''); }} className="w-full text-sm text-sky-400 hover:text-sky-300">Forgot password?</button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* REGISTER */}
            <TabsContent value="register">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white text-lg">{step === 1 ? 'Create Account' : step === 2 ? 'Verify' : 'Set Password'}</CardTitle>
                    <div className="flex items-center gap-1.5">{[1, 2, 3].map((s) => (<div key={s} className={`w-2 h-2 rounded-full transition-colors ${s <= step ? 'bg-sky-500' : 'bg-zinc-700'}`} />))}</div>
                  </div>
                </CardHeader>
                <CardContent>
                  {error && <div className="mb-4 text-sm text-rose-400 bg-rose-950/30 rounded-md p-2 border border-rose-900">{error}</div>}

                  {step === 1 && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="reg-name" className="text-zinc-300">Display Name</Label>
                        <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" /><Input id="reg-name" type="text" value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="Your name" className="pl-9 bg-zinc-800 border-zinc-700 text-white" /></div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reg-contact" className="text-zinc-300">Email or Phone</Label>
                        {/* Country code ALWAYS visible */}
                        <div className="flex gap-2">
                          <CountryCodeSelect value={countryCode} onChange={setCountryCode} />
                          <div className="relative flex-1">
                            {isEmail(regContact) ? <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" /> : <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />}
                            <Input id="reg-contact" type="text" value={regContact} onChange={(e) => setRegContact(e.target.value)} placeholder="Phone number or email" className="pl-9 bg-zinc-800 border-zinc-700 text-white" />
                          </div>
                        </div>
                      </div>
                      <Button onClick={handleSendOtp} disabled={regBusy} className="w-full bg-zinc-700 hover:bg-zinc-600 text-white gap-1.5">{regBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Get Code <ArrowRight className="w-4 h-4" /></>}</Button>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-4">
                      <p className="text-sm text-zinc-400 text-center">Enter the 6-digit code sent to<br /><span className="text-white font-medium">{getFullContact()}</span></p>
                      <div className="space-y-2">
                        <Label htmlFor="otp" className="text-zinc-300">Verification Code</Label>
                        <div className="relative"><KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" /><Input ref={otpInputRef} id="otp" type="text" inputMode="numeric" maxLength={6} value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))} placeholder="000000" className="pl-9 bg-zinc-800 border-zinc-700 text-white text-center text-2xl tracking-[0.5em] font-mono" /></div>
                      </div>
                      <Button onClick={handleVerifyOtp} disabled={regBusy || otpCode.length !== 6} className="w-full bg-zinc-700 hover:bg-zinc-600 text-white gap-1.5">{regBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Verify <Check className="w-4 h-4" /></>}</Button>
                      <div className="flex items-center justify-between">
                        <button onClick={() => { setStep(1); setOtpCode(''); setError(''); }} className="text-sm text-zinc-500 hover:text-white flex items-center gap-1"><ArrowLeft className="w-3 h-3" /> Back</button>
                        {otpTimer > 0 ? <span className="text-sm text-zinc-600">Resend in {otpTimer}s</span> : <button onClick={handleSendOtp} className="text-sm text-sky-400 hover:text-sky-300">Resend code</button>}
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <form onSubmit={handleRegister} className="space-y-4">
                      <div className="flex items-center justify-center w-12 h-12 mx-auto rounded-full bg-emerald-500/20"><Check className="w-6 h-6 text-emerald-400" /></div>
                      <p className="text-sm text-zinc-400 text-center">Verified! Set your password.</p>
                      <div className="space-y-2">
                        <Label htmlFor="reg-pw" className="text-zinc-300">Password</Label>
                        <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" /><Input id="reg-pw" type="password" value={regPw} onChange={(e) => setRegPw(e.target.value)} placeholder="Minimum 6 characters" className="pl-9 bg-zinc-800 border-zinc-700 text-white" required /></div>
                      </div>
                      <Button type="submit" disabled={regBusy} className="w-full bg-zinc-700 hover:bg-zinc-600 text-white">{regBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}</Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  )
}
