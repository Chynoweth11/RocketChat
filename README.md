# SubShield

**The insurance command center for contractors.** SubShield is a business
insurance management platform for contractors, subcontractors, and small
businesses. It keeps every policy, document, certificate, renewal date, and
compliance record organized in one place. You can prove coverage in seconds,
stay compliant, never miss a renewal, and keep missing paperwork from holding
up project approvals.

> **SubShield is not an insurance company and does not sell, quote, bind, or
> issue insurance.** When you want to compare options, renew, or find better
> pricing, SubShield routes you to licensed insurance partners, brokers, and
> carriers. The partner handles the quote, application, underwriting, purchase,
> and policy issuance. SubShield's role is to organize, track, remind, prepare,
> route, and store.

The daily headaches SubShield solves:

> "Where is my COI?" · "When does my workers' comp expire?" · "Did I already
> send my insurance to this GC?" · "Are we missing documents for this job?" ·
> "Can I find a better price before renewal?"

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

- **Dashboard:** your command center with an Action Center of what needs attention
  now, upcoming renewals, recent activity, coverage gaps, missing documents, and
  tracked premium at a glance.
- **Policies:** every policy with premium, **deductible**, limits, renewal date,
  documents, a per-policy **health score**, and a renewal timeline. Renew, request
  partner quotes, or send a certificate from here.
- **Certificates:** save GCs and certificate holders once, send proof of
  insurance (workers' comp, GL, auto, umbrella, and more) in a few clicks, and
  keep a full record of where and when each certificate was sent.
- **Documents:** one document center for declarations, certificates,
  endorsements, renewal quotes, and compliance files with type filters and search.
- **Savings (partner-powered):** *one* feature, not the headline. When you want
  to review pricing, SubShield submits your details to a licensed partner, shows
  the partner's returned offer, and routes you to the partner's site to purchase.
  You then upload the new policy back into SubShield. SubShield never quotes or
  binds coverage itself.
- **Settings:** account, team, workspace plan, security, notifications, legal
  disclosures, and product controls.

## The partner-routed quote lifecycle

```
available → pending_partner → quote_received → at_partner → purchased
```

1. **Request quote from partner:** your details are submitted to a licensed partner.
2. **Awaiting partner:** the partner reviews; no numbers are shown until they respond.
3. **Partner offer:** the partner's actual figures appear, clearly attributed to them.
4. **Go purchase at partner:** opens the partner's site; coverage is bought there.
5. **Confirm & upload:** you save the new declarations page back into SubShield.

## Insurance types

General Liability, Workers' Compensation, Commercial Auto, Umbrella / Excess,
Commercial Property, Cyber, Equipment / Inland Marine, Tools, Builder's Risk,
Professional, Pollution, Surety Bonding, and Trade License.

## Data model (frontend local persistence)

Production-style entities tracked in state and `localStorage`:

- `company`
- `policies` (premium, deductible, limits, renewal, documents, health score)
- `savingsOpportunities` (with partner-supplied `alternateQuote` comparisons)
- `quoteRequests` (partner routing + status lifecycle)
- `documents` (declarations, certificates, endorsements, renewal quotes, compliance files)
- `contractors` (certificate holders)
- `coiSends` (certificate delivery history)
- `brokers` (advisors) and `partners` (licensed network, with `quoteUrl` +
  `commissionModel`)
- `activity`
- `settings`
- `preferences`

Storage key: `subshield.complete.v6`
