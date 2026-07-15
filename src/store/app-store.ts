'use client'

import { create } from 'zustand'
import { io, Socket } from 'socket.io-client'
import {
  generateKeyPair,
  storePrivateKeyLocally,
  loadPrivateKeyLocally,
  serializePublicKey,
  deserializePublicKey,
  getCachedRoomKey,
  clearRoomKeyCache,
  encryptText,
  decryptText,
  encryptBlob,
  decryptBlob,
  type KeyPairJWK,
} from '@/lib/crypto/e2e'

export type PublicUser = {
  id: string
  uid: string | null
  displayName: string | null
  avatarColor: string
  bio: string | null
  publicKey: string | null
  profileImageMediaId?: string | null
  lastSeen?: string | null
}

export type Friend = PublicUser & {
  roomId: string
  lastMessage?: { type: string; senderId: string; createdAt: string } | null
  background?: { bgType: string; bgValue: string }
}

export type IncomingRequest = {
  id: string
  from: PublicUser
  createdAt: string
}

export type OutgoingRequest = {
  id: string
  to: PublicUser
  createdAt: string
}

export type Message = {
  id: string
  roomId: string
  senderId: string
  encryptedData: string
  type: string // text | image | video
  mediaId: string | null
  seenAt?: string | null
  replyToId?: string | null
  replyToSnippet?: string | null
  replyToSender?: string | null
  reaction?: string | null
  reactionBy?: string | null
  createdAt: string
}

export type DecryptedMessage = Message & {
  decryptedText?: string
  decryptedMediaUrl?: string
  pending?: boolean
  error?: boolean
}

export type View = 'loading' | 'auth' | 'setup-uid' | 'main'

type ApiUser = {
  id: string
  email: string
  phone: string
  uid: string | null
  displayName: string | null
  avatarColor: string
  bio: string | null
  publicKey: string | null
  profileImageMediaId?: string | null
}

// Mobile bottom-tab navigation
export type MobileTab = 'messages' | 'search' | 'profile'

interface AppState {
  view: View
  user: ApiUser | null
  privateKey: JsonWebKey | null
  socket: Socket | null
  connected: boolean

  // Mobile navigation
  mobileTab: MobileTab
  setMobileTab: (tab: MobileTab) => void

  // Theme
  theme: 'dark' | 'light'
  toggleTheme: () => void

  friends: Friend[]
  incomingRequests: IncomingRequest[]
  outgoingRequests: OutgoingRequest[]
  activeFriendId: string | null
  messagesByRoom: Record<string, DecryptedMessage[]>
  onlineUsers: Set<string>
  typingUsers: Record<string, boolean> // friendId -> isTyping

  // Reply state (which message is being replied to in the composer)
  replyTo: DecryptedMessage | null
  setReplyTo: (msg: DecryptedMessage | null) => void

  // viewed profile cache (profileImageObjectUrls by user ID)
  profileImageUrls: Record<string, string>

  // init
  init: () => Promise<void>
  // auth
  register: (data: { email: string; phone: string; password: string; displayName?: string; uid?: string }) => Promise<boolean>
  login: (data: { identifier: string; password: string }) => Promise<boolean>
  logout: () => Promise<void>

  // uid + profile
  setUid: (uid: string) => Promise<boolean>
  updateProfile: (data: { displayName?: string; avatarColor?: string; bio?: string; profileImageMediaId?: string | null }) => Promise<void>
  uploadProfileImage: (file: File) => Promise<string | null> // returns mediaId or null
  getProfileImageUrl: (mediaId: string | null | undefined) => string | null

  // crypto setup
  ensureKeyPair: () => Promise<void>

  // friends
  refreshFriends: () => Promise<void>
  refreshRequests: () => Promise<void>
  searchByUid: (uid: string) => Promise<{ user: PublicUser; requestStatus: string | null } | { error: string }>
  sendFriendRequest: (toUserId: string) => Promise<{ ok: boolean; error?: string; autoAccepted?: boolean }>
  handleRequest: (requestId: string, action: 'accept' | 'decline') => Promise<boolean>

