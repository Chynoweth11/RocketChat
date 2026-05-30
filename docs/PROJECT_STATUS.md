# SubShield Project Status

## Current app

Main entry: `src/subshield/SubShieldComplete.jsx`

The app is now organized as an insurance command center with policy management,
renewal tracking, COI workflows, broker/partner routing, and savings actions.

## Active feature set

- Dashboard command center with compliance score and premium tracking
- Expanded policy model (`policyType`, premium, renewal, broker link, savings state)
- Savings opportunities with action statuses
- Quote requests routed to partners or brokers
- Broker contact management
- Partner marketplace listing
- COI send history tracking
- GC directory with project and portal metadata
- Activity and timeline logging

## Local persistence

Storage key: `subshield.complete.v4`

Tracked entities:

- company
- policies
- contractors
- brokers
- partners
- savingsOpportunities
- quoteRequests
- coiSends
- activity
- preferences

## Validation

- `npm run lint` passes
- `npm run build` passes
