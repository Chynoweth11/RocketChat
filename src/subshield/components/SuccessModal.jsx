import { CheckCircle2 } from "lucide-react";
import Modal from "./Modal.jsx";

export default function SuccessModal({ onClose, contractor, project }) {
  return (
    <Modal title="Package delivered" onClose={onClose}>
      <div className="ss-empty" style={{ minHeight: 240 }}>
        <CheckCircle2 size={56} color="#0b7f5d" />
        <h2>Verified COI package sent</h2>
        <p>
          {contractor && project ? (
            <>
              {contractor.name} received your verified package for{" "}
              <strong>{project}</strong>. The send was saved to the activity
              log and the project is now available for 1-tap re-sends.
            </>
          ) : (
            "The send was saved to the activity log."
          )}
        </p>
        <button type="button" className="ss-button" onClick={onClose}>
          Done
        </button>
      </div>
    </Modal>
  );
}
