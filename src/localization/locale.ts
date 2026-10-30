/** Match Persian language tags with BCP 47 or legacy Frappe separators. */
export function isPersianLocale(locale: string): boolean {
  return /^fa(?:[-_]|$)/i.test(locale)
}

/** Intl APIs accept BCP 47 separators; Frappe may provide legacy underscores. */
export function toIntlLocale(locale: string): string {
  return locale.replace(/_/g, '-')
}
