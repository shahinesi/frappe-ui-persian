import {
  computed,
  toValue,
  type ComputedRef,
  type MaybeRef,
  type MaybeRefOrGetter,
  unref,
} from 'vue'
import {
  documentAttributes,
  documentDir,
  documentLocale,
} from '#utils/documentAttributes'
import { toJalaali } from 'jalaali-js'
import { isPersianLocale, toIntlLocale } from './locale'
import { getPersianMonthName } from './persianCalendar'
export { resolveCalendar } from './calendar'
export type { CalendarPreference, ResolvedCalendar } from './calendar'

/** Reactive language and direction declared on `document.documentElement`. */
export interface DocumentLocale {
  /** The validated `lang` attribute, or `en-US` when none is declared. */
  locale: ComputedRef<string>
  /** The declared `dir` attribute, normalized to `ltr` or `rtl`. */
  direction: ComputedRef<'ltr' | 'rtl'>
}

/** A host application's translator, such as Frappe's `__` function. */
export type LocaleTranslator = (
  message: string,
) => string | null | undefined

const builtinPersianMessages: Record<string, string> = {
  'Select date': 'انتخاب تاریخ',
  'Select date & time': 'انتخاب تاریخ و ساعت',
  'Select option': 'انتخاب گزینه',
  'No results': 'نتیجه‌ای پیدا نشد',
  'Select range': 'انتخاب بازه',
  'Select time': 'انتخاب ساعت',
  Today: 'امروز',
  Now: 'اکنون',
  'Calendar dates': 'تاریخ‌های تقویم',
  'Select month and year': 'انتخاب ماه و سال',
  'Select year': 'انتخاب سال',
  'Select month': 'انتخاب ماه',
  Shortcuts: 'میانبرها',
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
 * Resolve a UI message through an optional host translator and refresh it when
 * the document language changes. Missing translations fall back to the source.
 */
export function useLocalizedText(
  message: MaybeRefOrGetter<string>,
  translator?: MaybeRef<LocaleTranslator | undefined>,
): ComputedRef<string> {
  const locale = useDocumentLocale().locale

  return computed(() => {
    locale.value
    const source = toValue(message)
    const translate = unref(translator)
    const localized = translate?.(source)
    if (
      typeof localized === 'string' &&
      localized.length > 0 &&
      localized !== source
    ) return localized
    return isPersianLocale(locale.value)
      ? (builtinPersianMessages[source] ?? source)
      : source
  })
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
  return new Intl.NumberFormat(toIntlLocale(documentLocale()), {
    ...options,
    numberingSystem: 'latn',
  }).format(value)
}

/**
 * Format a percentage value expressed in percentage points (for example, 12.5
 * means 12.5%). Keep digit characters canonical for the document font to
 * render; the document locale still controls other number formatting.
 */
export function formatLocalePercent(
  value: number | null | undefined,
  options: Intl.NumberFormatOptions = {},
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return ''
  return new Intl.NumberFormat(toIntlLocale(documentLocale()), {
    ...options,
    style: 'percent',
    numberingSystem: 'latn',
  }).format(value / 100)
}

/**
 * Format a date for display using the document language and jalaali-js when
 * Persian calendar presentation is requested or the document language is
 * Persian.
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

  const locale = documentLocale()
  const usePersianCalendar = shouldUsePersianCalendar(options.calendar, locale)
  const formatter = new Intl.DateTimeFormat(toIntlLocale(locale), {
    ...formatOptions,
    ...(usePersianCalendar ? { calendar: 'gregory' } : {}),
    numberingSystem: 'latn',
  })
  if (usePersianCalendar) {
    return formatJalaliParts(
      formatter.formatToParts(parsed.date),
      getJalaliFields(parsed.date, formatOptions.timeZone),
      locale,
      options,
    )
  }
  return formatter.format(parsed.date)
}

/**
 * Format a date range using the document language and jalaali-js for Persian
 * calendar presentation.
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

  const locale = documentLocale()
  const usePersianCalendar = shouldUsePersianCalendar(options.calendar, locale)
  const formatter = new Intl.DateTimeFormat(toIntlLocale(locale), {
    ...formatOptions,
    ...(usePersianCalendar ? { calendar: 'gregory' } : {}),
    numberingSystem: 'latn',
  })
  if (usePersianCalendar) {
    const startFields = getJalaliFields(parsedStart.date, formatOptions.timeZone)
    const endFields = getJalaliFields(parsedEnd.date, formatOptions.timeZone)
    if (rangeSeparator !== undefined) {
      const startText = formatJalaliParts(
        formatter.formatToParts(parsedStart.date),
        startFields,
        locale,
        options,
      )
      const endText = formatJalaliParts(
        formatter.formatToParts(parsedEnd.date),
        endFields,
        locale,
        options,
      )
      return `${startText}${rangeSeparator}${endText}`
    }
    const rangeParts = formatter.formatRangeToParts(
      parsedStart.date,
      parsedEnd.date,
    )
    const hasCollapsedJalaliField = rangeParts.some(
      (part) =>
        part.source === 'shared' &&
        ['year', 'month', 'day'].includes(part.type) &&
        mapJalaliDatePart(part, startFields, locale, options) !==
          mapJalaliDatePart(part, endFields, locale, options),
    )
    if (hasCollapsedJalaliField) {
      let lastStartPart = -1
      for (let index = rangeParts.length - 1; index >= 0; index--) {
        if (rangeParts[index].source === 'startRange') {
          lastStartPart = index
          break
        }
      }
      const firstEndPart = rangeParts.findIndex(
        (part) => part.source === 'endRange',
      )
      const separator = rangeParts
        .slice(lastStartPart + 1, firstEndPart)
        .find((part) => part.type === 'literal' && part.source === 'shared')
        ?.value ?? ' – '
      const startText = formatJalaliParts(
        formatter.formatToParts(parsedStart.date),
        startFields,
        locale,
        options,
      )
      const endText = formatJalaliParts(
        formatter.formatToParts(parsedEnd.date),
        endFields,
        locale,
        options,
      )
      return `${startText}${separator}${endText}`
    }
    return rangeParts
      .map((part) => {
        const fields = part.source === 'endRange' ? endFields : startFields
        return mapJalaliDatePart(part, fields, locale, options)
      })
      .join('')
  }
  if (rangeSeparator !== undefined) {
    return `${formatter.format(parsedStart.date)}${rangeSeparator}${formatter.format(
      parsedEnd.date,
    )}`
  }
  return formatter.formatRange(parsedStart.date, parsedEnd.date)
}

function shouldUsePersianCalendar(
  requestedCalendar: string | undefined,
  locale: string,
): boolean {
  return requestedCalendar === 'persian' ||
    (requestedCalendar === undefined && isPersianLocale(locale))
}

function getJalaliFields(date: Date, timeZone = 'UTC') {
  const parts = new Intl.DateTimeFormat('en-US-u-ca-gregory-nu-latn', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    timeZone,
  }).formatToParts(date)
  const fields = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return toJalaali(Number(fields.year), Number(fields.month), Number(fields.day))
}

function formatJalaliParts(
  parts: Intl.DateTimeFormatPart[],
  fields: ReturnType<typeof toJalaali>,
  locale: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return parts.map((part) => mapJalaliDatePart(part, fields, locale, options)).join('')
}

function mapJalaliDatePart(
  part: Intl.DateTimeFormatPart & { source?: 'startRange' | 'endRange' | 'shared' },
  fields: ReturnType<typeof toJalaali>,
  locale: string,
  options: Intl.DateTimeFormatOptions,
): string {
  if (part.type === 'year') {
    return options.year === '2-digit'
      ? String(fields.jy % 100).padStart(2, '0')
      : String(fields.jy)
  }
  if (part.type === 'day') {
    return options.day === '2-digit'
      ? String(fields.jd).padStart(2, '0')
      : String(fields.jd)
  }
  if (part.type === 'month') {
    if (options.month === 'numeric' || options.month === '2-digit') {
      return options.month === '2-digit'
        ? String(fields.jm).padStart(2, '0')
        : String(fields.jm)
    }
    const monthStyle =
      options.month ??
      (options.dateStyle === 'long' || options.dateStyle === 'full'
        ? 'long'
        : 'short')
    return getPersianMonthName(
      fields.jy,
      fields.jm,
      locale,
      monthStyle === 'narrow' ? 'short' : monthStyle,
    )
  }
  return part.value
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
