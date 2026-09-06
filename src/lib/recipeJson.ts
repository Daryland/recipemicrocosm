/** ingredients/steps are stored as JSON-encoded strings (see prisma/schema.prisma). */
export function encodeStringList(items: string[]): string {
  return JSON.stringify(items);
}

export function decodeStringList(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}
