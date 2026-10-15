/** Read the validated document language without importing Vue reactivity. */
export function readDocumentLocale(): string {
  if (typeof document === 'undefined') return 'en-US'
  const lang = document.documentElement.lang
  if (!lang) return 'en-US'
  try {
    Intl.getCanonicalLocales(lang)
    return lang
  } catch {
    return 'en-US'
  }
}
