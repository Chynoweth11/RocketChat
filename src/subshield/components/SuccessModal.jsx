import { Check, RefreshCw } from "lucide-react";
import Modal from "./Modal.jsx";

export default function SuccessModal({ onClose, contractor, project, onSendAnother }) {
  const email = contractor?.email;

  return (
    <Modal title="Certificate sent" onClose={onClose} className="ss-sent-modal">
      <div className="ss-sent">
        <div className="ss-sent-mark" aria-hidden="true">
          <Check size={22} strokeWidth={2.5} />
        </div>

        <h3 className="ss-sent-title" aria-hidden="true">
          Certificate sent
        </h3>

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

        {email && (
          <div className="ss-sent-meta">
            <span>Sent to</span>
            <b>{email}</b>
          </div>
        )}

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
