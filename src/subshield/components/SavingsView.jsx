import {
  BadgeDollarSign,
  BellRing,
  BriefcaseBusiness,
  CircleOff,
  HandCoins,
  History,
  Send,
} from "lucide-react";
import {
  formatLongDate,
  formatMoney,
  quoteStatusLabel,
} from "../utils.js";
import { Section } from "./Layout.jsx";

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
  const policyById = new Map((policies || []).map((policy) => [policy.id, policy]));
  const partnerById = new Map((partners || []).map((partner) => [partner.id, partner]));
  const brokerById = new Map((brokers || []).map((broker) => [broker.id, broker]));

  return (
    <div className="ss-grid">
      <section className="ss-card ss-span">
        <Section
          title="Insurance savings assistant"
          sub="Track overpayment risk, renewal timing, and quote actions."
        />

        {opportunities.length === 0 && (
          <div className="ss-empty">
            <BadgeDollarSign size={28} />
            <h2>No opportunities available</h2>
            <p>SubShield will surface opportunities as renewal windows approach.</p>
          </div>
        )}

        {opportunities.map((opportunity) => {
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
        <Section title="Quote request history" sub="Partner and broker submissions" />
        {quoteRequests.length === 0 && (
          <div className="ss-empty" style={{ minHeight: 180 }}>
            <History size={28} />
            <h2>No quote requests yet</h2>
            <p>Request a quote to start tracking carrier and broker responses.</p>
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
                    : `Broker: ${broker?.name || "Unassigned"}`}
                  <br />
                  Submitted {formatLongDate(request.submittedAt)}
                </small>
              </div>
              <em className="ss-status warning">{quoteStatusLabel(request.status)}</em>
            </div>
          );
        })}
      </section>

      <section className="ss-card">
        <Section title="Marketplace coverage" sub="Licensed partner footprint" />
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
            Current carrier: {opportunity.currentCarrier} - Renewal: {formatLongDate(opportunity.renewalDate)}
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
          <b>{status.replace(/_/g, " ")}</b>
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
          <BriefcaseBusiness size={16} /> Send to broker
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
