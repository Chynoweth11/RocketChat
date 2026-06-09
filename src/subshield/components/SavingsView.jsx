import { useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  BadgeDollarSign,
  BellRing,
  CircleOff,
  History,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingDown,
} from "lucide-react";
import {
  formatDeductible,
  formatLongDate,
  formatMoney,
  policyLabelFromType,
  quoteStatusLabel,
  savingsForOpportunity,
} from "../utils.js";
import { Info, PartnerDisclaimer, Section, Spinner } from "./Layout.jsx";

const FILTERS = [
  { id: "open", label: "Needs action" },
  { id: "all", label: "All" },
  { id: "available", label: "Available" },
  { id: "pending_partner", label: "Awaiting partner" },
  { id: "quote_received", label: "Offer ready" },
  { id: "at_partner", label: "At partner" },
  { id: "accepted", label: "Switched" },
  { id: "remind_later", label: "Snoozed" },
  { id: "dismissed", label: "Dismissed" },
];


export default function SavingsView({
  opportunities,
  policies,
  quoteRequests,
  partners,
  brokers,
  potentialSavings,
  realizedSavings,
  findingId,
  onRequestQuote,
  onGoToPurchase,
  onConfirmPurchase,
  onKeepCurrent,
  onTalkToAdvisor,
  onRemindLater,
  onReactivate,
  onAddAdvisor,
  onStartReview,
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("open");

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
        statusFilter === "all"
          ? true
          : statusFilter === "open"
          ? ["available", "pending_partner", "quote_received", "at_partner"].includes(opportunity.status)
          : opportunity.status === statusFilter;
      return matchesQuery && matchesFilter;
    });
  }, [opportunities, policyById, query, statusFilter]);

  const availableCount = opportunities.filter((item) =>
    ["available", "pending_partner", "quote_received", "at_partner"].includes(item.status)
  ).length;
  const switchedCount = opportunities.filter((item) => item.status === "accepted").length;

  return (
    <div className="ss-grid ss-savings-grid">
      <section className="ss-card ss-span">
        <Section
          title="Coverage review through licensed partners"
          sub="Prepare your details once and a licensed partner reviews your coverage and pricing. SubShield never sells, quotes, or binds insurance."
          extra={
            <button type="button" className="ss-button" onClick={onStartReview}>
              <Search size={15} /> Request a coverage review
            </button>
          }
        />
        <PartnerDisclaimer />
      </section>

      <section className="ss-card ss-span">
        <Section
          title="Savings opportunities"
          sub="Where licensed partners may find comparable coverage at lower cost, organized by priority."
          extra={
            <span className="ss-section-extra">
              {availableCount} open | {switchedCount} switched
            </span>
          }
        />

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
                  aria-pressed={statusFilter === item.id}
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
            <h2>No opportunities yet</h2>
            <p>Add or upload policies and SubShield will flag where licensed partners may be able to find lower-cost coverage.</p>
          </div>
        )}

        {opportunities.length > 0 && filteredOpportunities.length === 0 && (
          <div className="ss-empty" style={{ minHeight: 160 }}>
            <Search size={28} />
            <h2>No matches</h2>
            <p>Try a different filter or search term.</p>
          </div>
        )}

        <div className="ss-savings-list">
          {filteredOpportunities.map((opportunity) => (
            <OpportunityCard
              key={opportunity.id}
              opportunity={opportunity}
              policy={policyById.get(opportunity.policyId)}
              partner={partnerById.get(opportunity.alternateQuote?.partnerId || opportunity.partnerId)}
              busy={findingId === opportunity.id}
              onRequestQuote={() => onRequestQuote(opportunity)}
              onGoToPurchase={() => onGoToPurchase(opportunity)}
              onConfirmPurchase={() => onConfirmPurchase(opportunity)}
              onKeepCurrent={() => onKeepCurrent(opportunity)}
              onTalkToAdvisor={() => onTalkToAdvisor(opportunity)}
              onRemindLater={() => onRemindLater(opportunity)}
              onReactivate={() => onReactivate(opportunity)}
            />
          ))}
        </div>
      </section>

      <div className="ss-savings-lower">
        <div className="ss-savings-lower-main">
          <section className="ss-card">
            <Section title="Quote requests & partner status" sub="What you submitted, when, and which licensed partner it routed to" />
            {quoteRequests.length === 0 && (
              <div className="ss-empty" style={{ minHeight: 160 }}>
                <History size={28} />
                <h2>No quote requests yet</h2>
                <p>Complete the coverage review above to submit your first request to a licensed partner.</p>
              </div>
            )}
            {quoteRequests.map((request) => {
              const partner = request.partnerId ? partnerById.get(request.partnerId) : null;
              const broker = request.brokerId ? brokerById.get(request.brokerId) : null;
              const tone =
                request.status === "quote_received" || request.status === "accepted"
                  ? "success"
                  : request.status === "declined"
                  ? "danger"
                  : "warning";
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
                  <em className={`ss-status ${tone}`}>{quoteStatusLabel(request.status)}</em>
                </div>
              );
            })}
          </section>

          <section className="ss-card">
            <Section title="Savings summary" sub="How much has been found and realized" />
            <div className="ss-info-grid">
              <Info label="Potential savings" value={`${formatMoney(potentialSavings)}/yr`} />
              <Info label="Realized savings" value={`${formatMoney(realizedSavings)}/yr`} />
              <Info label="Open opportunities" value={availableCount} />
              <Info label="Switched via partner" value={switchedCount} />
            </div>
            <PartnerDisclaimer compact />
          </section>
        </div>

        <section className="ss-card">
          <Section
            title="Insurance review partners"
            sub="Licensed contacts for renewals, policy questions, and quote support"
            extra={
              <button type="button" className="ss-button soft ss-button-sm" onClick={onAddAdvisor}>
                <Plus size={14} /> Add
              </button>
            }
          />
          {brokers.length === 0 && (
            <div className="ss-note">
              <Sparkles size={16} />
              <span>No advisor saved. Add one for one-click renewal reviews.</span>
            </div>
          )}
          {brokers.map((broker) => (
            <div className="ss-insight" key={broker.id}>
              <div>
                <b>{broker.name}</b>
                <small>
                  {broker.company}
                  <br />
                  {broker.email}
                </small>
              </div>
            </div>
          ))}

          <div className="ss-partner-network">
            <span className="ss-eyebrow">Coverage and savings network</span>
            <div className="ss-partner-chips">
              {partners
                .filter((partner) => partner.active)
                .map((partner) => (
                  <span className="ss-partner-chip" key={partner.id} title={partner.amRating || ""}>
                    <ShieldCheck size={12} /> {partner.name}
                  </span>
                ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function OpportunityCard({
  opportunity,
  policy,
  partner,
  busy,
  onRequestQuote,
  onGoToPurchase,
  onConfirmPurchase,
  onKeepCurrent,
  onTalkToAdvisor,
  onRemindLater,
  onReactivate,
}) {
  const status = opportunity.status;
  const saving = savingsForOpportunity(opportunity);
  const name = policy?.name || policyLabelFromType(opportunity.policyType);
  const quote = opportunity.alternateQuote;
  const partnerName = quote?.carrier || partner?.name || "Licensed partner";

  // -- Purchased via partner --------------------------------------------------
  if (status === "accepted") {
    return (
      <article className="ss-savings-card accepted">
        <div className="ss-savings-head">
          <div>
            <span className="ss-eyebrow">Switched via licensed partner</span>
            <h2>{name}</h2>
            <p className="ss-muted">
              Issued by {quote?.carrier || opportunity.currentCarrier}. Documents
              uploaded and saved in SubShield.
            </p>
          </div>
          <div className="ss-savings-amount">
            <small>Annual savings</small>
            <strong className="ss-savings-pos">{formatMoney(saving)}/yr</strong>
          </div>
        </div>
        <div className="ss-note success">
          <BadgeCheck size={16} />
          <span>
            Coverage switched through the licensed partner. SubShield will monitor your next renewal.
          </span>
        </div>
      </article>
    );
  }

  // -- Snoozed or dismissed --------------------------------------------------
  if (status === "dismissed" || status === "remind_later") {
    return (
      <article className="ss-savings-card muted">
        <div className="ss-savings-head">
          <div>
            <span className="ss-eyebrow">{quoteStatusLabel(status)}</span>
            <h2>{name}</h2>
            <p className="ss-muted">
              {status === "remind_later"
                ? "Snoozed. This will resurface near your renewal date."
                : "Dismissed. Reopen any time to compare again."}
            </p>
          </div>
          <button type="button" className="ss-button soft ss-button-sm" onClick={onReactivate}>
            Reopen
          </button>
        </div>
      </article>
    );
  }

  // -- Awaiting partner response ---------------------------------------------
  if (status === "pending_partner") {
    return (
      <article className="ss-savings-card pending">
        <div className="ss-savings-head">
          <div>
            <span className="ss-eyebrow">Awaiting partner response</span>
            <h2>{name}</h2>
            <p className="ss-muted">
              Your request has been submitted to {partnerName}. We'll notify you when their offer arrives.
            </p>
          </div>
          <div className="ss-savings-amount">
            <small>Est. savings</small>
            <strong className="ss-savings-pos">{formatMoney(saving)}/yr</strong>
          </div>
        </div>
        <div className="ss-note" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Spinner />
          <span>
            <b>{partnerName}</b> is reviewing your coverage details. Their offer will appear here when ready.
          </span>
        </div>
      </article>
    );
  }

  // -- Partner sent offer - user clicks through to purchase -----------------
  if (status === "at_partner") {
    return (
      <article className="ss-savings-card at-partner">
        <div className="ss-savings-head">
          <div>
            <span className="ss-eyebrow">Sent to partner. Review your options there</span>
            <h2>{name}</h2>
            <p className="ss-muted">
              You were redirected to {partnerName} to review and finalize. Once you've switched, come back here to save your new policy.
            </p>
          </div>
          <div className="ss-savings-amount">
            <small>Partner offer</small>
            <strong className="ss-savings-pos">
              {quote?.premium ? formatMoney(quote.premium) + "/yr" : formatMoney(saving) + "/yr saved"}
            </strong>
          </div>
        </div>
        <div className="ss-note">
          <TrendingDown size={16} />
          <span>
            Switched on {partnerName}'s platform? Come back and confirm so SubShield can update your policy record.
          </span>
        </div>
        <div className="ss-row">
          <button type="button" className="ss-button" onClick={onConfirmPurchase}>
            <BadgeCheck size={16} /> I switched coverage. Save my policy
          </button>
          <button type="button" className="ss-button soft" onClick={onGoToPurchase}>
            Re-open {partnerName}
          </button>
          <button type="button" className="ss-button soft" onClick={onKeepCurrent}>
            <CircleOff size={16} /> Changed my mind
          </button>
        </div>
      </article>
    );
  }

  // -- Partner offer received - show comparison ------------------------------
  if (status === "quote_received" && quote) {
    return (
      <article className="ss-savings-card">
        <div className="ss-savings-head">
          <div>
            <span className="ss-eyebrow">Partner offer from {partnerName}</span>
            <h2>{name}</h2>
            <p className="ss-muted">
              Current carrier: {opportunity.currentCarrier} | Renews {formatLongDate(opportunity.renewalDate)}
            </p>
          </div>
          <div className="ss-savings-amount">
            <small>You save</small>
            <strong className="ss-savings-pos">{formatMoney(saving)}/yr</strong>
          </div>
        </div>

        <div className="ss-partner-offer-badge">
          <BadgeCheck size={13} />
          Offer provided by <b>{partnerName}</b>
          {quote.amRating && <span className="ss-am-rating">AM Best {quote.amRating}</span>}
        </div>

        <div className="ss-compare">
          <div className="ss-compare-col">
            <span className="ss-compare-label">Your current coverage</span>
            <b>{opportunity.currentCarrier}</b>
            <div className="ss-compare-rows">
              <span>Premium</span>
              <strong>{formatMoney(opportunity.currentPremium)}/yr</strong>
              <span>Deductible</span>
              <strong>{formatDeductible(policy?.deductible)}</strong>
              <span>Limit</span>
              <strong>{policy?.coverageLimits || policy?.limit || "N/A"}</strong>
            </div>
          </div>
          <div className="ss-compare-arrow" aria-hidden="true">
            <ArrowRight size={18} />
          </div>
          <div className="ss-compare-col recommended">
            <span className="ss-compare-label">
              <BadgeCheck size={13} /> {partnerName}'s offer
            </span>
            <b>{quote.carrier}</b>
            <div className="ss-compare-rows">
              <span>Premium</span>
              <strong className="ss-savings-pos">{formatMoney(quote.premium)}/yr</strong>
              <span>Deductible</span>
              <strong>{formatDeductible(quote.deductible)}</strong>
              <span>Limit</span>
              <strong>{quote.coverageLimits || "N/A"}</strong>
            </div>
          </div>
        </div>

        {quote.highlights?.length ? (
          <ul className="ss-quote-highlights">
            {quote.highlights.map((highlight) => (
              <li key={highlight}>
                <BadgeCheck size={13} /> {highlight}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="ss-row">
          <button type="button" className="ss-button" onClick={onGoToPurchase}>
            <ArrowRight size={16} /> Review options at {partnerName}
          </button>
          <button type="button" className="ss-button soft" onClick={onKeepCurrent}>
            Keep current
          </button>
          <button type="button" className="ss-button soft" onClick={onTalkToAdvisor}>
            Talk to a licensed partner
          </button>
        </div>
        <p className="ss-fine">
          This offer was provided by {partnerName}, a licensed insurance partner. Clicking "Review options"
          opens their site in a new tab. Coverage is reviewed, applied for, and issued entirely
          by the partner, not by SubShield. Return here to upload your new policy document.
          {quote.bindableUntil && ` Offer valid through ${formatLongDate(quote.bindableUntil)}.`}
        </p>
      </article>
    );
  }

  // -- Available: no quote yet -----------------------------------------------
  return (
    <article className="ss-savings-card">
      <div className="ss-savings-head">
        <div>
          <span className="ss-eyebrow">Savings opportunity</span>
          <h2>{name}</h2>
          <p className="ss-muted">
            Current carrier: {opportunity.currentCarrier} | Renews{" "}
            {formatLongDate(opportunity.renewalDate)}
          </p>
        </div>
        <div className="ss-savings-amount">
          <small>Est. savings</small>
          <strong className="ss-savings-pos">{formatMoney(saving)}/yr</strong>
        </div>
      </div>

      <div className="ss-info-grid">
        <Info label="Current premium" value={`${formatMoney(opportunity.currentPremium)}/yr`} />
        <Info label="Estimated savings" value={`${formatMoney(saving)}/yr`} hint="Illustrative. Partner confirms exact amount after review." />
      </div>
      {opportunity.notes ? <p className="ss-muted">{opportunity.notes}</p> : null}

      <div className="ss-row">
        <button type="button" className="ss-button" onClick={onRequestQuote} disabled={busy}>
          {busy ? (
            <><Spinner /> Submitting to partner...</>
          ) : (
            <><Search size={16} /> Request quote from partner</>
          )}
        </button>
        <button type="button" className="ss-button soft" onClick={onTalkToAdvisor}>
          Talk to a licensed partner
        </button>
        <button type="button" className="ss-button soft" onClick={onRemindLater}>
          <BellRing size={16} /> Remind me later
        </button>
        <button type="button" className="ss-button soft" onClick={onKeepCurrent}>
          <CircleOff size={16} /> Not interested
        </button>
      </div>
      <p className="ss-fine">
        Submitting sends your policy details to a licensed insurance partner for review.
        SubShield does not sell or quote insurance. The partner handles review, quotes, and issuance.
      </p>
    </article>
  );
}
