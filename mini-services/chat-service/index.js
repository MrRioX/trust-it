const { createServer } = require('http')
const { Server } = require('socket.io')

const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

const userSockets = new Map()
const socketUser = new Map()

function joinRoom(a, b) {
  return [a, b].sort().join('__')
}

io.on('connection', (socket) => {
  console.log(`[chat] socket connected: ${socket.id}`)

  socket.on('auth', (data) => {
    try {
      const { userId } = data
      if (!userId) {
        socket.emit('auth-error', { message: 'userId required' })
        return
      }
      if (socketUser.has(socket.id)) {
        const oldUser = socketUser.get(socket.id)
        userSockets.get(oldUser)?.delete(socket.id)
      }
      socketUser.set(socket.id, userId)
      if (!userSockets.has(userId)) userSockets.set(userId, new Set())
      userSockets.get(userId).add(socket.id)

      socket.join(`user:${userId}`)
      socket.emit('auth-ok', { userId })
      io.emit('presence', { userId, online: true })
      console.log(`[chat] user ${userId} authenticated (online)`)
    } catch (e) {
      console.error('[chat] auth error', e)
      socket.emit('auth-error', { message: 'auth failed' })
    }
  })

  socket.on('send-message', (data) => {
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
    io.to(`user:${data.toUserId}`).emit('new-message', {
      id: data.messageId,
      roomId: data.roomId,
      senderId: fromUserId,
      encryptedData: data.encryptedData,
      type: data.type,
      mediaId: data.mediaId ?? null,
      replyToId: data.replyToId ?? null,
      replyToSnippet: data.replyToSnippet ?? null,
      replyToSender: data.replyToSender ?? null,
      createdAt: data.createdAt,
    })
    socket.emit('message-sent', { messageId: data.messageId })
  })

  socket.on('typing', (data) => {
    const fromUserId = socketUser.get(socket.id)
    if (!fromUserId) return
    io.to(`user:${data.toUserId}`).emit('typing', {
      fromUserId,
      isTyping: data.isTyping,
    })
  })

  socket.on('notify-friend-request', (data) => {
    io.to(`user:${data.toUserId}`).emit('friend-request', {
      fromUserId: data.fromUserId,
      fromUid: data.fromUid,
    })
  })

  socket.on('notify-friend-accepted', (data) => {
    io.to(`user:${data.toUserId}`).emit('friend-accepted', {
      fromUserId: data.fromUserId,
      fromUid: data.fromUid,
    })
  })

  socket.on('mark-read', (data) => {
    const fromUserId = socketUser.get(socket.id)
    if (!fromUserId) return
    io.to(`user:${data.toUserId}`).emit('messages-read', {
      fromUserId,
      messageIds: data.messageIds,
      seenAt: data.seenAt,
    })
  })

  socket.on('react-message', (data) => {
    const fromUserId = socketUser.get(socket.id)
    if (!fromUserId) return
    io.to(`user:${data.toUserId}`).emit('message-reaction', {
      messageId: data.messageId,
      emoji: data.emoji,
      reactionBy: data.reactionBy,
    })
  })

  socket.on('disconnect', () => {
    const userId = socketUser.get(socket.id)
    if (userId) {
      socketUser.delete(socket.id)
      const set = userSockets.get(userId)
      if (set) {
        set.delete(socket.id)
        if (set.size === 0) {
          userSockets.delete(userId)
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
