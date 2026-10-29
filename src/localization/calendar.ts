import { readDocumentLocale } from '../utils/readDocumentLocale'
import { isPersianLocale } from './locale'

export * from './persianCalendar'
export { isPersianLocale, toIntlLocale } from './locale'

/** Calendar selection for date controls. `auto` follows the document locale. */
export type CalendarPreference = 'auto' | 'gregorian' | 'persian'
export type ResolvedCalendar = Exclude<CalendarPreference, 'auto'>

/** Resolve the display calendar without changing canonical Gregorian values. */
export function resolveCalendar(
  preference: CalendarPreference | undefined,
  locale = readDocumentLocale(),
): ResolvedCalendar {
  if (preference === 'gregorian' || preference === 'persian') return preference
  return isPersianLocale(locale) ? 'persian' : 'gregorian'
}
