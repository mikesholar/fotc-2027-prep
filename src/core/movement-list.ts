export type MovementGroup = { lead: string | null; items: string[] };

export type MovementBody =
  | { kind: "paragraph"; text: string }
  | { kind: "list"; groups: MovementGroup[] };

const ITEM_SEP = " · ";
const LEAD_PATTERN = /^(.+?:)\s+(.+)$/;

const splitItems = (text: string): string[] =>
  text
    .split(ITEM_SEP)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

export const parseMovementBody = (text: string): MovementBody => {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const groups: MovementGroup[] = [];
  let leadlessGroup: MovementGroup | null = null;

  for (const line of lines) {
    const match = line.match(LEAD_PATTERN);
    if (match && match[2].includes(ITEM_SEP)) {
      groups.push({ lead: match[1], items: splitItems(match[2]) });
      leadlessGroup = null;
      continue;
    }

    if (leadlessGroup === null) {
      leadlessGroup = { lead: null, items: [] };
      groups.push(leadlessGroup);
    }
    leadlessGroup.items.push(...splitItems(line));
  }

  const [only] = groups;
  if (groups.length === 1 && only.lead === null && only.items.length === 1) {
    return { kind: "paragraph", text: only.items[0] };
  }

  return { kind: "list", groups };
};
