import { computed, type ComputedRef } from 'vue'
import {
  documentAttributes,
  documentDir,
  documentLocale,
} from '#utils/documentAttributes'
export { resolveCalendar } from './calendar'
export type { CalendarPreference, ResolvedCalendar } from './calendar'

/** Reactive language and direction declared on `document.documentElement`. */
export interface DocumentLocale {
  /** The validated `lang` attribute, or `en-US` when none is declared. */
  locale: ComputedRef<string>
  /** The declared `dir` attribute, normalized to `ltr` or `rtl`. */
  direction: ComputedRef<'ltr' | 'rtl'>
}

/** Intl date options with an optional literal separator for separate endpoints. */
export interface LocaleDateRangeFormatOptions
  extends Intl.DateTimeFormatOptions {
  /** When set, format both endpoints separately using this separator. */
  rangeSeparator?: string
}

/**
 * Read the document's current language and direction reactively.
 *
 * The owning application sets `<html lang="fa-IR" dir="rtl">`; this composable
 * observes those attributes and never changes them.
 */
export function useDocumentLocale(): DocumentLocale {
  return {
    locale: computed(() => {
      documentAttributes()
      return documentLocale()
    }),
    direction: computed(() => {
      documentAttributes()
      return documentDir()
    }),
  }
}

/**
 * Format a display value using the language declared on the document.
 * `null`, `undefined`, and `NaN` mean no value and return an empty string;
 * zero remains a real value. Data passed to this helper is never mutated.
 */
export function formatLocaleNumber(
  value: number | null | undefined,
  options: Intl.NumberFormatOptions = {},
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return ''
  return new Intl.NumberFormat(documentLocale(), options).format(value)
}

/**
 * Format a date for display using the document language and Intl calendar data.
 * A date-only ISO value is interpreted as a calendar date in UTC, so it cannot
 * shift to the previous day when the browser is behind UTC. When no options are
 * given, the browser formats a medium-length date in UTC. Pass `calendar:
 * 'persian'` to request Jalali presentation explicitly; the input remains a
 * Gregorian/ISO date and is not changed.
 *
 * Date-time strings must be parseable by `Date`; pass `timeZone` when the
 * display must use a specific zone. Invalid or empty values return an empty
 * string.
 */
export function formatLocaleDate(
  value: Date | string | number | null | undefined,
  options: Intl.DateTimeFormatOptions = {},
): string {
  if (value === null || value === undefined || value === '') return ''

  const parsed = parseDisplayDate(value)
  if (!parsed) return ''

  const hasDateOptions = Object.keys(options).length > 0
  const formatOptions: Intl.DateTimeFormatOptions = hasDateOptions
    ? { ...options }
    : { dateStyle: 'medium' }

  if (parsed.dateOnly) formatOptions.timeZone = 'UTC'
  else if (!formatOptions.timeZone) formatOptions.timeZone = 'UTC'

  return new Intl.DateTimeFormat(documentLocale(), formatOptions).format(
    parsed.date,
  )
}

/**
 * Format a date range using the document language and Intl calendar data.
 * Date-only `YYYY-MM-DD` endpoints are interpreted as UTC calendar dates to
 * avoid timezone day shifts. Inputs remain unchanged; invalid or absent
 * endpoints, and reversed ranges, return an empty string.
 */
export function formatLocaleDateRange(
  start: Date | string | number | null | undefined,
  end: Date | string | number | null | undefined,
  options: LocaleDateRangeFormatOptions = {},
): string {
  if (
    start === null ||
    start === undefined ||
    start === '' ||
    end === null ||
    end === undefined ||
    end === ''
  ) {
    return ''
  }

  const parsedStart = parseDisplayDate(start)
  const parsedEnd = parseDisplayDate(end)
  if (
    !parsedStart ||
    !parsedEnd ||
    parsedStart.date.getTime() > parsedEnd.date.getTime()
  ) {
    return ''
  }

  const { rangeSeparator, ...dateOptions } = options
  const hasDateOptions = Object.keys(dateOptions).length > 0
  const formatOptions: Intl.DateTimeFormatOptions = hasDateOptions
    ? { ...dateOptions }
    : { dateStyle: 'medium' }

  if (parsedStart.dateOnly && parsedEnd.dateOnly) {
    formatOptions.timeZone = 'UTC'
  } else if (!formatOptions.timeZone) {
    formatOptions.timeZone = 'UTC'
  }

  const formatter = new Intl.DateTimeFormat(documentLocale(), formatOptions)
  if (rangeSeparator !== undefined) {
    return `${formatter.format(parsedStart.date)}${rangeSeparator}${formatter.format(
      parsedEnd.date,
    )}`
  }
  return formatter.formatRange(parsedStart.date, parsedEnd.date)
}

function parseDisplayDate(
  value: Date | string | number,
): { date: Date; dateOnly: boolean } | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? null
      : { date: value, dateOnly: false }
  }

  if (typeof value === 'number') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : { date, dateOnly: false }
  }

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (dateOnly) {
    const [, year, month, day] = dateOnly
    const date = new Date(0)
    date.setUTCHours(0, 0, 0, 0)
    date.setUTCFullYear(Number(year), Number(month) - 1, Number(day))
    if (
      date.getUTCFullYear() !== Number(year) ||
      date.getUTCMonth() !== Number(month) - 1 ||
      date.getUTCDate() !== Number(day)
    ) {
      return null
    }
    return { date, dateOnly: true }
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : { date, dateOnly: false }
}
