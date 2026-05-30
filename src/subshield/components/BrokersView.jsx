import {
  BriefcaseBusiness,
  Building2,
  Mail,
  Phone,
  Plus,
  Send,
} from "lucide-react";
import { Section } from "./Layout.jsx";

export default function BrokersView({
  brokers,
  partners,
  onAddBroker,
  onRequestBrokerQuote,
  onRequestPartnerQuote,
}) {
  return (
    <div className="ss-grid">
      <section className="ss-card ss-span">
        <Section
          title="Coverage & Savings Network"
          sub="Connect your insurance tracker to licensed advisors, brokers, carriers, and quote partners to review renewals, close coverage gaps, and lower premiums."
          extra={
            <button type="button" className="ss-button soft" onClick={onAddBroker}>
              <Plus size={15} /> Add review partner
            </button>
          }
        />

        <div className="ss-info-grid">
          <div className="ss-info">
            <span>Use this network for</span>
            <b>Renewal review + quote comparison</b>
          </div>
          <div className="ss-info">
            <span>Best fit for</span>
            <b>Overpriced, expiring, or missing coverage</b>
          </div>
        </div>
      </section>

      <section className="ss-card ss-span">
        <Section
          title="Insurance Review Partners"
          sub="Your trusted contacts for COI updates, endorsements, renewal reviews, and policy guidance."
        />

        {brokers.length === 0 && (
          <div className="ss-empty">
            <BriefcaseBusiness size={28} />
            <h2>No insurance review partners yet</h2>
            <p>Add a trusted advisor so renewal and coverage review requests are one click.</p>
          </div>
        )}

        {brokers.map((broker) => (
          <div className="ss-broker-card" key={broker.id}>
            <div className="ss-gc-avatar" aria-hidden="true">
              {broker.name?.slice(0, 2).toUpperCase() || "BR"}
            </div>
            <div className="ss-gc-copy">
              <b>{broker.name}</b>
              <small>{broker.company}</small>
              <small>
                <Mail size={12} style={{ marginRight: 4, verticalAlign: -2 }} />
                {broker.email}
                {broker.phone ? (
                  <>
                    {" "}
                    - <Phone size={12} style={{ marginRight: 4, verticalAlign: -2 }} />
                    {broker.phone}
                  </>
                ) : null}
              </small>
              {broker.policyTypes?.length ? (
                <small>Policy types: {broker.policyTypes.join(", ")}</small>
              ) : null}
            </div>
            <button
              type="button"
              className="ss-button"
              style={{ minHeight: 36, padding: "8px 14px" }}
              onClick={() => onRequestBrokerQuote(broker)}
            >
              <Send size={14} /> Request coverage review
            </button>
          </div>
        ))}
      </section>

      <section className="ss-card ss-span">
        <Section
          title="Quote Partners Marketplace"
          sub="Request competitive pricing and policy options from licensed coverage and savings partners."
        />
        {partners.filter((item) => item.active).map((partner) => (
          <div className="ss-broker-card" key={partner.id}>
            <div className="ss-gc-avatar" aria-hidden="true">
              <Building2 size={16} />
            </div>
            <div className="ss-gc-copy">
              <b>{partner.name}</b>
              <small>
                {partner.type} - {partner.statesServed.join(", ")}
              </small>
              <small>Policy types: {partner.policyTypes.join(", ")}</small>
              <small>Trades: {partner.tradeTypes.join(", ")}</small>
            </div>
            <button
              type="button"
              className="ss-button soft"
              style={{ minHeight: 36, padding: "8px 14px" }}
              onClick={() => onRequestPartnerQuote(partner)}
            >
              <Send size={14} /> Request savings quote
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}
