export type EntryRuleStatus = "active" | "archived";

export type EntryRuleVersion = {
  id: number;
  entryRuleId: number;
  versionNo: number;
  content: string;
  checklist: string[];
  createdAt: string;
};

export type EntryRuleWithLatestVersion = {
  id: number;
  name: string;
  description: string | null;
  marketType: string | null;
  status: EntryRuleStatus;
  createdAt: string;
  updatedAt: string;
  latestVersion: EntryRuleVersion;
};

export type CreateEntryRuleInput = {
  name: string;
  description?: string | null;
  marketType?: string | null;
  content: string;
  checklist?: string[];
};

export type CreateEntryRuleVersionInput = {
  entryRuleId: number;
  content: string;
  checklist?: string[];
};
