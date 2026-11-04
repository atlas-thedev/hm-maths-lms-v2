/** Only group unambiguous single-subject A/B results. Preserve other free-form results as written. */
export function resultGrade(value: string): "A" | "B" | null {
  const first = value.trim().split("·", 1)[0].trim();
  const match = /^(?:combined\s+(?:maths|mathematics)\s*:\s*)?([ab])$/i.exec(first);
  return match ? match[1].toUpperCase() as "A" | "B" : null;
}

/** Extract only an explicitly labelled district rank; all original text stays visible. */
export function districtRank(value: string): { label: string; number: string } | null {
  for (const segment of value.split("·")) {
    const label = segment.trim();
    const match = /\bdistrict\s+(?:rank\s*)?#?\s*(\d{1,5})(?:st|nd|rd|th)?\s*$/i.exec(label);
    if (match) return { label, number: match[1] };
  }
  return null;
}
