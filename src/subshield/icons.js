import {
  FileText,
  HardHat,
  Shield,
  ShieldCheck,
  Truck,
  Umbrella,
} from "lucide-react";

const POLICY_ICONS = {
  workers: HardHat,
  liability: ShieldCheck,
  auto: Truck,
  license: FileText,
  umbrella: Umbrella,
};

export function policyIcon(type) {
  return POLICY_ICONS[type] || Shield;
}
