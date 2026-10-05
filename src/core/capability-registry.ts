import { capability as qualifyAndBid } from "../capabilities/qualify-and-bid/index.js";

export type CapabilityNavigationItem = {
  id: string;
  label: string;
  page: string;
};

export type CapabilityDefinition = {
  id: string;
  label: string;
  version: string;
  status: "active" | "draft" | "disabled";
  navigation: CapabilityNavigationItem[];
  workflow: readonly string[];
};

const registry: CapabilityDefinition[] = [
  {
    id: qualifyAndBid.id,
    label: "QUALIFY_AND_BID",
    version: qualifyAndBid.version,
    status: "active",
    navigation: [
      { id: "operations", label: "Operations", page: "operations" },
      { id: "opportunities", label: "Opportunities", page: "opportunities" },
      { id: "qualification", label: "Qualification", page: "qualification" },
      { id: "activity", label: "Activity", page: "activity" },
      { id: "sources", label: "Tender Sources", page: "configuration" },
      { id: "platform-login", label: "Platform Login", page: "login" }
    ],
    workflow: qualifyAndBid.workflow
  }
];

export function listCapabilities(): CapabilityDefinition[] {
  return registry.filter((capability) => capability.status === "active");
}
