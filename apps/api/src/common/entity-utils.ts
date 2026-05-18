export function normalizeOptionalText(value?: string | null) {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function normalizeEmailAddress(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeCountryCode(value: string) {
  const normalized = value.trim().replace(/\s+/g, '');
  return normalized.startsWith('+') ? normalized : `+${normalized.replace(/^\+/, '')}`;
}

export function normalizePhoneNumber(value: string) {
  return value.trim().replace(/\s+/g, '');
}

export function phoneLabel(countryCode: string, phone: string) {
  return `${countryCode} ${phone}`;
}

export function dedupeIds(ids?: string[]) {
  if (!ids) {
    return undefined;
  }

  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
}
