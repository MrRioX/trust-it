import { createServer } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  // DO NOT change the path, it is used by Caddy to forward the request to the correct port
  path: '/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// userId -> socketIds (a user may have multiple tabs/devices)
const userSockets = new Map<string, Set<string>>()
// socketId -> userId
const socketUser = new Map<string, string>()

function joinRoom(a: string, b: string): string {
  return [a, b].sort().join('__')
}

io.on('connection', (socket) => {
  console.log(`[chat] socket connected: ${socket.id}`)

  // Client must authenticate after connecting by emitting 'auth' with their userId + token
  socket.on('auth', (data: { userId: string; token: string }) => {
    try {
      const { userId } = data
      if (!userId) {
        socket.emit('auth-error', { message: 'userId required' })
        return
      }
      // Remove old mapping if exists
      if (socketUser.has(socket.id)) {
        const oldUser = socketUser.get(socket.id)!
        userSockets.get(oldUser)?.delete(socket.id)
      }
      socketUser.set(socket.id, userId)
      if (!userSockets.has(userId)) userSockets.set(userId, new Set())
      userSockets.get(userId)!.add(socket.id)

      // Join a personal room so we can broadcast by userId
      socket.join(`user:${userId}`)
      socket.emit('auth-ok', { userId })

      // Broadcast online status to everyone (so friends can update presence)
      io.emit('presence', { userId, online: true })
      console.log(`[chat] user ${userId} authenticated (online)`)
    } catch (e) {
      console.error('[chat] auth error', e)
      socket.emit('auth-error', { message: 'auth failed' })
    }
  })

  // Send an encrypted message to a recipient
  socket.on(
    'send-message',
    (data: {
      roomId: string
      toUserId: string
      messageId: string
      encryptedData: string
      type: string
      mediaId?: string
      createdAt: string
    }) => {
      const fromUserId = socketUser.get(socket.id)
      if (!fromUserId) {
        socket.emit('error', { message: 'not authenticated' })
        return
      }
      const expectedRoom = joinRoom(fromUserId, data.toUserId)
      if (data.roomId !== expectedRoom) {
        socket.emit('error', { message: 'room mismatch' })
        return
      }
      // Deliver to recipient's personal room
      io.to(`user:${data.toUserId}`).emit('new-message', {
        id: data.messageId,
        roomId: data.roomId,
        senderId: fromUserId,
        encryptedData: data.encryptedData,
        type: data.type,
        mediaId: data.mediaId ?? null,
        createdAt: data.createdAt,
      })
      // Acknowledge sender
      socket.emit('message-sent', { messageId: data.messageId })
    }
  )

  // Typing indicator
  socket.on(
    'typing',
    (data: { toUserId: string; isTyping: boolean }) => {
      const fromUserId = socketUser.get(socket.id)
      if (!fromUserId) return
      io.to(`user:${data.toUserId}`).emit('typing', {
        fromUserId,
        isTyping: data.isTyping,
      })
    }
  )

  // Friend request notification
  socket.on(
    'notify-friend-request',
    (data: { toUserId: string; fromUserId: string; fromUid: string }) => {
      io.to(`user:${data.toUserId}`).emit('friend-request', {
        fromUserId: data.fromUserId,
        fromUid: data.fromUid,
      })
    }
  )

  // Friend request accepted notification
  socket.on(
    'notify-friend-accepted',
    (data: { toUserId: string; fromUserId: string; fromUid: string }) => {
      io.to(`user:${data.toUserId}`).emit('friend-accepted', {
        fromUserId: data.fromUserId,
        fromUid: data.fromUid,
      })
    }
  )

  // Message read receipts
  socket.on(
    'mark-read',
    (data: { toUserId: string; messageIds: string[]; seenAt: string }) => {
      const fromUserId = socketUser.get(socket.id)
      if (!fromUserId) return
      io.to(`user:${data.toUserId}`).emit('messages-read', {
        fromUserId,
        messageIds: data.messageIds,
        seenAt: data.seenAt,
      })
    }
  )

  // Emoji reaction on a message
  socket.on(
    'react-message',
    (data: { toUserId: string; messageId: string; emoji: string | null; reactionBy: string }) => {
      const fromUserId = socketUser.get(socket.id)
      if (!fromUserId) return
      io.to(`user:${data.toUserId}`).emit('message-reaction', {
        messageId: data.messageId,
        emoji: data.emoji,
        reactionBy: data.reactionBy,
      })
    }
  )

  socket.on('disconnect', () => {
    const userId = socketUser.get(socket.id)
    if (userId) {
      socketUser.delete(socket.id)
      const set = userSockets.get(userId)
      if (set) {
        set.delete(socket.id)
        if (set.size === 0) {
          userSockets.delete(userId)
          // User fully offline
          io.emit('presence', { userId, online: false })
          console.log(`[chat] user ${userId} went offline`)
        }
      }
    }
    console.log(`[chat] socket disconnected: ${socket.id}`)
  })

  socket.on('error', (error) => {
    console.error(`[chat] socket error (${socket.id}):`, error)
  })
})

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3003
httpServer.listen(PORT, () => {
  console.log(`[chat-service] WebSocket server running on port ${PORT}`)
})

process.on('SIGTERM', () => {
  console.log('[chat-service] SIGTERM, shutting down...')
  httpServer.close(() => process.exit(0))
})
process.on('SIGINT', () => {
  console.log('[chat-service] SIGINT, shutting down...')
  httpServer.close(() => process.exit(0))
})
