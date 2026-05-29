import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { copyToClipboard } from "../utils.js";

export default function CopyButton({ text, label = "Copy", small = false }) {
  const [copied, setCopied] = useState(false);

  const handleClick = async (event) => {
    event.stopPropagation();
    const ok = await copyToClipboard(text);
    if (!ok) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <button
      type="button"
      className={`ss-copy-btn ${copied ? "copied" : ""}`}
      onClick={handleClick}
      aria-label={copied ? "Copied" : label}
    >
      {copied ? <Check size={small ? 12 : 13} /> : <Copy size={small ? 12 : 13} />}
      {copied ? "Copied" : label}
    </button>
  );
}
