/**
 * End-to-end encryption helpers using Web Crypto API.
 *
 * Strategy:
 * - Each user generates an ECDH key pair (P-256) on first login.
 * - Private key is stored locally (IndexedDB / localStorage as JWK).
 * - Public key is uploaded to the server (as JWK string).
 * - For a 1:1 chat between A and B, both derive the same shared secret:
 *     sharedSecret = ECDH(A_private, B_public)  ===  ECDH(B_private, A_public)
 * - We then derive an AES-GCM key from the shared secret using HKDF with a
 *   per-room salt = SHA-256(roomId). Both parties derive the same key.
 * - Each message uses a random 12-byte IV (stored alongside ciphertext).
 * - Media files are encrypted with the same derived AES-GCM key, IV prefixed to ciphertext.
 */

const ECDH_PARAMS: EcKeyGenParams = { name: 'ECDH', namedCurve: 'P-256' }
const AES_PARAMS: AesKeyGenParams = { name: 'AES-GCM', length: 256 }

export interface KeyPairJWK {
  publicKey: JsonWebKey
  privateKey: JsonWebKey
}

// ---------- Base64 helpers ----------

export function bufToBase64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let bin = ''
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

export function base64ToBuf(b64: string): Uint8Array {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

// ---------- Key pair generation / storage ----------

export async function generateKeyPair(): Promise<KeyPairJWK> {
  const pair = await crypto.subtle.generateKey(ECDH_PARAMS, true, ['deriveKey', 'deriveBits'])
  const [publicKey, privateKey] = await Promise.all([
    crypto.subtle.exportKey('jwk', pair.publicKey),
    crypto.subtle.exportKey('jwk', pair.privateKey),
  ])
  return { publicKey, privateKey }
}

export async function importPublicKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey('jwk', jwk, ECDH_PARAMS, true, [])
}

export async function importPrivateKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey('jwk', jwk, ECDH_PARAMS, false, ['deriveKey', 'deriveBits'])
}

export function serializePublicKey(jwk: JsonWebKey): string {
  return JSON.stringify(jwk)
}

export function deserializePublicKey(s: string | null | undefined): JsonWebKey | null {
  if (!s) return null
  try {
    return JSON.parse(s) as JsonWebKey
  } catch {
    return null
  }
}

// ---------- Local storage of private key ----------

const PRIVATE_KEY_STORAGE = 'encchat.privateKey.v1'

export function storePrivateKeyLocally(jwk: JsonWebKey) {
  try {
    localStorage.setItem(PRIVATE_KEY_STORAGE, JSON.stringify(jwk))
  } catch (e) {
    console.error('Failed to store private key', e)
  }
}

export function loadPrivateKeyLocally(): JsonWebKey | null {
  try {
    const s = localStorage.getItem(PRIVATE_KEY_STORAGE)
    if (!s) return null
    return JSON.parse(s) as JsonWebKey
  } catch {
    return null
  }
}

export function clearPrivateKeyLocally() {
  try {
    localStorage.removeItem(PRIVATE_KEY_STORAGE)
  } catch {}
}

// ---------- Derive room AES key ----------

async function sha256(input: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
}

/**
 * Derive the per-room AES-GCM key.
 * Both parties in a chat derive the exact same key.
 */
export async function deriveRoomKey(
  myPrivateJwk: JsonWebKey,
  theirPublicJwk: JsonWebKey,
  roomId: string
): Promise<CryptoKey> {
  const myPrivate = await importPrivateKey(myPrivateJwk)
  const theirPublic = await importPublicKey(theirPublicJwk)

  // Shared secret via ECDH
  const sharedBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: theirPublic },
    myPrivate,
    256 // 32 bytes
  )

  // HKDF to derive AES key, with salt = SHA-256(roomId)
  const salt = await sha256(roomId)
  const baseKey = await crypto.subtle.importKey('raw', sharedBits, 'HKDF', false, ['deriveKey'])
  const aesKey = await crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt, info: new TextEncoder().encode('encchat-room-key') },
    baseKey,
    AES_PARAMS,
    false,
    ['encrypt', 'decrypt']
  )
  return aesKey
}

// ---------- Encrypt / decrypt text ----------

/**
 * Encrypt a string. Returns base64 of `iv || ciphertext`.
 */
export async function encryptText(key: CryptoKey, plaintext: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const enc = new TextEncoder().encode(plaintext)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc)
  const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertext), iv.byteLength)
  return bufToBase64(combined.buffer)
}

/**
 * Decrypt a base64 string of `iv || ciphertext`. Returns plaintext string.
 */
export async function decryptText(key: CryptoKey, b64: string): Promise<string> {
  const combined = base64ToBuf(b64)
  const iv = combined.slice(0, 12)
  const ciphertext = combined.slice(12)
  const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return new TextDecoder().decode(plainBuf)
}

// ---------- Encrypt / decrypt media (binary) ----------

/**
 * Encrypt a binary Blob/File. Returns a new Blob with `iv || ciphertext`.
 * The output is opaque binary, suitable for upload.
 */
export async function encryptBlob(key: CryptoKey, data: ArrayBuffer | Uint8Array): Promise<Uint8Array> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)
  const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertext), iv.byteLength)
  return combined
}

/**
 * Decrypt binary `iv || ciphertext` into a Uint8Array.
 */
export async function decryptBlob(key: CryptoKey, data: ArrayBuffer | Uint8Array): Promise<Uint8Array> {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)
  const iv = bytes.slice(0, 12)
  const ciphertext = bytes.slice(12)
  const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return new Uint8Array(plainBuf)
}

// ---------- Convenience: a per-room key cache ----------

const roomKeyCache = new Map<string, Promise<CryptoKey>>()

export function getCachedRoomKey(
  roomId: string,
  myPrivateJwk: JsonWebKey,
  theirPublicJwk: JsonWebKey
): Promise<CryptoKey> {
  let p = roomKeyCache.get(roomId)
  if (!p) {
    p = deriveRoomKey(myPrivateJwk, theirPublicJwk, roomId)
    roomKeyCache.set(roomId, p)
    // Clear cache on error
    p.catch(() => roomKeyCache.delete(roomId))
  }
  return p
}

export function clearRoomKeyCache(roomId?: string) {
  if (roomId) roomKeyCache.delete(roomId)
  else roomKeyCache.clear()
}
