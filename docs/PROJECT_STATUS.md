# SubShield Project Status

## Product vision

**Rocket Money for business insurance.** Review a company's commercial insurance,
track renewals, surface savings, compare current vs. better options, switch carriers,
send certificates, and keep all paperwork organized. Brokers/partners are a
background network — not the headline feature.

## Current app

Main entry: `src/subshield/SubShieldComplete.jsx`

## Navigation / surfaces

1. **Dashboard** (`DashboardView`) — savings-forward executive overview + priority queue
2. **Policies** (`PoliciesView`) — coverage, premium, deductible, limits, renewals
3. **Savings** (`SavingsView`) — instant rate check + current-vs-recommended comparison + accept/switch
4. **Certificates** (`CertificatesView`) — COI sends, holders, delivery history
5. **Documents** (`DocumentsView`) — declarations, certificates, endorsements, renewal quotes, compliance files
6. **Activity** (`ActivityView`) — audit trail
7. **Settings** (`SettingsView`) — full SaaS settings center

## Key workflows (end-to-end)

- Upload insurance (`ScanModal`) → creates/updates a policy + files a declaration document
- Find better rate → simulates a partner quote, attaches `alternateQuote`, logs a quote doc + request
- Accept & switch → updates the policy carrier/premium/deductible, records realized savings
- Coverage gaps → recommends missing coverage, deep-links into Add Policy prefilled
- Send certificate → records a COI send + files a certificate document

## Data model

Storage key: `subshield.complete.v5`

Tracked entities: company, policies (with `deductible`), savingsOpportunities
(with `alternateQuote`), quoteRequests, documents, contractors, coiSends, brokers,
partners, activity, settings, preferences.

## Validation

- `npm run lint` passes
- `npm run build` passes
