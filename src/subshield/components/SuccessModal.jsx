import { Check, RefreshCw } from "lucide-react";
import Modal from "./Modal.jsx";

export default function SuccessModal({ onClose, contractor, project, onSendAnother }) {
  const email = contractor?.email || "the recipient";

  return (
    <Modal title="Certificate sent" onClose={onClose} className="ss-sent-modal">
      <div className="ss-sent">
        <span className="ss-sent-badge">
          <Check size={12} aria-hidden="true" /> Delivered
        </span>

        <p className="ss-sent-lead">
          {contractor && project ? (
            <>
              <b>{contractor.name}</b> received the verified insurance package for{" "}
              <b>{project}</b>.
            </>
          ) : (
            <>Your verified insurance package was sent and logged.</>
          )}
        </p>

        <div className="ss-sent-summary">
          <div className="ss-sent-row">
            <Check size={14} aria-hidden="true" />
            <span>
              Delivered to <b>{email}</b>
            </span>
          </div>
          <div className="ss-sent-row">
            <Check size={14} aria-hidden="true" />
            <span>Logged to your delivery history</span>
          </div>
          <div className="ss-sent-row">
            <Check size={14} aria-hidden="true" />
            <span>Project saved for one-click resends</span>
          </div>
          {contractor && (
            <div className="ss-sent-row">
              <Check size={14} aria-hidden="true" />
              <span>Holder wording saved for {contractor.name}</span>
            </div>
          )}
        </div>

        <div className="ss-sent-actions">
          <button type="button" className="ss-button" onClick={onClose}>
            Done
          </button>
          {contractor && (
            <button
              type="button"
              className="ss-button soft"
              onClick={() => {
                onClose();
                if (onSendAnother) onSendAnother();
              }}
            >
              <RefreshCw size={14} /> Send another
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
