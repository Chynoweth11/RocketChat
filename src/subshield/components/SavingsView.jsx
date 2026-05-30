import { useMemo, useState } from "react";
import {
  BadgeDollarSign,
  BellRing,
  BriefcaseBusiness,
  CircleOff,
  HandCoins,
  History,
  Search,
  Send,
} from "lucide-react";
import {
  formatLongDate,
  formatMoney,
  policyLabelFromType,
  quoteStatusLabel,
} from "../utils.js";
import { Section } from "./Layout.jsx";

const FILTERS = [
  { id: "all", label: "All opportunities" },
  { id: "available", label: "Ready to act" },
  { id: "sent_to_partner", label: "Sent to partner" },
  { id: "requested", label: "Requested" },
  { id: "remind_later", label: "Snoozed" },
  { id: "dismissed", label: "Dismissed" },
];

export default function SavingsView({
  opportunities,
  policies,
  quoteRequests,
  partners,
  brokers,
  onCompareRates,
  onSendToBroker,
  onDismiss,
  onRemindLater,
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const policyById = useMemo(
    () => new Map((policies || []).map((policy) => [policy.id, policy])),
    [policies]
  );
  const partnerById = useMemo(
    () => new Map((partners || []).map((partner) => [partner.id, partner])),
    [partners]
  );
  const brokerById = useMemo(
    () => new Map((brokers || []).map((broker) => [broker.id, broker])),
    [brokers]
  );

  const filteredOpportunities = useMemo(() => {
    const q = query.trim().toLowerCase();
    return opportunities.filter((opportunity) => {
      const policy = policyById.get(opportunity.policyId);
      const policyLabel = policy?.name || policyLabelFromType(opportunity.policyType);
      const matchesQuery =
        !q ||
        policyLabel.toLowerCase().includes(q) ||
        opportunity.currentCarrier.toLowerCase().includes(q);
      const matchesFilter =
        statusFilter === "all" || opportunity.status === statusFilter;
      return matchesQuery && matchesFilter;
    });
  }, [opportunities, policyById, query, statusFilter]);

  const availableCount = opportunities.filter((item) => item.status === "available").length;
  const inProgressCount = opportunities.filter((item) =>
    ["requested", "sent_to_partner", "quote_received"].includes(item.status)
  ).length;
  const estimatedSavings = opportunities
    .filter((item) => item.status === "available")
    .reduce((sum, item) => sum + (item.estimatedSavings || 0), 0);

  return (
    <div className="ss-grid">
      <section className="ss-card ss-span">
        <Section
          title="Insurance Savings Assistant"
          sub="Find overpriced or at-risk policies and route help to licensed partners."
        />

        <div className="ss-command-metrics">
          <div className="ss-info">
            <span>Ready opportunities</span>
            <b>{availableCount}</b>
          </div>
          <div className="ss-info">
            <span>In progress</span>
            <b>{inProgressCount}</b>
          </div>
          <div className="ss-info">
            <span>Potential annual savings</span>
            <b>{formatMoney(estimatedSavings)}</b>
          </div>
        </div>

        {opportunities.length > 0 && (
          <>
            <div className="ss-search">
              <Search size={16} className="ss-search-icon" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by policy or carrier..."
                aria-label="Search opportunities"
              />
            </div>

            <div className="ss-chip-group">
              {FILTERS.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={`ss-chip ${statusFilter === item.id ? "active" : ""}`}
                  onClick={() => setStatusFilter(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </>
        )}

        {opportunities.length === 0 && (
          <div className="ss-empty">
            <BadgeDollarSign size={28} />
            <h2>No opportunities available</h2>
            <p>SubShield will surface opportunities as renewal windows approach.</p>
          </div>
        )}

        {opportunities.length > 0 && filteredOpportunities.length === 0 && (
          <div className="ss-empty" style={{ minHeight: 170 }}>
            <Search size={28} />
            <h2>No matching opportunities</h2>
            <p>Try a different filter or search term.</p>
          </div>
        )}

        {filteredOpportunities.map((opportunity) => {
          const policy = policyById.get(opportunity.policyId);
          return (
            <OpportunityCard
              key={opportunity.id}
              opportunity={opportunity}
              policy={policy}
              onCompareRates={() => onCompareRates(opportunity)}
              onSendToBroker={() => onSendToBroker(opportunity)}
              onDismiss={() => onDismiss(opportunity)}
              onRemindLater={() => onRemindLater(opportunity)}
            />
          );
        })}
      </section>

      <section className="ss-card">
        <Section
          title="Quote Request History"
          sub="Coverage and insurance review partner submissions"
        />
        {quoteRequests.length === 0 && (
          <div className="ss-empty" style={{ minHeight: 180 }}>
            <History size={28} />
            <h2>No quote requests yet</h2>
            <p>Request a quote to start tracking partner and advisor responses.</p>
          </div>
        )}
        {quoteRequests.map((request) => {
          const partner = request.partnerId ? partnerById.get(request.partnerId) : null;
          const broker = request.brokerId ? brokerById.get(request.brokerId) : null;
          return (
            <div className="ss-insight" key={request.id}>
              <div>
                <b>{policyById.get(request.policyId)?.name || "Policy request"}</b>
                <small>
                  {request.routeType === "partner"
                    ? `Partner: ${partner?.name || "Unassigned"}`
                    : `Advisor: ${broker?.name || "Unassigned"}`}
                  <br />
                  Submitted {formatLongDate(request.submittedAt)}
                </small>
              </div>
              <em className={`ss-status ${request.status === "accepted" ? "success" : request.status === "declined" ? "danger" : "warning"}`}>{quoteStatusLabel(request.status)}</em>
            </div>
          );
        })}
      </section>

      <section className="ss-card">
        <Section title="Coverage & Savings Network" sub="Licensed partner footprint and option mix" />
        {partners.filter((partner) => partner.active).map((partner) => (
          <div className="ss-insight" key={partner.id}>
            <div>
              <b>{partner.name}</b>
              <small>
                {partner.type} - {partner.statesServed.join(", ")}
              </small>
            </div>
            <span className="ss-pill" style={{ padding: "6px 10px", fontSize: 11 }}>
              <HandCoins size={12} /> {partner.commissionModel.replace(/_/g, " ")}
            </span>
          </div>
        ))}
      </section>
    </div>
  );
}

function OpportunityCard({
  opportunity,
  policy,
  onCompareRates,
  onSendToBroker,
  onDismiss,
  onRemindLater,
}) {
  const status = opportunity.status;
  const isAvailable = status === "available";
  const isDismissed = status === "dismissed";
  const isSnoozed = status === "remind_later";

  return (
    <article className="ss-savings-card">
      <div className="ss-savings-head">
        <div>
          <span className="ss-eyebrow">Savings opportunity</span>
          <h2>{policy?.name || opportunity.policyType}</h2>
          <p className="ss-muted">
            Current carrier: {opportunity.currentCarrier} - Renewal:{" "}
            {formatLongDate(opportunity.renewalDate)}
          </p>
        </div>
        <div className="ss-savings-amount">
          <small>Estimated annual savings</small>
          <strong>{formatMoney(opportunity.estimatedSavings)}</strong>
        </div>
      </div>

      <div className="ss-info-grid">
        <div className="ss-info">
          <span>Current premium</span>
          <b>{formatMoney(opportunity.currentPremium)}/yr</b>
        </div>
        <div className="ss-info">
          <span>Status</span>
          <b>{quoteStatusLabel(status)}</b>
        </div>
      </div>

      <div className="ss-row">
        <button
          type="button"
          className="ss-button"
          onClick={onCompareRates}
          disabled={!isAvailable && !isSnoozed}
        >
          <BadgeDollarSign size={16} /> Compare rates
        </button>
        <button
          type="button"
          className="ss-button soft"
          onClick={onSendToBroker}
          disabled={!isAvailable && !isSnoozed}
        >
          <BriefcaseBusiness size={16} /> Send to advisor
        </button>
        <button
          type="button"
          className="ss-button soft"
          onClick={onRemindLater}
          disabled={isDismissed}
        >
          <BellRing size={16} /> Remind me later
        </button>
        <button
          type="button"
          className="ss-button soft"
          onClick={onDismiss}
          disabled={isDismissed}
        >
          <CircleOff size={16} /> Not interested
        </button>
      </div>

      {status === "requested" || status === "sent_to_partner" ? (
        <div className="ss-note success">
          <Send size={16} />
          <span>Quote request already in progress for this policy.</span>
        </div>
      ) : null}
    </article>
  );
}
