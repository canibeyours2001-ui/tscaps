# ThitCaps

ThitCaps is the branded, independently hosted edition of Tscaps for `captions.thitlann.me`.

## Speech recognition

- **Local Whisper:** runs on the device, no upload/key needed.
- **Groq Whisper:** uses each browser's own Groq key and word-level timestamps.
- Choose a provider, choose Groq V3 Turbo or V3, enter your personal key in the Start dialog.
- Settings are saved to that browser profile via `localStorage` on this origin; different browsers, browser profiles and devices do **not** share keys or projects.
- The **Clear** button removes that browser's stored key. Clearing site storage also removes it.
- ThitCaps has no login, server accounts, shared sessions, database of keys, or application-level key synchronization.
- The Cloudflare Pages Function at `/api/transcribe` **forwards** an uploaded WAV and the request's own bearer key to Groq and returns timed words. The Function does not persist the key or audio. The upstream Groq service processes the uploaded audio according to Groq's own policies.
- Browser-stored keys are not secure against a malicious browser extension, a compromised browser profile, or a cross-site-scripting compromise; do not enter a key on a shared/untrusted device.

## Cloudflare Pages (GitHub)

- Repository: `canibeyours2001-ui/tscaps`
- Production branch: `thitcaps-production`
- Build command: `corepack enable && corepack prepare pnpm@11.1.3 --activate && pnpm install --frozen-lockfile && pnpm build`
- Output: `apps/studio/dist`
- Project root: `/` (keep `functions/api/transcribe.ts` in root)
- Pages project: `thitcaps`; custom hostname: `captions.thitlann.me`.

Frontend and caption engine are the upstream application with only the necessary custom provider/branding changes.
