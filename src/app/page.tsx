'use client'

import { useEffect } from 'react'
import { useApp } from '@/store/app-store'
import { AuthScreen } from '@/components/app/auth-screen'
import { UidSetupScreen } from '@/components/app/uid-setup-screen'
import { MainApp } from '@/components/app/main-app'
import { Loader2 } from 'lucide-react'

export default function Home() {
  const { view, init } = useApp()

  useEffect(() => {
    init()
  }, [init])

  // Splash/loading screen
  if (view === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-zinc-700 to-zinc-900 border border-zinc-700 flex items-center justify-center mb-6 shadow-2xl">
          <span className="text-5xl font-black text-white" style={{ fontFamily: 'Arial Black, sans-serif' }}>T</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-4">Trust It</h1>
        <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
      </div>
    )
  }

  if (view === 'auth') return <AuthScreen />
  if (view === 'setup-uid') return <UidSetupScreen />
  return <MainApp />
}
