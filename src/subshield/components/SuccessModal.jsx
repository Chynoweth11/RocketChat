import { CheckCircle2, FileCheck2, RefreshCw } from "lucide-react";
import Modal from "./Modal.jsx";

export default function SuccessModal({ onClose, contractor, project, onSendAnother }) {
  return (
    <Modal title="Package delivered" onClose={onClose}>
      <div className="ss-success-body">
        <div className="ss-success-icon" aria-hidden="true">
          <CheckCircle2 size={48} />
        </div>

        <div className="ss-success-copy">
          <h2>COI sent successfully</h2>
          {contractor && project ? (
            <p>
              <strong>{contractor.name}</strong> received your verified insurance package
              for <strong>{project}</strong>.
            </p>
          ) : (
            <p>Your verified insurance package was sent and logged.</p>
          )}
        </div>

        <div className="ss-success-checklist">
          <div className="ss-success-check">
            <CheckCircle2 size={15} />
            <span>Certificate delivered to {contractor?.email || "recipient"}</span>
          </div>
          <div className="ss-success-check">
            <CheckCircle2 size={15} />
            <span>Send logged in your delivery history</span>
          </div>
          <div className="ss-success-check">
            <CheckCircle2 size={15} />
            <span>Project saved for future 1-click resends</span>
          </div>
          {contractor && (
            <div className="ss-success-check">
              <FileCheck2 size={15} />
              <span>Holder wording and delivery rules saved for {contractor.name}</span>
            </div>
          )}
        </div>

        <div className="ss-success-actions">
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
