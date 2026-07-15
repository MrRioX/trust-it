# Trust It Database & Deployment Guide

This guide explains **where your data is stored right now**, **how to access it**, and **how to deploy the app with your own cloud database** when you're ready to publish.

---

## 📍 Where is the data stored right now?

While you're developing in this sandbox:

| Data type | Location | Format |
|-----------|----------|--------|
| **User accounts** (email, phone, password hash, UID, bio, avatar color, public ECDH key, profile image ID) | `/home/z/my-project/db/custom.db` | SQLite database |
| **Friend requests** (pending/accepted/declined) | `/home/z/my-project/db/custom.db` | SQLite database |
| **Messages** (encrypted text + media references + seen timestamps + reply metadata) | `/home/z/my-project/db/custom.db` | SQLite database |
| **Chat background customizations** | `/home/z/my-project/db/custom.db` | SQLite database |
| **Encrypted media files** (profile images + message images/videos) | `/home/z/my-project/uploads/` | Encrypted binary blobs + `.meta.json` sidecars |
| **User private keys** | Each user's browser `localStorage` | Never sent to server — **only the user can read their messages** |

> 🔒 **Security note**: The database only contains **encrypted** message content and **public** encryption keys. Even if someone steals the entire database + all uploaded files, they cannot decrypt any message or media without the users' private keys (which live only in their browsers).

---

## 🔍 How to access the database right now

### Option 1: Prisma Studio (web GUI — easiest)

```bash
cd /home/z/my-project
bunx prisma studio
```

Opens a web UI at `http://localhost:5555` where you can browse and edit all 4 tables.

### Option 2: sqlite3 CLI

```bash
sqlite3 /home/z/my-project/db/custom.db

# Inside sqlite3:
.tables                                    # list all tables
.schema User                               # see table structure
SELECT id, email, uid, displayName FROM User;
SELECT id, roomId, type, seenAt FROM Message ORDER BY createdAt DESC LIMIT 10;
.quit
```

### Option 3: Copy the database file

The database is a single file — just copy it anywhere:

```bash
cp /home/z/my-project/db/custom.db ~/my-backup.db
```

