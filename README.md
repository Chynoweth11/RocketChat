# SubShield

SubShield is a subcontractor-first insurance command center:

- insurance policy wallet
- compliance vault
- COI sending workflow
- renewal tracker
- savings and quote request assistant

Built with React 19 + Vite 6.

## Quick start

```bash
npm install
npm run dev
```

## Production build

```bash
npm run lint
npm run build
npm run preview
```

## Product surfaces

- Command center dashboard with compliance, premium, reminders, and recommended next action
- Policy vault with renewal and lower-bill actions
- Savings opportunities with compare/send-to-broker/dismiss/snooze actions
- Quote request routing to partner marketplace or saved brokers
- GC directory with holder details, portal instructions, and send history
- Broker and partner workspace
- Activity log with timestamp grouping
- Profile and workflow settings

## Data model (frontend local persistence)

The app now tracks production-style entities in local state and localStorage:

- `company`
- `policies`
- `contractors`
- `brokers`
- `partners`
- `savingsOpportunities`
- `quoteRequests`
- `coiSends`
- `activity`
- `preferences`

Storage key: `subshield.complete.v3`
