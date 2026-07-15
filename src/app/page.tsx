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

  if (view === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-rose-500 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          </div>
          <p className="text-sm text-muted-foreground">Loading Trust It…</p>
        </div>
      </div>
    )
  }

  if (view === 'auth') return <AuthScreen />
  if (view === 'setup-uid') return <UidSetupScreen />
  return <MainApp />
}
