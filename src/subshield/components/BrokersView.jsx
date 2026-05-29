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
          title="Broker workflow"
          sub="Store broker contacts and request renewals, endorsements, and quote reviews."
          extra={
            <button type="button" className="ss-button soft" onClick={onAddBroker}>
              <Plus size={15} /> Add broker
            </button>
          }
        />

        {brokers.length === 0 && (
          <div className="ss-empty">
            <BriefcaseBusiness size={28} />
            <h2>No broker contacts yet</h2>
            <p>Add a broker contact to request renewal reviews and COI updates faster.</p>
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
              <Send size={14} /> Request review
            </button>
          </div>
        ))}
      </section>

      <section className="ss-card ss-span">
        <Section title="Partner marketplace" sub="Route quote requests to licensed partners" />
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
              <Send size={14} /> Request quote
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}