  // messages
  openChat: (friendId: string) => Promise<void>
  closeChat: () => void
  sendMessage: (text: string) => Promise<void>
  sendMedia: (file: File, hd?: boolean) => Promise<void>
  markMessagesSeen: (friendId: string) => Promise<void>
  reactToMessage: (messageId: string, emoji: string) => Promise<void>

  // background
  setBackground: (friendId: string, bgType: string, bgValue: string) => Promise<void>
  setCustomBackground: (friendId: string, file: File) => Promise<void>

  // socket helpers
  connectSocket: () => void
  disconnectSocket: () => void
}

function getRoomId(a: string, b: string): string {
  return [a, b].sort().join('__')
}

/** Safely parse JSON from a Response, handling empty/invalid bodies */
async function safeJson<T = any>(res: Response): Promise<T | null> {
  try {
    const text = await res.text()
    return text ? JSON.parse(text) : null
  } catch {
    return null
  }
}

/**
 * Resize an image File to max dimension using canvas, return a new File (JPEG).
 * Falls back to original file if it's already smaller or if resize fails.
 */
async function resizeImage(file: File, maxDim: number, quality: number): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file)
    let { width, height } = bitmap
    if (width <= maxDim && height <= maxDim) {
      // Already small enough
      return file
    }
    const scale = Math.min(maxDim / width, maxDim / height)
    width = Math.round(width * scale)
    height = Math.round(height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, width, height)
    const blob: Blob = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b as Blob), 'image/jpeg', quality)
    )
    bitmap.close()
    const name = (file.name.replace(/\.[^.]+$/, '') || 'image') + '.jpg'
    return new File([blob], name, { type: 'image/jpeg' })
  } catch (e) {
    console.warn('resizeImage failed, using original', e)
    return file
  }
}

