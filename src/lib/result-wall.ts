/** Only group unambiguous single-subject A/B results. Preserve other free-form results as written. */
export function resultGrade(value: string): "A" | "B" | null {
  const first = value.trim().split("·", 1)[0].trim();
  const match = /^(?:combined\s+(?:maths|mathematics)\s*:\s*)?([ab])$/i.exec(first);
  return match ? match[1].toUpperCase() as "A" | "B" : null;
}
