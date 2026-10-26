import { readDocumentLocale } from '../utils/readDocumentLocale'

export * from './persianCalendar'

/** Calendar selection for date controls. `auto` follows the document locale. */
export type CalendarPreference = 'auto' | 'gregorian' | 'persian'
export type ResolvedCalendar = Exclude<CalendarPreference, 'auto'>

/** Match the Persian language subtag regardless of BCP 47 casing. */
export function isPersianLocale(locale: string): boolean {
  return /^fa(?:-|$)/i.test(locale)
}

/** Resolve the display calendar without changing canonical Gregorian values. */
export function resolveCalendar(
  preference: CalendarPreference | undefined,
  locale = readDocumentLocale(),
): ResolvedCalendar {
  if (preference === 'gregorian' || preference === 'persian') return preference
  return isPersianLocale(locale) ? 'persian' : 'gregorian'
}
