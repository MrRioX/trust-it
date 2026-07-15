# Trust It Chat Service

WebSocket service for real-time messaging.

## Deploy to Render.com

1. Push this folder to GitHub (inside your main repo)
2. Go to https://render.com → New → Web Service
3. Connect your GitHub repo
4. Settings:
   - Root Directory: `mini-services/chat-service`
   - Build Command: `npm install`
   - Start Command: `node index.js`
   - Plan: Free
5. Click "Create Web Service"
6. You get a URL like `https://trust-it-chat.onrender.com`

## Update the frontend

After deploying, update `src/store/app-store.ts`:
Change the socket connection from:
```
io('/?XTransformPort=3003', ...)
```
To:
```
io('https://trust-it-chat.onrender.com', ...)
```
