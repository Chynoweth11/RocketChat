import { Component } from "react";
import { clearStoredData } from "../utils.js";

/**
 * App-wide error boundary. Prevents a single render error from white-screening
 * the entire workspace — instead the user sees a recoverable fallback and the
 * option to reload or restore local data.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Surface for diagnostics; in a real backend this would ship to logging.
    console.error("SubShield render error:", error, info?.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleRestore = () => {
    // Use the shared helper so this always targets the current storage key
    // (rather than a hard-coded version that can drift out of sync).
    clearStoredData();
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="ss-fatal">
        <div className="ss-fatal-card">
          <span className="ss-fatal-mark" aria-hidden="true">
            !
          </span>
          <h1>Something went wrong</h1>
          <p>
            The workspace hit an unexpected error. Your saved data is still on this
            device — try reloading. If the problem keeps happening, restoring will
            clear local data and start fresh.
          </p>
          {this.state.error?.message && (
            <code className="ss-fatal-detail">{this.state.error.message}</code>
          )}
          <div className="ss-fatal-actions">
            <button type="button" className="ss-button" onClick={this.handleReload}>
              Reload workspace
            </button>
            <button type="button" className="ss-button soft" onClick={this.handleRestore}>
              Restore local data
            </button>
          </div>
        </div>
      </div>
    );
  }
}
