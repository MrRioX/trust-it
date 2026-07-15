'use client'

import { useApp } from '@/store/app-store'
import { Sidebar } from './sidebar'
import { ChatView } from './chat-view'
import { ProfileScreen } from './profile-screen'
import { SearchScreen } from './search-screen'
import { Button } from '@/components/ui/button'
import { MessageSquareLock, User as UserIcon, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

export function MainApp() {
  const {
    activeFriendId,
    friends,
    closeChat,
    mobileTab,
    setMobileTab,
  } = useApp()

  const activeFriend = friends.find((f) => f.id === activeFriendId)
  const showChatOnMobile = !!activeFriend

  return (
    <div className="h-[100dvh] w-full flex flex-col md:flex-row bg-zinc-950 overflow-hidden">
      {/* Sidebar — mobile: fills height above nav; desktop: fixed width column */}
      {(!showChatOnMobile && mobileTab === 'messages') && (
        <div className="flex-1 min-h-0 w-full md:w-[360px] lg:w-[400px] md:flex-none md:flex-shrink-0 border-r border-zinc-800 overflow-hidden">
          <Sidebar />
        </div>
      )}

      {/* Chat — mobile: full screen when active; desktop: fills remaining width */}
      <div
        className={cn(
          showChatOnMobile
            ? 'flex flex-1 flex-col min-h-0'
            : 'hidden md:flex md:flex-1 md:flex-col'
        )}
      >
        <ChatView
          key={activeFriendId ?? 'none'}
          onBack={closeChat}
        />
      </div>

      {/* Search screen — mobile only */}
      {mobileTab === 'search' && !showChatOnMobile && (
        <div className="flex-1 min-h-0 md:hidden overflow-y-auto bg-zinc-950">
          <SearchScreen onBack={() => setMobileTab('messages')} />
        </div>
      )}

      {/* Profile screen — mobile only */}
      {mobileTab === 'profile' && !showChatOnMobile && (
        <div className="flex-1 min-h-0 md:hidden overflow-y-auto bg-zinc-950">
          <ProfileScreen />
        </div>
      )}

      {/* Mobile bottom tab bar — PERMANENTLY at bottom */}
      {!showChatOnMobile && (
        <nav className="md:hidden border-t border-zinc-800 bg-zinc-900 safe-bottom flex z-30">
          <Button
            variant="ghost"
            onClick={() => setMobileTab('messages')}
            className={cn(
              'flex-1 rounded-none py-3 flex flex-col items-center gap-1 h-auto hover:bg-zinc-800',
              mobileTab === 'messages' ? 'text-fuchsia-500' : 'text-zinc-500'
            )}
          >
            <MessageSquareLock className="w-5 h-5" />
            <span className="text-[10px] font-medium">Messages</span>
          </Button>
          <Button
            variant="ghost"
            onClick={() => setMobileTab('search')}
            className={cn(
              'flex-1 rounded-none py-3 flex flex-col items-center gap-1 h-auto hover:bg-zinc-800',
              mobileTab === 'search' ? 'text-fuchsia-500' : 'text-zinc-500'
            )}
          >
            <Search className="w-5 h-5" />
            <span className="text-[10px] font-medium">Search</span>
          </Button>
          <Button
            variant="ghost"
            onClick={() => setMobileTab('profile')}
            className={cn(
              'flex-1 rounded-none py-3 flex flex-col items-center gap-1 h-auto hover:bg-zinc-800',
              mobileTab === 'profile' ? 'text-fuchsia-500' : 'text-zinc-500'
            )}
          >
            <UserIcon className="w-5 h-5" />
            <span className="text-[10px] font-medium">Profile</span>
          </Button>
        </nav>
      )}
    </div>
  )
}
