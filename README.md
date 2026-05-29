# SubShield

A frontend prototype for a subcontractor insurance compliance product:
a secure vault for original carrier-issued documents, a GC directory with
saved certificate-holder details, and 1-tap COI routing.

Built with **React 19 + Vite 6**. No backend — all state persists to
`localStorage` until you wire up real auth and storage.

---

## Quick start

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

## Build for production

```bash
npm run build
npm run preview
```

## Lint

```bash
npm run lint
```

---

## Project structure

```
subshield/
├── index.html                       Entry HTML + Inter font
├── package.json
├── vite.config.js
├── eslint.config.js
├── docs/
│   └── PROJECT_STATUS.md            Live status of features & next work
└── src/
    ├── App.jsx                      Mounts the orchestrator
    ├── main.jsx                     React root
    └── subshield/
        ├── SubShieldComplete.jsx    Orchestrator (state + routing)
        ├── data.js                  Initial mock data
        ├── utils.js                 Pure helpers (storage, scoring, dates)
        ├── icons.js                 Policy → icon mapping
        ├── styles.css               Unified design system
        └── components/
            ├── Layout.jsx           Sidebar, Header, Brand, NavButton, Section, Info, Spinner
            ├── VaultView.jsx        Score, policy list, policy detail, documents
            ├── ContractorsView.jsx  GC directory list with edit & send
            ├── ActivityView.jsx     Activity feed
            ├── ProfileView.jsx      Company stats + settings + reset
            ├── Modal.jsx            Accessible base modal (ESC + backdrop + focus)
            ├── SendModal.jsx        Review & route COI package
            ├── ScanModal.jsx        Vault a new carrier document
            ├── SuccessModal.jsx     Post-send confirmation
            ├── AddGCModal.jsx       Add new GC form
            └── EditHolderModal.jsx  Edit / remove GC form
```

---

## Features working today

| Area                | Status                                                |
| ------------------- | ----------------------------------------------------- |
| Policy vault        | ✅ Loaded from `data.js`, persisted to localStorage   |
| Compliance score    | ✅ Recomputed live from policy days remaining         |
| Renew policy        | ✅ With loading state, computed expiry, activity log  |
| Lower bill          | ✅ Switches carrier with savings calc + activity log  |
| Vault document      | ✅ Scan modal adds (or updates) the umbrella policy   |
| GC directory        | ✅ Browse, send, edit, remove, add new                |
| COI package preview | ✅ Choose GC, project, see review + cover email       |
| Send package        | ✅ Loading state, activity log, success modal, toast  |
| Activity log        | ✅ Latest 30 events, persisted                        |
| Profile + reset     | ✅ Confirmation flow + toast                          |
| Local persistence   | ✅ `subshield.complete.v2` key in localStorage        |
| Toasts              | ✅ Auto-dismiss after 3.2s                            |
| Keyboard / a11y     | ✅ ESC closes modals, aria labels, focus on close     |
| Responsive          | ✅ Tablet (≤900px) and phone (≤560px) breakpoints     |

---

## Backend / production work

These are intentionally out of scope for the frontend prototype:

- Real authentication (Clerk, Supabase Auth, etc.)
- Actual PDF upload to object storage (S3, R2)
- OCR / document extraction service (real metadata parsing)
- Outbound email delivery (Resend, Postmark, SendGrid)
- Database tables for policies, contractors, projects, activity
- Audit logs for compliance traceability
- Stripe billing
- E2E tests

The state shape in `data.js` and the helpers in `utils.js` are designed to
map 1:1 onto API endpoints when the backend is added.
