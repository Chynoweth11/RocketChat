import { Check } from "lucide-react";
import {
  ENDORSEMENT_TYPES,
  LIMIT_OPTIONS,
  REQUIREMENT_COVERAGE_TYPES,
  policyLabelFromType,
} from "../utils.js";

/**
 * Structured editor for a GC's COI coverage requirements. Produces an array of
 * { policyType, minLimit, additionalInsured, waiverOfSubrogation,
 * primaryNonContributory } objects that SubShield can match against the
 * contractor's real policies (see checkCompliance in utils.js).
 */
export default function RequirementsBuilder({ value = [], onChange }) {
  const byType = new Map(value.map((req) => [req.policyType, req]));

  function toggleType(type) {
    if (byType.has(type)) {
      onChange(value.filter((req) => req.policyType !== type));
    } else {
      onChange([
        ...value,
        { policyType: type, minLimit: type === "workers" ? 0 : 1000000 },
      ]);
    }
  }

  function update(type, patch) {
    onChange(value.map((req) => (req.policyType === type ? { ...req, ...patch } : req)));
  }

  return (
    <div className="ss-req-builder">
      <p className="ss-req-hint">
        Pick what this GC requires on certificates. SubShield checks each send against
        your policies and flags gaps before you send.
      </p>

      {REQUIREMENT_COVERAGE_TYPES.map((type) => {
        const req = byType.get(type);
        const on = Boolean(req);
        return (
          <div key={type} className={`ss-req-row${on ? " active" : ""}`}>
            <button
              type="button"
              className="ss-req-toggle"
              onClick={() => toggleType(type)}
              aria-pressed={on}
            >
              <span className={`ss-req-check${on ? " on" : ""}`} aria-hidden="true">
                {on ? <Check size={12} /> : null}
              </span>
              <span>{policyLabelFromType(type)}</span>
            </button>

            {on && (
              <div className="ss-req-controls">
                {type !== "workers" && (
                  <label className="ss-req-limit">
                    <span>Min limit</span>
                    <select
                      value={req.minLimit}
                      onChange={(event) => update(type, { minLimit: Number(event.target.value) })}
                    >
                      {LIMIT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <div className="ss-req-endorsements">
                  {ENDORSEMENT_TYPES.map((endorsement) => (
                    <label key={endorsement.key} className="ss-req-endorsement">
                      <input
                        type="checkbox"
                        checked={Boolean(req[endorsement.key])}
                        onChange={(event) =>
                          update(type, { [endorsement.key]: event.target.checked })
                        }
                      />
                      <span>{endorsement.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
