import {
  Briefcase,
  FileText,
  HardHat,
  Shield,
  ShieldCheck,
  Truck,
  Umbrella,
  Wrench,
} from "lucide-react";

const POLICY_ICONS = {
  workers: HardHat,
  liability: ShieldCheck,
  auto: Truck,
  license: FileText,
  umbrella: Umbrella,
  professional: Briefcase,
  pollution: Shield,
  tools: Wrench,
  builders_risk: ShieldCheck,
  bonding: Shield,
};

export function policyIcon(type) {
  return POLICY_ICONS[type] || Shield;
}