You can open this file with any SQLite tool (e.g. [DB Browser for SQLite](https://sqlitebrowser.org)) on your own computer.

---

## 🚀 How to deploy the app with your own cloud database

When you're ready to publish the app so anyone can use it from their phone, follow these steps.

### Step 1: Choose a cloud database (free options)

Pick one of these free cloud PostgreSQL providers:

| Provider | Free tier | Why choose it |
|----------|-----------|---------------|
| **[Supabase](https://supabase.com/database)** | 500 MB storage, 2 projects | Easiest — includes web dashboard + auto backups |
| **[Neon](https://neon.tech)** | 3 GB storage, serverless | Best for sparse usage — scales to zero when idle |
| **[Railway](https://railway.app)** | $5 free credit/month | Simple, includes both database + app hosting |
| **[Render](https://render.com)** | 90 days free PostgreSQL | Generous free tier with auto backups |

> 💡 **Recommendation**: Start with **Supabase** — it's the easiest and has the best free tier for a chat app.

### Step 2: Create a database and get the connection string

1. Sign up at [supabase.com](https://supabase.com) (free, no credit card needed)
2. Click **New Project** → name it `trust-it` → pick a strong database password
3. Wait ~2 minutes for the project to provision
4. Go to **Project Settings → Database → Connection string → URI**
5. Copy the connection string. It looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
6. Replace `[YOUR-PASSWORD]` with the password you set in step 2.

### Step 3: Update the Prisma schema

Edit `/home/z/my-project/prisma/schema.prisma` — change **one line**:

```prisma
datasource db {
  provider = "postgresql"    // ← was "sqlite"
  url      = env("DATABASE_URL")
}
```

### Step 4: Set the DATABASE_URL environment variable

Create or edit `/home/z/my-project/.env`:

```env
DATABASE_URL="postgresql://postgres:YOUR_ACTUAL_PASSWORD@db.yourproject.supabase.co:5432/postgres"
SESSION_SECRET="generate-a-random-32-char-string-here"
```

> ⚠️ **Important**: Never commit `.env` to git. The `.gitignore` file already excludes it.

### Step 5: Push the schema to your new cloud database

```bash
cd /home/z/my-project
bun run db:push
```

This creates all 4 tables (User, FriendRequest, Message, ChatBackground) in your Supabase database.

### Step 6: Deploy the app to a hosting provider

Pick one of these hosting options:

#### Option A: Vercel (recommended — free, easiest)

1. Push your code to a GitHub repository
2. Go to [vercel.com](https://vercel.com) → **New Project** → import your repo
3. Add environment variables in the Vercel dashboard:
   - `DATABASE_URL` = your Supabase connection string
   - `SESSION_SECRET` = your random secret
4. Click **Deploy** — Vercel builds and hosts the app
5. You get a URL like `https://trust-it.vercel.app` — share this with your friends!

#### Option B: Railway (includes both database + app)

1. Go to [railway.app](https://railway.app) → **New Project**
2. Add a PostgreSQL database (Railway creates it for you)
3. Add your GitHub repo as a service
4. Railway auto-detects Next.js and deploys it
5. Set the `DATABASE_URL` env var to the Railway-provided PostgreSQL URL

#### Option C: Self-host on your own VPS (DigitalOcean, Hetzner, etc.)

```bash
# On your VPS:
git clone your-repo
cd trust-it
cp .env.example .env  # edit with your values
bun install
bun run build
bun run start

# Use nginx + Let's Encrypt for HTTPS
# Use systemd to keep the app running
```

### Step 7: Update the chat-service (WebSocket) for production

The WebSocket mini-service needs to be hosted too. Options:

- **Vercel doesn't support WebSocket servers** — use a separate host for the chat-service
- **Recommended**: Deploy the chat-service to [Render](https://render.com) or [Railway](https://railway.app) as a separate Node.js service
- Update `src/store/app-store.ts` — change the socket connection URL from `/?XTransformPort=3003` to your hosted chat-service URL

### Step 8: Install on your phone

Once deployed, open your app URL on your phone:
- **Android**: Open in Chrome → ⋮ menu → "Install app"
- **iPhone**: Open in Safari → Share → "Add to Home Screen"

The app icon appears on your home screen. Users who sign up will have their data stored in **your** cloud database.

---

## 🔄 How to migrate data from sandbox to your cloud database

If you want to keep the test users/messages you've already created:

### Export from SQLite

```bash
sqlite3 /home/z/my-project/db/custom.db .dump > backup.sql
```

### Import to PostgreSQL

```bash
# Install pgloader (handles SQLite → PostgreSQL conversion)
sudo apt install pgloader

# Migrate
pgloader /home/z/my-project/db/custom.db $DATABASE_URL
```

Or manually convert the SQL dump (SQLite syntax is mostly compatible with PostgreSQL).

---

## 💾 How to store data on your own device instead of cloud

If you don't want cloud storage and want the database to live on your own computer/server:

### Option A: Run the app locally with SQLite (current setup)

Just run the app on your own computer:

```bash
cd /home/z/my-project
bun run dev
```

The database stays at `/home/z/my-project/db/custom.db`. Only people on your local network can access the app.

### Option B: Move the SQLite file to an external drive / NAS / Dropbox

1. Move the database file:
   ```bash
   mv /home/z/my-project/db/custom.db /path/to/your/nas/trust-it.db
   ```

2. Update `.env`:
   ```env
   DATABASE_URL="file:/path/to/your/nas/trust-it.db"
   ```

3. Restart the app. Now the database lives on your NAS/external drive.

> ⚠️ **Warning**: SQLite doesn't handle concurrent writes well. For a multi-user app, use PostgreSQL instead.

### Option C: Self-host on a Raspberry Pi or home server

1. Install Node.js 18+ and bun on your Raspberry Pi
2. Clone the repo, install dependencies
3. Set up the SQLite database (or attach an external USB drive for storage)
4. Use nginx + Let's Encrypt for HTTPS (required for PWA install on iPhone)
5. Forward port 443 on your router to the Raspberry Pi
6. Use a dynamic DNS service (e.g. [duckdns.org](https://duckdns.org)) for a stable URL

---

## 🗃️ Database schema reference

Four tables, all managed by Prisma:

### `User`
Stores account info + public encryption key. Passwords are PBKDF2-hashed (never plaintext).

### `FriendRequest`
Tracks friend requests between users. Status: `pending` → `accepted` or `declined`.

### `Message`
Stores encrypted messages. Key fields:
- `encryptedData` — AES-GCM ciphertext (base64), only decryptable by the two chat participants
- `mediaId` — references an encrypted blob in `/uploads/`
- `seenAt` — when the recipient first saw the message (for read receipts)
- `replyToId`, `replyToSnippet`, `replyToSender` — for quoted replies

### `ChatBackground`
Per-user per-chat background customization.

---

## 🔐 Security notes

1. **Private keys never enter the database** — they live only in each user's browser `localStorage`. This means:
   - If a user clears their browser data, they lose access to old messages (but can still read new ones after regenerating a keypair).
   - A database leak does NOT expose message contents.

2. **Password hashing**: PBKDF2-SHA512, 100,000 iterations, 16-byte random salt per user.

3. **Session tokens**: HMAC-SHA256 signed cookies, 30-day TTL, `httpOnly` + `sameSite=lax`.

4. **Media access control**: Every `/api/media/[mediaId]` request verifies the requester is a participant in the chat room. The media file itself is AES-GCM encrypted — without the room key (derived from both users' ECDH keypairs), the bytes are random noise.

---

## 🆘 Need help?

- **Prisma docs**: https://www.prisma.io/docs
- **PostgreSQL free hosting**: https://supabase.com or https://neon.tech
- **Next.js deployment**: https://nextjs.org/docs/app/building-your-application/deploying
- **SQLite browser GUI**: https://sqlitebrowser.org
- **PWA install guide**: https://web.dev/articles/install-criteria
