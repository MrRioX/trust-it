/**
 * SMS delivery via "SMS Gateway for Android" (https://sms-gate.app)
 * — free, open-source, self-hosted on your own Android phone.
 *
 * HOW IT WORKS
 * Your phone runs the SMS Gateway app in Cloud Server mode. It stays
 * connected to Anthropic-unrelated, third-party relay api.sms-gate.app and
 * receives send requests pushed to it (FCM push, falling back to SSE,
 * falling back to 15-min polling). It then sends the SMS using its own
 * SIM — so delivery cost is whatever your carrier/prepaid plan charges,
 * which on most Indian prepaid plans is ₹0 for a normal daily SMS quota.
 *
 * SETUP (one-time, ~10 minutes)
 * 1. On a spare Android phone (needs a working SIM + internet), install
 *    "SMS Gateway for Android": https://sms-gate.app (Play Store or APK).
 * 2. Open the app → toggle "Cloud Server" → tap "Offline" to go online.
 * 3. The app shows you a username + password (auto-generated). Copy them.
 * 4. In Vercel → Project → Settings → Environment Variables, add:
 *      SMSGATE_USERNAME = <username from the app>
 *      SMSGATE_PASSWORD = <password from the app>
 * 5. Keep the phone charged, connected to the internet, and with battery
 *    optimization disabled for the app (Android will otherwise kill the
 *    background connection — see dontkillmyapp.com for your phone model).
 *
 * LIMITS
 * This is not a paid, DLT-registered business SMS route — it sends from
 * a personal number using your SIM, so:
 *  - Fine for OTP/login volumes on a small app or MVP.
 *  - If your phone's carrier throttles/blocks bulk SMS from one SIM, or
 *    you outgrow this, swap this file for a paid gateway later — nothing
 *    else in the app needs to change, since callers only use sendSms().
 */

const SMSGATE_URL = 'https://api.sms-gate.app/3rdparty/v1/messages'

// Default country code used when a number is entered without one.
// Change this if most of your users are outside India.
const DEFAULT_COUNTRY_CODE = '+91'

/**
 * Normalizes a phone number to E.164 format (e.g. +919876543210).
 * If the number has no leading "+", assumes DEFAULT_COUNTRY_CODE.
 */
export function toE164(rawPhone: string): string {
  const trimmed = rawPhone.trim().replace(/[\s-()]/g, '')
  if (trimmed.startsWith('+')) return trimmed
  // Strip a leading 0 some users type before a local number
  const digitsOnly = trimmed.replace(/^0+/, '')
  return `${DEFAULT_COUNTRY_CODE}${digitsOnly}`
}

export async function sendSms(
  rawPhone: string,
  text: string
): Promise<{ ok: boolean; error?: string }> {
  const user = process.env.SMSGATE_USERNAME
  const pass = process.env.SMSGATE_PASSWORD

  if (!user || !pass) {
    return {
      ok: false,
      error:
        'SMS Gateway not configured. Set SMSGATE_USERNAME and SMSGATE_PASSWORD env vars (see src/lib/sms.ts setup notes).',
    }
  }

  const phoneNumber = toE164(rawPhone)

  try {
    const res = await fetch(SMSGATE_URL, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64'),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        textMessage: { text },
        phoneNumbers: [phoneNumber],
      }),
    })

    if (res.ok) {
      return { ok: true }
    }

    const errText = await res.text().catch(() => '')
    return { ok: false, error: `SMS Gateway error (${res.status}): ${errText.slice(0, 150)}` }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'SMS Gateway network error' }
  }
}
