export function buildRuleVersionLabel(rule: EntryRuleWithLatestVersion) {
  return `${rule.name} / v${rule.latestVersion.versionNo}`;
}

export function parseChecklistText(value: string): string[] {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}
