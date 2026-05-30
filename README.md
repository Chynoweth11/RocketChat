# SubShield

**Rocket Money for business insurance.** SubShield reviews a company's commercial
insurance, watches every renewal, finds lower-cost options from a licensed partner
network, and handles the paperwork — so owners stay covered and stop overpaying.

The core promise:

> Upload your insurance → we review it → we look for savings → we show better
> options → you choose if you want to switch → we help handle the paperwork.

Built with React 19 + Vite 6. Frontend-only with local persistence.

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

- **Dashboard** — executive overview: potential & realized savings, tracked
  premium, renewals, coverage gaps, missing documents, and a ranked priority queue.
- **Policies** — every policy with premium, **deductible**, limits, renewal date,
  documents, and renew / find-savings / send actions.
- **Savings** — the core feature. Review opportunities, run an instant rate check,
  compare **current vs. recommended** side by side, and accept & switch in one click.
  Backed by a licensed partner network that stays in the background.
- **Certificates** — send certificates of insurance, save certificate holders, and
  keep a full delivery history.
- **Documents** — a document center for declarations, certificates, endorsements,
  quotes, and invoices with type filters and search.
- **Activity** — a complete audit trail of every insurance action.
- **Settings** — account, team, billing, security, notifications, and product controls.

## Insurance types

General Liability, Workers' Compensation, Commercial Auto, Umbrella / Excess,
Commercial Property, Cyber, Equipment / Inland Marine, Tools, Builder's Risk,
Professional, Pollution, Surety Bonding, and Trade License.

## Data model (frontend local persistence)

Production-style entities tracked in state and `localStorage`:

- `company`
- `policies` (premium, deductible, limits, renewal, documents)
- `savingsOpportunities` (with `alternateQuote` comparisons)
- `quoteRequests`
- `documents` (declarations, certificates, endorsements, quotes, invoices)
- `contractors` (certificate holders)
- `coiSends`
- `brokers` (advisors) and `partners` (licensed network)
- `activity`
- `settings`
- `preferences`

Storage key: `subshield.complete.v5`
