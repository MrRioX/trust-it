# Free SMS Gateway Setup (replaces Firebase/Twilio)

You're now using **SMS Gateway for Android** (https://sms-gate.app) — open-source,
$0 cost, sends real SMS through a spare Android phone's own SIM.

## 1. Where these files go
Drop these into your project, overwriting the existing ones at the same paths:

- `src/lib/sms.ts` — **new file**
- `src/app/api/auth/send-otp/route.ts` — replaces existing
- `src/app/api/auth/forgot-password/route.ts` — replaces existing
- `src/components/app/auth-screen.tsx` — replaces existing (phone OTP now goes
  through your backend instead of Firebase; Firebase is no longer used at all)

You can delete `src/lib/firebase.ts` and remove `firebase` from `package.json`
if you don't need it elsewhere — nothing in the app still imports it.

## 2. Set up the phone (~10 minutes)
1. On a spare Android phone with a working SIM + internet, install
   **SMS Gateway for Android** (search "SMS Gateway for Android" on the Play
   Store, or grab the APK from https://sms-gate.app).
2. Open the app → toggle **Cloud Server** → tap **Offline** to switch it to
   **Online**.
3. The app displays a generated **username** and **password** — copy both.
4. Keep the phone plugged in and connected to Wi-Fi/data. Disable battery
   optimization for the app (Settings → Apps → SMS Gateway → Battery →
   Unrestricted), otherwise Android will kill the background connection after
   a while.

## 3. Add environment variables on Vercel
Project → Settings → Environment Variables:

```
SMSGATE_USERNAME = <username from the app>
SMSGATE_PASSWORD = <password from the app>
```

Redeploy after adding them.

## 4. Test it
Register a new account with a phone number — the OTP should now arrive as a
real SMS from your gateway phone's number within a few seconds.

## Known limitations (be aware, not blocking)
- **Not a business/DLT route** — this sends from a personal SIM. Fine for an
  MVP or low-to-moderate signup volume; if your phone's carrier throttles it
  or you outgrow it, swap in a paid gateway later (only `src/lib/sms.ts`
  would need to change).
- **OTP storage is in-memory** (`Map` in the route file) — this was already
  true for your email OTP flow. On Vercel's serverless functions this can be
  unreliable across requests if a cold start happens between "send" and
  "verify." If you start seeing "No OTP was sent" errors on valid codes,
  that's why — the fix is to store OTPs in your Postgres/Supabase DB instead
  of a Map. Happy to build that if it becomes a problem.
- If a number doesn't include a country code, `src/lib/sms.ts` defaults to
  `+91`. Change `DEFAULT_COUNTRY_CODE` there if most users aren't Indian —
  though in your case the UI always sends a country code anyway, so this is
  just a safety net.
