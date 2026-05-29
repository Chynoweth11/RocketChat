# SubShield project status

_Last refreshed when the prototype was restructured into a component tree._

## Current active app

The active app is `src/subshield/SubShieldComplete.jsx`, mounted via
`src/App.jsx`. There is no longer a backup at `src/components/SubShield.jsx`
— the old prototype was removed and replaced by the new component tree.

## Architecture

- `src/subshield/data.js` — initial mock data (policies, GCs, activity)
- `src/subshield/utils.js` — pure helpers (storage, scoring, dates, ids)
- `src/subshield/icons.js` — policy → lucide icon mapping
- `src/subshield/styles.css` — unified design system (replaces the old
  `styles.css` + `debug.css` + `premium.css` trio)
- `src/subshield/SubShieldComplete.jsx` — orchestrator
- `src/subshield/components/` — view + modal components

The previous three CSS files have been consolidated into a single
organized stylesheet with documented sections, design tokens on
`.ss-app`, and proper responsive breakpoints.

## What works now

- Policy vault with score, status pills, and per-policy detail
- Renew action with loading state, computed expiry, activity log entry
- Lower-bill / rate-shop action with savings calc + activity log
- Document scan / vault flow (umbrella add or re-vault)
- GC directory: browse, edit, remove, add a new GC (full form + validation)
- Certificate holder editing
- COI package review modal with cover email preview
- Simulated package send with loading state + success modal + toast
- Activity log (latest 30 events, persisted)
- Profile view with stats and confirmable demo reset
- Local storage persistence (`subshield.complete.v2`)
- Accessible modals (ESC, backdrop, focus)
- Responsive layout (≤900px tablet, ≤560px phone)
- Toast notifications

## Next production work

- Real authentication (Clerk, Supabase, etc.)
- Real PDF upload + object storage
- OCR / document extraction service
- Outbound email delivery integration
- Backend database tables
- Audit logs
- Stripe billing
- E2E tests
