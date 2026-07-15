/**
 * Firebase configuration for Phone Authentication
 *
 * SETUP INSTRUCTIONS:
 * 1. Go to https://console.firebase.google.com → Create project
 * 2. Add a Web App → copy the config values
 * 3. Enable Authentication → Sign-in method → Phone → Enable
 * 4. Add your domain (e.g. trust-it-xxx.vercel.app) to Authorized domains
 * 5. Add these env vars on Vercel:
 *    - NEXT_PUBLIC_FIREBASE_API_KEY
 *    - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
 *    - NEXT_PUBLIC_FIREBASE_PROJECT_ID
 *    - NEXT_PUBLIC_FIREBASE_APP_ID
 *
 * For testing on localhost, add "localhost" to authorized domains too.
 */
import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Only initialize if config is present
const app = getApps().length > 0 ? getApps()[0] : (firebaseConfig.apiKey ? initializeApp(firebaseConfig) : null)

export const firebaseAuth = app ? getAuth(app) : null
export const isFirebaseConfigured = !!firebaseConfig.apiKey