export const useApp = create<AppState>((set, get) => ({
  view: 'loading',
  user: null,
  privateKey: null,
  socket: null,
  connected: false,
  mobileTab: 'messages',
  setMobileTab: (tab) => set({ mobileTab: tab }),
  theme: 'dark',
  toggleTheme: () => set((s) => {
    const next = s.theme === 'dark' ? 'light' : 'dark'
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', next === 'dark')
    }
    return { theme: next }
  }),
  friends: [],
  incomingRequests: [],
  outgoingRequests: [],
  activeFriendId: null,
  messagesByRoom: {},
  onlineUsers: new Set(),
  typingUsers: {},
  replyTo: null,
  setReplyTo: (msg) => set({ replyTo: msg }),
  profileImageUrls: {},

  init: async () => {
    try {
      // Apply dark theme on load
      if (typeof document !== 'undefined') {
        document.documentElement.classList.add('dark')
      }
      const res = await fetch('/api/auth/me')
      const text = await res.text()
      let data: any = null
      try {
        data = text ? JSON.parse(text) : null
      } catch {
        // Non-JSON response (e.g. 500 error with empty body)
      }
      if (!res.ok || !data?.user) {
        set({ view: 'auth' })
        return
      }
      // Update lastSeen on page load
      fetch('/api/users/lastseen', { method: 'POST' }).catch(() => {})
      const privateKey = loadPrivateKeyLocally()
      set({ user: data.user, privateKey })
      // If user has no UID set, go to setup. Otherwise main.
      if (!data.user.uid) {
        set({ view: 'setup-uid' })
      } else {
        set({ view: 'main' })
        // Make sure user has uploaded a public key
        await get().ensureKeyPair()
        // Connect socket + load data
        get().connectSocket()
        await Promise.all([get().refreshFriends(), get().refreshRequests()])
      }
    } catch (e) {
      console.error('init error', e)
      set({ view: 'auth' })
    }
  },

  register: async ({ email, phone, password, displayName, uid }) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phone, password, displayName, uid }),
      })
      const text = await res.text()
      let data: any = null
      try { data = text ? JSON.parse(text) : null } catch {}
      if (!res.ok || !data?.user) {
        alert(data?.error || 'Registration failed')
        return false
      }
      set({ user: data.user })
      // If user registered with UID, go straight to main
      if (data.user.uid) {
        set({ view: 'main' })
        await get().ensureKeyPair()
        get().connectSocket()
        await Promise.all([get().refreshFriends(), get().refreshRequests()])
      } else {
        // No UID set → go to setup
        set({ view: 'setup-uid' })
      }
      return true
    } catch (e) {
      console.error('register error', e)
      return false
    }
  },

  login: async ({ identifier, password }) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      })
      const text = await res.text()
      let data: any = null
      try { data = text ? JSON.parse(text) : null } catch {}
      if (!res.ok || !data?.user) {
        alert(data?.error || 'Login failed')
        return false
      }
      set({ user: data.user })
      if (!data.user.uid) {
        set({ view: 'setup-uid' })
      } else {
        set({ view: 'main' })
        await get().ensureKeyPair()
        get().connectSocket()
        await Promise.all([get().refreshFriends(), get().refreshRequests()])
      }
      return true
    } catch (e) {
      console.error('login error', e)
      return false
    }
  },

  logout: async () => {
    try {
      await fetch('/api/auth/me', { method: 'DELETE' })
    } catch {}
    get().disconnectSocket()
    clearRoomKeyCache()
    set({
      view: 'auth',
      user: null,
      privateKey: null,
      friends: [],
      incomingRequests: [],
      outgoingRequests: [],
      activeFriendId: null,
      messagesByRoom: {},
      onlineUsers: new Set(),
      typingUsers: {},
      mobileTab: 'messages',
      profileImageUrls: {},
    })
  },

  setUid: async (uid) => {
    const res = await fetch('/api/users/uid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid }),
    })
    const data = await safeJson(res)
    if (!res.ok) {
      alert(data.error || 'Failed to set UID')
      return false
    }
    set({ user: data.user })
    // Make sure key pair is set up before entering main
    await get().ensureKeyPair()
    set({ view: 'main' })
    get().connectSocket()
    await Promise.all([get().refreshFriends(), get().refreshRequests()])
    return true
  },

  updateProfile: async ({ displayName, avatarColor, bio, profileImageMediaId }) => {
    const res = await fetch('/api/users/uid', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName, avatarColor, bio, profileImageMediaId }),
    })
    const data = await safeJson(res)
    if (res.ok && data.user) {
      set({ user: data.user })
      // Update friends list with new info
      await get().refreshFriends()
    }
  },

  uploadProfileImage: async (file) => {
    const { user } = get()
    if (!user) return null
    try {
      // Resize profile image to 512x512 max, JPEG 0.85
      const resized = await resizeImage(file, 512, 0.85)
      const formData = new FormData()
      formData.append('file', resized, resized.name)
      formData.append('kind', 'profile')
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await safeJson(res)
      if (!res.ok) {
        alert(data.error || 'Profile image upload failed')
        return null
      }
      return data.mediaId as string
    } catch (e) {
      console.error('uploadProfileImage error', e)
      return null
    }
  },

  getProfileImageUrl: (mediaId) => {
    if (!mediaId) return null
    const cached = get().profileImageUrls[mediaId]
    if (cached) return cached
    // Kick off async fetch + cache; return null for now (component will re-render when state updates)
    ;(async () => {
      try {
        const res = await fetch(`/api/media/${mediaId}`)
        if (!res.ok) return
        const buf = await res.arrayBuffer()
        const url = URL.createObjectURL(new Blob([buf]))
        set((state) => ({
          profileImageUrls: { ...state.profileImageUrls, [mediaId]: url },
        }))
      } catch (e) {
        console.error('getProfileImageUrl fetch error', e)
      }
    })()
    return null
  },

  ensureKeyPair: async () => {
    const { user, privateKey } = get()
    if (!user) return
    // If we have a private key locally and user already has a public key on server, we are good
    if (privateKey && user.publicKey) return

    let jwk: KeyPairJWK
    if (privateKey) {
      // We have private but server doesn't have public — re-derive public? Easier: regenerate.
      // To keep things simple, regenerate and re-upload.
      jwk = await generateKeyPair()
    } else {
      jwk = await generateKeyPair()
    }
    storePrivateKeyLocally(jwk.privateKey)
    set({ privateKey: jwk.privateKey })
    const pub = serializePublicKey(jwk.publicKey)
    // Upload public key
    await fetch('/api/users/uid', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicKey: pub }),
    })
    set({ user: { ...user, publicKey: pub } })
  },

  refreshFriends: async () => {
    const res = await fetch('/api/chats')
    const data = await safeJson(res)
    if (res.ok && data.chats) {
      set({ friends: data.chats as Friend[] })
    }
  },

  refreshRequests: async () => {
    const res = await fetch('/api/friends/requests')
    const data = await safeJson(res)
    if (res.ok) {
      set({
        incomingRequests: data.incoming as IncomingRequest[],
        outgoingRequests: data.outgoing as OutgoingRequest[],
      })
    }
  },

  searchByUid: async (uid) => {
    const res = await fetch(`/api/users/search?uid=${encodeURIComponent(uid)}`)
    const data = await safeJson(res)
    if (!res.ok) return { error: data.error || 'Search failed' }
    return { user: data.user as PublicUser, requestStatus: data.requestStatus }
  },

  sendFriendRequest: async (toUserId) => {
    const res = await fetch('/api/friends/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toUserId }),
    })
    const data = await safeJson(res)
    if (!res.ok) return { ok: false, error: data.error || 'Failed to send request' }
    // Notify via socket
    const { socket, user } = get()
    if (socket && user?.uid) {
      socket.emit('notify-friend-request', { toUserId, fromUserId: user.id, fromUid: user.uid })
    }
    if (data.autoAccepted) {
      await get().refreshFriends()
    }
    await get().refreshRequests()
    return { ok: true, autoAccepted: data.autoAccepted }
  },

  handleRequest: async (requestId, action) => {
    const res = await fetch('/api/friends/handle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, action }),
    })
    if (!res.ok) return false
    // Notify via socket
    const { socket, user } = get()
    const req = get().incomingRequests.find((r) => r.id === requestId)
    if (socket && user?.uid && req && action === 'accept') {
      socket.emit('notify-friend-accepted', {
        toUserId: req.from.id,
        fromUserId: user.id,
        fromUid: user.uid,
      })
    }
    await Promise.all([get().refreshFriends(), get().refreshRequests()])
    return true
  },

  openChat: async (friendId) => {
    set({ activeFriendId: friendId })
    if (!friendId) return
    const { user, friends } = get()
    if (!user) return
    const friend = friends.find((f) => f.id === friendId)
    if (!friend) return
    const roomId = friend.roomId
    if (get().messagesByRoom[roomId]) return // already loaded

    // Fetch messages
    const res = await fetch(`/api/messages?friendId=${encodeURIComponent(friendId)}`)
    const data = await safeJson(res)
    if (!res.ok) return

    const msgs: DecryptedMessage[] = data.messages as Message[]
    // Decrypt each
    if (!user.publicKey || !friend.publicKey) {
      // We need both public keys for E2E
      set((state) => ({
        messagesByRoom: { ...state.messagesByRoom, [roomId]: msgs.map((m) => ({ ...m, pending: true })) },
      }))
      return
    }
    const privateKey = get().privateKey!
    const myJwk = privateKey
    const theirJwk = deserializePublicKey(friend.publicKey)!
    const key = await getCachedRoomKey(roomId, myJwk, theirJwk)

    const decrypted: DecryptedMessage[] = []
    for (const m of msgs) {
      try {
        if (m.type === 'text') {
          const text = await decryptText(key, m.encryptedData)
          decrypted.push({ ...m, decryptedText: text })
        } else if (m.type === 'image' || m.type === 'video') {
          // Fetch encrypted media
          if (m.mediaId) {
            const mediaRes = await fetch(`/api/media/${m.mediaId}`)
            if (mediaRes.ok) {
              const buf = await mediaRes.arrayBuffer()
              const plain = await decryptBlob(key, buf)
              const blobUrl = URL.createObjectURL(new Blob([plain]))
              decrypted.push({ ...m, decryptedMediaUrl: blobUrl })
            } else {
              decrypted.push({ ...m, error: true })
            }
          } else {
            decrypted.push({ ...m, error: true })
          }
        } else {
          decrypted.push({ ...m })
        }
      } catch (e) {
        // Decryption fails for old messages encrypted with a previous keypair
        // (e.g. after clearing browser data). This is expected — just mark as error.
        decrypted.push({ ...m, error: true })
      }
    }
    set((state) => ({
      messagesByRoom: { ...state.messagesByRoom, [roomId]: decrypted },
    }))

    // Mark incoming (from friend) unseen messages as seen now
    get().markMessagesSeen(friendId)
  },

  closeChat: () => {
    set({ activeFriendId: null, replyTo: null })
  },

  markMessagesSeen: async (friendId) => {
    const { user, friends, socket, messagesByRoom } = get()
    if (!user) return
    const friend = friends.find((f) => f.id === friendId)
    if (!friend) return
    const roomId = friend.roomId
    const list = messagesByRoom[roomId] ?? []
    const unseen = list.filter((m) => m.senderId === friendId && !m.seenAt)
    if (unseen.length === 0) return
    const messageIds = unseen.map((m) => m.id)
    try {
      const res = await fetch('/api/messages/seen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendId, messageIds }),
      })
      const data = await safeJson(res)
      if (!res.ok) return
      const seenAt = data.seenAt as string
      // Update local state
      set((state) => {
        const cur = state.messagesByRoom[roomId] ?? []
        return {
          messagesByRoom: {
            ...state.messagesByRoom,
            [roomId]: cur.map((m) =>
              messageIds.includes(m.id) ? { ...m, seenAt } : m
            ),
          },
        }
      })
      // Notify sender via socket (if available)
      if (socket) {
        socket.emit('mark-read', { toUserId: friendId, messageIds, seenAt })
      }
    } catch (e) {
      console.error('markMessagesSeen error', e)
    }
  },

  reactToMessage: async (messageId, emoji) => {
    const { user, friends, socket, activeFriendId, messagesByRoom } = get()
    if (!user || !activeFriendId) return
    const friend = friends.find((f) => f.id === activeFriendId)
    if (!friend) return
    const roomId = friend.roomId

    // Optimistic update
    const currentMsg = (messagesByRoom[roomId] ?? []).find((m) => m.id === messageId)
    const isSameReaction = currentMsg?.reaction === emoji && currentMsg?.reactionBy === user.id
    const newEmoji = isSameReaction ? null : emoji

    set((state) => {
      const list = state.messagesByRoom[roomId] ?? []
      return {
        messagesByRoom: {
          ...state.messagesByRoom,
          [roomId]: list.map((m) =>
            m.id === messageId
              ? { ...m, reaction: newEmoji, reactionBy: newEmoji ? user.id : null }
              : m
          ),
        },
      }
    })

    try {
      const res = await fetch('/api/messages/react', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, emoji }),
      })
      // Safely parse JSON — handle empty responses
      let data: any = null
      const text = await res.text()
      if (text) {
        try {
          data = JSON.parse(text)
        } catch {
          // Non-JSON response, ignore
        }
      }
      if (!res.ok) {
        console.error('react API error:', data?.error || res.status)
        return
      }

      // Notify via socket (if available)
      if (socket) {
        socket.emit('react-message', {
          toUserId: friend.id,
          messageId,
          emoji: data?.reaction ?? newEmoji,
          reactionBy: user.id,
        })
      }
    } catch (e) {
      console.error('reactToMessage error', e)
    }
  },

  sendMessage: async (text) => {
    const { user, privateKey, friends, activeFriendId, socket, replyTo } = get()
    if (!user || !privateKey || !activeFriendId || !socket) return
    const friend = friends.find((f) => f.id === activeFriendId)
    if (!friend || !friend.publicKey) {
      alert('Friend has not set up encryption yet')
      return
    }
    const roomId = friend.roomId
    const key = await getCachedRoomKey(roomId, privateKey, deserializePublicKey(friend.publicKey)!)
    const encryptedData = await encryptText(key, text)
    const createdAt = new Date().toISOString()
    const tempId = `temp-${Date.now()}`

    // Build reply fields if replying
    let replyToId: string | null = null
    let replyToSnippet: string | null = null
    let replyToSender: string | null = null
    if (replyTo) {
      replyToId = replyTo.id
      replyToSender = replyTo.senderId
      // Snippet is the decrypted text or media marker (re-encrypted as part of the message)
      if (replyTo.type === 'text') {
        replyToSnippet = (replyTo.decryptedText || '').slice(0, 80)
      } else if (replyTo.type === 'image') {
        replyToSnippet = '📷 Photo'
      } else if (replyTo.type === 'video') {
        replyToSnippet = '🎬 Video'
      }
    }

    // Optimistic message
    const optimistic: DecryptedMessage = {
      id: tempId,
      roomId,
      senderId: user.id,
      encryptedData,
      type: 'text',
      mediaId: null,
      createdAt,
      decryptedText: text,
      pending: true,
      replyToId,
      replyToSnippet,
      replyToSender,
    }
    set((state) => ({
      messagesByRoom: {
        ...state.messagesByRoom,
        [roomId]: [...(state.messagesByRoom[roomId] ?? []), optimistic],
      },
      replyTo: null, // clear reply state
    }))

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toUserId: friend.id,
          encryptedData,
          type: 'text',
          replyToId,
          replyToSnippet,
          replyToSender,
        }),
      })
      const data = await safeJson(res)
      if (!res.ok) throw new Error(data.error || 'send failed')

      // Notify via socket
      socket.emit('send-message', {
        roomId,
        toUserId: friend.id,
        messageId: data.message.id,
        encryptedData,
        type: 'text',
        replyToId,
        replyToSnippet,
        replyToSender,
        createdAt: data.message.createdAt,
      })

      // Replace optimistic message with real one
      set((state) => {
        const list = state.messagesByRoom[roomId] ?? []
        return {
          messagesByRoom: {
            ...state.messagesByRoom,
            [roomId]: list.map((m) =>
              m.id === tempId ? { ...data.message, decryptedText: text } : m
            ),
          },
        }
      })
    } catch (e) {
      console.error('sendMessage error', e)
      // Mark as error
      set((state) => {
        const list = state.messagesByRoom[roomId] ?? []
        return {
          messagesByRoom: {
            ...state.messagesByRoom,
            [roomId]: list.map((m) => (m.id === tempId ? { ...m, pending: false, error: true } : m)),
          },
        }
      })
    }
  },

  sendMedia: async (file, hd = false) => {
    const { user, privateKey, friends, activeFriendId, socket } = get()
    if (!user || !privateKey || !activeFriendId || !socket) return
    const friend = friends.find((f) => f.id === activeFriendId)
    if (!friend || !friend.publicKey) {
      alert('Friend has not set up encryption yet')
      return
    }
    const roomId = friend.roomId
    const key = await getCachedRoomKey(roomId, privateKey, deserializePublicKey(friend.publicKey)!)

    // Determine type
    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')
    if (!isImage && !isVideo) {
      alert('Only images and videos are supported')
      return
    }
    const type = isImage ? 'image' : 'video'

    // For images: resize based on HD flag (HD = 2048px max, normal = 1024px max, JPEG 0.85/0.75)
    let processedFile = file
    if (isImage) {
      const maxDim = hd ? 2048 : 1024
      const quality = hd ? 0.9 : 0.72
      processedFile = await resizeImage(file, maxDim, quality)
    }

    // Read + encrypt file
    const buf = await processedFile.arrayBuffer()
    const encrypted = await encryptBlob(key, buf)
    const encryptedBlob = new Blob([encrypted], { type: 'application/octet-stream' })

    // Upload
    const formData = new FormData()
    formData.append('file', encryptedBlob, processedFile.name || file.name)
    formData.append('toUserId', friend.id)
    formData.append('kind', 'message')
    const upRes = await fetch('/api/upload', { method: 'POST', body: formData })
    const upData = await safeJson(upRes)
    if (!upRes.ok) {
      alert(upData.error || 'Upload failed')
      return
    }
    const mediaId = upData.mediaId as string

    // Create a placeholder encryptedData (just the IV used for the media, for traceability)
    // The actual media is decrypted by fetching the blob, so encryptedData here is just a marker
    const encryptedData = await encryptText(key, `media:${mediaId}`)
    const createdAt = new Date().toISOString()
    const tempId = `temp-${Date.now()}`

    // Optimistic message with a local object URL of the *unencrypted* file
    const localUrl = URL.createObjectURL(processedFile)
    const optimistic: DecryptedMessage = {
      id: tempId,
      roomId,
      senderId: user.id,
      encryptedData,
      type,
      mediaId,
      createdAt,
      decryptedMediaUrl: localUrl,
      pending: true,
    }
    set((state) => ({
      messagesByRoom: {
        ...state.messagesByRoom,
        [roomId]: [...(state.messagesByRoom[roomId] ?? []), optimistic],
      },
    }))

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toUserId: friend.id, encryptedData, type, mediaId }),
      })
      const data = await safeJson(res)
      if (!res.ok) throw new Error(data.error || 'send failed')

      socket.emit('send-message', {
        roomId,
        toUserId: friend.id,
        messageId: data.message.id,
        encryptedData,
        type,
        mediaId,
        createdAt: data.message.createdAt,
      })

      set((state) => {
        const list = state.messagesByRoom[roomId] ?? []
        return {
          messagesByRoom: {
            ...state.messagesByRoom,
            [roomId]: list.map((m) =>
              m.id === tempId ? { ...data.message, decryptedMediaUrl: localUrl } : m
            ),
          },
        }
      })
    } catch (e) {
      console.error('sendMedia error', e)
      set((state) => {
        const list = state.messagesByRoom[roomId] ?? []
        return {
          messagesByRoom: {
            ...state.messagesByRoom,
            [roomId]: list.map((m) => (m.id === tempId ? { ...m, pending: false, error: true } : m)),
          },
        }
      })
    }
  },

  setBackground: async (friendId, bgType, bgValue) => {
    const res = await fetch('/api/background', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ friendId, bgType, bgValue }),
    })
    if (!res.ok) return
    await get().refreshFriends()
  },

  setCustomBackground: async (friendId, file) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('friendId', friendId)
    const res = await fetch('/api/background/custom', { method: 'POST', body: formData })
    if (!res.ok) {
      const data = await safeJson(res).catch(() => ({}))
      alert(data.error || 'Failed to set custom background')
      return
    }
    await get().refreshFriends()
  },

  connectSocket: () => {
    const { socket, user } = get()
    if (socket || !user) return

    // Use NEXT_PUBLIC_SOCKET_URL for production (Render URL)
    // Falls back to local dev proxy for development
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || ''
    const isLocalDev = !socketUrl

    const s = io(isLocalDev ? '/?XTransformPort=3003' : socketUrl, {
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
      timeout: 15000,
    })

    s.on('connect', () => {
      set({ connected: true })
      s.emit('auth', { userId: user.id, token: 'session' })
    })
    s.on('disconnect', () => {
      set({ connected: false })
    })
    s.on('auth-ok', () => {
      // Update my lastSeen on the server on connect
      fetch('/api/users/lastseen', { method: 'POST' }).catch(() => {})
      // Update lastSeen every 10 seconds for high precision
      if (typeof window !== 'undefined') {
        const interval = setInterval(() => {
          fetch('/api/users/lastseen', { method: 'POST' }).catch(() => {})
        }, 10000)
        const handleVisibilityChange = () => {
          if (document.hidden) fetch('/api/users/lastseen', { method: 'POST' }).catch(() => {})
        }
        const handleBeforeUnload = () => {
          fetch('/api/users/lastseen', { method: 'POST' }).catch(() => {})
        }
        document.addEventListener('visibilitychange', handleVisibilityChange)
        window.addEventListener('beforeunload', handleBeforeUnload)
        s.on('disconnect', () => clearInterval(interval))
      }
    })

    s.on('presence', ({ userId, online }: { userId: string; online: boolean }) => {
      set((state) => {
        const next = new Set(state.onlineUsers)
        if (online) next.add(userId)
        else next.delete(userId)
        return { onlineUsers: next }
      })
    })

    s.on('new-message', async (msg: Message) => {
      const { user, privateKey, friends, activeFriendId } = get()
      if (!user || !privateKey) return
      const friend = friends.find((f) => f.roomId === msg.roomId)
      if (!friend) return

      const key = await getCachedRoomKey(msg.roomId, privateKey, deserializePublicKey(friend.publicKey)!)
      let decryptedText: string | undefined
      let decryptedMediaUrl: string | undefined
      try {
        if (msg.type === 'text') {
          decryptedText = await decryptText(key, msg.encryptedData)
        } else if (msg.type === 'image' || msg.type === 'video') {
          if (msg.mediaId) {
            const mediaRes = await fetch(`/api/media/${msg.mediaId}`)
            if (mediaRes.ok) {
              const buf = await mediaRes.arrayBuffer()
              const plain = await decryptBlob(key, buf)
              decryptedMediaUrl = URL.createObjectURL(new Blob([plain]))
            }
          }
        }
      } catch (e) {
        // Decryption fails for old messages encrypted with a previous keypair.
        // This is expected — the message will show as "Failed to decrypt".
      }
      const decrypted: DecryptedMessage = {
        ...msg,
        decryptedText,
        decryptedMediaUrl,
        replyToId: (msg as any).replyToId ?? null,
        replyToSnippet: (msg as any).replyToSnippet ?? null,
        replyToSender: (msg as any).replyToSender ?? null,
      }
      set((state) => ({
        messagesByRoom: {
          ...state.messagesByRoom,
          [msg.roomId]: [...(state.messagesByRoom[msg.roomId] ?? []), decrypted],
        },
      }))
      // If chat is active, mark as seen
      if (activeFriendId === friend.id) {
        get().markMessagesSeen(friend.id)
      } else {
        await get().refreshFriends()
      }
    })

    s.on('typing', ({ fromUserId, isTyping }: { fromUserId: string; isTyping: boolean }) => {
      set((state) => ({
        typingUsers: { ...state.typingUsers, [fromUserId]: isTyping },
      }))
      // Clear typing after 3s if true
      if (isTyping) {
        setTimeout(() => {
          if (get().typingUsers[fromUserId]) {
            set((state) => ({
              typingUsers: { ...state.typingUsers, [fromUserId]: false },
            }))
          }
        }, 3000)
      }
    })

    s.on('friend-request', async () => {
      await get().refreshRequests()
    })

    s.on('friend-accepted', async () => {
      await Promise.all([get().refreshFriends(), get().refreshRequests()])
    })

    // Messages were marked as seen by the recipient — update local state
    s.on('messages-read', ({ fromUserId, messageIds, seenAt }: { fromUserId: string; messageIds: string[]; seenAt: string }) => {
      // fromUserId is the person who SAW the messages (the recipient of MY messages)
      // Find the room
      const { user, friends } = get()
      if (!user) return
      const friend = friends.find((f) => f.id === fromUserId)
      if (!friend) return
      const roomId = friend.roomId
      set((state) => {
        const list = state.messagesByRoom[roomId] ?? []
        return {
          messagesByRoom: {
            ...state.messagesByRoom,
            [roomId]: list.map((m) =>
              messageIds.includes(m.id) ? { ...m, seenAt } : m
            ),
          },
        }
      })
    })

    // Message reaction — update local state
    s.on('message-reaction', ({ messageId, emoji, reactionBy }: { messageId: string; emoji: string | null; reactionBy: string }) => {
      const { friends } = get()
      // Find the room that contains this message
      for (const friend of friends) {
        const list = get().messagesByRoom[friend.roomId]
        if (list && list.some((m) => m.id === messageId)) {
          set((state) => {
            const cur = state.messagesByRoom[friend.roomId] ?? []
            return {
              messagesByRoom: {
                ...state.messagesByRoom,
                [friend.roomId]: cur.map((m) =>
                  m.id === messageId
                    ? { ...m, reaction: emoji, reactionBy: emoji ? reactionBy : null }
                    : m
                ),
              },
            }
          })
          break
        }
      }
    })

    set({ socket: s })
  },

  disconnectSocket: () => {
    const { socket } = get()
    if (socket) {
      socket.disconnect()
      set({ socket: null, connected: false })
    }
  },
}))
