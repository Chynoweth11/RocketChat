import {
  Briefcase,
  Building2,
  FileText,
  HardHat,
  Lock,
  PackageOpen,
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
  umbrella: Umbrella,
  property: Building2,
  cyber: Lock,
  equipment: PackageOpen,
  tools: Wrench,
  builders_risk: Building2,
  pollution: Shield,
  professional: Briefcase,
  bonding: Shield,
  license: FileText,
};

export function policyIcon(type) {
  return POLICY_ICONS[type] || Shield;
}
