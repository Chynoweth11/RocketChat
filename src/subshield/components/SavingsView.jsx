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
import { Section, Info, Spinner } from "./Layout.jsx";

const FILTERS = [
  { id: "open", label: "Needs action" },
  { id: "all", label: "All" },
  { id: "available", label: "Available" },
  { id: "quote_received", label: "Quote ready" },
  { id: "accepted", label: "Switched" },
  { id: "remind_later", label: "Snoozed" },
  { id: "dismissed", label: "Dismissed" },
];

const STEPS = [
  { icon: ShieldCheck, title: "We review", text: "Your policies, premiums, and renewals are analyzed." },
  { icon: Search, title: "We shop", text: "Licensed partners quote comparable coverage." },
  { icon: TrendingDown, title: "You compare", text: "See current vs. better, side by side." },
  { icon: BadgeCheck, title: "You switch", text: "Approve in a click — we handle the paperwork." },
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
  onFindBetterRate,
  onAcceptQuote,
  onKeepCurrent,
  onTalkToAdvisor,
  onRemindLater,
  onReactivate,
  onAddAdvisor,
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
          ? ["available", "quote_received"].includes(opportunity.status)
          : opportunity.status === statusFilter;
      return matchesQuery && matchesFilter;
    });
  }, [opportunities, policyById, query, statusFilter]);

  const availableCount = opportunities.filter((item) =>
    ["available", "quote_received"].includes(item.status)
  ).length;
  const switchedCount = opportunities.filter((item) => item.status === "accepted").length;

  return (
    <div className="ss-grid">
      <section className="ss-card ss-span">
        <div className="ss-hero">
          <div>
            <span className="ss-eyebrow">Savings center</span>
            <h2>{formatMoney(potentialSavings)}/yr in savings found</h2>
            <p>
              Like a money app for your business insurance — we review your coverage,
              shop licensed partners, and show you better options. You decide what to
              switch. No cost to compare.
            </p>
            <div className="ss-trust-strip">
              <ShieldCheck size={14} />
              <span>
                Backed by a licensed partner network ·{" "}
                {partners
                  .filter((p) => p.active)
                  .slice(0, 4)
                  .map((p) => p.name)
                  .join(", ")}
              </span>
            </div>
          </div>
          <div className="ss-command-tip">
            <b>Your savings</b>
            <div className="ss-savings-stack">
              <div>
                <small>Available now</small>
                <strong className="ss-savings-pos">{formatMoney(potentialSavings)}/yr</strong>
              </div>
              <div>
                <small>Locked in</small>
                <strong>{formatMoney(realizedSavings)}/yr</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="ss-steps">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <div className="ss-step" key={step.title}>
                <span className="ss-step-index">{index + 1}</span>
                <span className="ss-step-icon" aria-hidden="true">
                  <Icon size={16} />
                </span>
                <b>{step.title}</b>
                <small>{step.text}</small>
              </div>
            );
          })}
        </div>
      </section>

      <section className="ss-card ss-span">
        <Section
          title="Savings opportunities"
          sub="Comparable coverage at a lower cost, reviewed for you."
          extra={
            <span className="ss-section-extra">
              {availableCount} open · {switchedCount} switched
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
            <p>Add your policies and we'll surface savings as renewals approach.</p>
          </div>
        )}

        {opportunities.length > 0 && filteredOpportunities.length === 0 && (
          <div className="ss-empty" style={{ minHeight: 160 }}>
            <Search size={28} />
            <h2>Nothing here</h2>
            <p>Try a different filter or search term.</p>
          </div>
        )}

        <div className="ss-savings-list">
          {filteredOpportunities.map((opportunity) => (
            <OpportunityCard
              key={opportunity.id}
              opportunity={opportunity}
              policy={policyById.get(opportunity.policyId)}
              busy={findingId === opportunity.id}
              onFindBetterRate={() => onFindBetterRate(opportunity)}
              onAcceptQuote={() => onAcceptQuote(opportunity)}
              onKeepCurrent={() => onKeepCurrent(opportunity)}
              onTalkToAdvisor={() => onTalkToAdvisor(opportunity)}
              onRemindLater={() => onRemindLater(opportunity)}
              onReactivate={() => onReactivate(opportunity)}
            />
          ))}
        </div>
      </section>

      <section className="ss-card">
        <Section title="Quote history" sub="Requests routed to licensed partners and advisors" />
        {quoteRequests.length === 0 && (
          <div className="ss-empty" style={{ minHeight: 160 }}>
            <History size={28} />
            <h2>No quote requests yet</h2>
            <p>Request a quote to start tracking partner responses here.</p>
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
        <Section
          title="Your advisors"
          sub="Trusted contacts for renewals and coverage questions"
          extra={
            <button type="button" className="ss-button soft ss-button-sm" onClick={onAddAdvisor}>
              <Plus size={14} /> Add
            </button>
          }
        />
        {brokers.length === 0 && (
          <div className="ss-note">
            <Sparkles size={16} />
            <span>No advisor saved. Add one for one-click coverage reviews.</span>
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
          <span className="ss-eyebrow">Licensed partner network</span>
          <div className="ss-partner-chips">
            {partners
              .filter((p) => p.active)
              .map((partner) => (
                <span className="ss-partner-chip" key={partner.id} title={partner.amRating || ""}>
                  <ShieldCheck size={12} /> {partner.name}
                </span>
              ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function OpportunityCard({
  opportunity,
  policy,
  busy,
  onFindBetterRate,
  onAcceptQuote,
  onKeepCurrent,
  onTalkToAdvisor,
  onRemindLater,
  onReactivate,
}) {
  const status = opportunity.status;
  const saving = savingsForOpportunity(opportunity);
  const name = policy?.name || policyLabelFromType(opportunity.policyType);
  const quote = opportunity.alternateQuote;

  if (status === "accepted") {
    return (
      <article className="ss-savings-card accepted">
        <div className="ss-savings-head">
          <div>
            <span className="ss-eyebrow">Switched & saving</span>
            <h2>{name}</h2>
            <p className="ss-muted">
              Now with {opportunity.alternateQuote?.carrier || opportunity.currentCarrier}.
            </p>
          </div>
          <div className="ss-savings-amount">
            <small>You're saving</small>
            <strong className="ss-savings-pos">{formatMoney(saving)}/yr</strong>
          </div>
        </div>
        <div className="ss-note success">
          <BadgeCheck size={16} />
          <span>Coverage switched and logged. We'll keep watching for future savings.</span>
        </div>
      </article>
    );
  }

  if (status === "dismissed" || status === "remind_later") {
    return (
      <article className="ss-savings-card muted">
        <div className="ss-savings-head">
          <div>
            <span className="ss-eyebrow">{quoteStatusLabel(status)}</span>
            <h2>{name}</h2>
            <p className="ss-muted">
              {status === "remind_later"
                ? "Snoozed — we'll resurface this near renewal."
                : "Dismissed. Reopen anytime to compare again."}
            </p>
          </div>
          <button type="button" className="ss-button soft ss-button-sm" onClick={onReactivate}>
            Reopen
          </button>
        </div>
      </article>
    );
  }

  // available or quote_received
  return (
    <article className="ss-savings-card">
      <div className="ss-savings-head">
        <div>
          <span className="ss-eyebrow">
            {status === "quote_received" ? "Quote ready" : "Savings available"}
          </span>
          <h2>{name}</h2>
          <p className="ss-muted">
            Current carrier {opportunity.currentCarrier} · Renews{" "}
            {formatLongDate(opportunity.renewalDate)}
          </p>
        </div>
        <div className="ss-savings-amount">
          <small>{status === "quote_received" ? "You save" : "Est. savings"}</small>
          <strong className="ss-savings-pos">{formatMoney(saving)}/yr</strong>
        </div>
      </div>

      {status === "quote_received" && quote ? (
        <>
          <div className="ss-compare">
            <div className="ss-compare-col">
              <span className="ss-compare-label">Current</span>
              <b>{opportunity.currentCarrier}</b>
              <div className="ss-compare-rows">
                <span>Premium</span>
                <strong>{formatMoney(opportunity.currentPremium)}/yr</strong>
                <span>Deductible</span>
                <strong>{formatDeductible(policy?.deductible)}</strong>
                <span>Limit</span>
                <strong>{policy?.coverageLimits || "—"}</strong>
              </div>
            </div>
            <div className="ss-compare-arrow" aria-hidden="true">
              <ArrowRight size={18} />
            </div>
            <div className="ss-compare-col recommended">
              <span className="ss-compare-label">
                <BadgeCheck size={13} /> Recommended
              </span>
              <b>{quote.carrier}</b>
              <div className="ss-compare-rows">
                <span>Premium</span>
                <strong className="ss-savings-pos">{formatMoney(quote.premium)}/yr</strong>
                <span>Deductible</span>
                <strong>{formatDeductible(quote.deductible)}</strong>
                <span>Limit</span>
                <strong>{quote.coverageLimits || "—"}</strong>
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
            <button type="button" className="ss-button" onClick={onAcceptQuote}>
              <BadgeCheck size={16} /> Accept & switch
            </button>
            <button type="button" className="ss-button soft" onClick={onKeepCurrent}>
              Keep current
            </button>
            <button type="button" className="ss-button soft" onClick={onTalkToAdvisor}>
              Talk to advisor
            </button>
          </div>
          {quote.amRating ? (
            <p className="ss-fine">
              {quote.carrier} · AM Best rating {quote.amRating}. Quote valid through{" "}
              {formatLongDate(quote.bindableUntil)}.
            </p>
          ) : null}
        </>
      ) : (
        <>
          <div className="ss-info-grid">
            <Info label="Current premium" value={`${formatMoney(opportunity.currentPremium)}/yr`} />
            <Info label="Estimated savings" value={`${formatMoney(saving)}/yr`} />
          </div>
          {opportunity.notes ? <p className="ss-muted">{opportunity.notes}</p> : null}
          <div className="ss-row">
            <button type="button" className="ss-button" onClick={onFindBetterRate} disabled={busy}>
              {busy ? (
                <>
                  <Spinner /> Shopping rates...
                </>
              ) : (
                <>
                  <Search size={16} /> Find me a better rate
                </>
              )}
            </button>
            <button type="button" className="ss-button soft" onClick={onTalkToAdvisor}>
              Talk to advisor
            </button>
            <button type="button" className="ss-button soft" onClick={onRemindLater}>
              <BellRing size={16} /> Snooze
            </button>
            <button type="button" className="ss-button soft" onClick={onKeepCurrent}>
              <CircleOff size={16} /> Not interested
            </button>
          </div>
        </>
      )}
    </article>
  );
}
