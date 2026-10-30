/** Read the validated document language without importing Vue reactivity. */
export function readDocumentLocale(): string {
  if (typeof document === 'undefined') return 'en-US'
  const lang = document.documentElement.lang
  if (!lang) return 'en-US'
  const normalized = lang.replace(/_/g, '-')
  try {
    Intl.getCanonicalLocales(normalized)
    return normalized
  } catch {
    return 'en-US'
  }
}
