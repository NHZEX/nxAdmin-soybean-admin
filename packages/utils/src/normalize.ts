export function trimToEmpty(value: string | null | undefined): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

export function trimToNull(value: string | null | undefined): string | null {
  const trimmed = trimToEmpty(value);
  return trimmed || null;
}

export function trimToUndefined(value: string | null | undefined): string | undefined {
  const trimmed = trimToEmpty(value);
  return trimmed || undefined;
}
