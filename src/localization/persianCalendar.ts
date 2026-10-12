import { documentLocale } from '../utils/documentAttributes'

/** A Persian calendar date; month is one-based (Farvardin = 1). */
export interface PersianCalendarDate {
  year: number
  month: number
  day: number
}

/** One cell in a Saturday-first Persian month grid. */
export interface PersianCalendarCell {
  /** Gregorian value suitable for Frappe APIs and DatePicker model values. */
  isoDate: string
  /** Persian-calendar date used for the visible day label. */
  persianDate: PersianCalendarDate
  dayLabel: string
  /** Saturday = 0, Sunday = 1, ..., Friday = 6. */
  weekday: number
  isCurrentMonth: boolean
}

export interface PersianCalendarMonth {
  year: number
  month: number
  monthName: string
  yearLabel: string
  weekdayLabels: string[]
  /** Six complete weeks, each with seven cells starting on Saturday. */
  weeks: PersianCalendarCell[][]
}

const MIN_SUPPORTED_YEAR = 1200
const MAX_SUPPORTED_YEAR = 1600
const DAY_IN_MS = 24 * 60 * 60 * 1000
const PERSIAN_PARTS = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', {
  calendar: 'persian',
  day: 'numeric',
  month: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

/**
 * Convert a Gregorian ISO date to its Persian calendar fields.
 * The input and returned fields are UTC calendar dates, not local instants.
 */
export function getPersianDateFromISO(isoDate: string): PersianCalendarDate {
  const date = parseISODate(isoDate)
  const parts = PERSIAN_PARTS.formatToParts(date)
  const year = Number(part(parts, 'year'))
  const month = Number(part(parts, 'month'))
  const day = Number(part(parts, 'day'))

  if (![year, month, day].every(Number.isInteger)) {
    throw new RangeError(
      `Cannot convert ISO date to Persian calendar: ${isoDate}`,
    )
  }

  return { year, month, day }
}

/**
 * Convert a Persian calendar date to a Gregorian YYYY-MM-DD value.
 * Intl supplies the calendar conversion; unsupported years and invalid days
 * fail explicitly instead of rolling into another month.
 */
export function getISODateFromPersianDate(
  persianDate: PersianCalendarDate,
): string {
  const { year, month, day } = persianDate
  if (
    !Number.isInteger(year) ||
    year < MIN_SUPPORTED_YEAR ||
    year > MAX_SUPPORTED_YEAR ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12 ||
    !Number.isInteger(day) ||
    day < 1 ||
    day > 31
  ) {
    throw new RangeError('Persian date is outside the supported calendar range')
  }

  // A Persian year begins in March of Gregorian year `year + 621`.
  const start = Date.UTC(year + 621, 2, 1)
  for (let offset = 0; offset < 400; offset++) {
    const candidate = new Date(start + offset * DAY_IN_MS)
    const fields = getPersianDateFromISO(toISODate(candidate))
    if (fields.year === year && fields.month === month && fields.day === day) {
      return toISODate(candidate)
    }
  }

  throw new RangeError('Persian date does not exist in the supported calendar')
}

/**
 * Build a six-week, Saturday-first Persian calendar grid.
 * Every cell carries an unchanged Gregorian ISO date for model/API use.
 */
export function getPersianCalendarMonth(
  year: number,
  month: number,
  locale = documentLocale(),
): PersianCalendarMonth {
  if (
    !Number.isInteger(year) ||
    year < MIN_SUPPORTED_YEAR ||
    year > MAX_SUPPORTED_YEAR ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    throw new RangeError(
      'Persian calendar month is outside the supported range',
    )
  }

  const firstISO = getISODateFromPersianDate({ year, month, day: 1 })
  const first = parseISODate(firstISO)
  const firstWeekday = (first.getUTCDay() + 1) % 7
  const gridStart = new Date(first.getTime() - firstWeekday * DAY_IN_MS)
  const number = new Intl.NumberFormat(locale, { useGrouping: false })
  const monthFormatter = new Intl.DateTimeFormat(locale, {
    calendar: 'persian',
    month: 'long',
    timeZone: 'UTC',
  })
  const yearFormatter = new Intl.NumberFormat(locale, { useGrouping: false })
  const weekdayFormatter = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    timeZone: 'UTC',
  })
  const firstMonthDate = parseISODate(firstISO)
  const monthName = monthFormatter.format(firstMonthDate)
  const weekdayLabels = Array.from({ length: 7 }, (_, index) => {
    // 2025-03-22 is a Saturday; indexing from it makes Saturday stable at 0.
    return weekdayFormatter.format(new Date(Date.UTC(2025, 2, 22 + index)))
  })
  const cells = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart.getTime() + index * DAY_IN_MS)
    const isoDate = toISODate(date)
    const persianDate = getPersianDateFromISO(isoDate)
    return {
      isoDate,
      persianDate,
      dayLabel: number.format(persianDate.day),
      weekday: index % 7,
      isCurrentMonth: persianDate.year === year && persianDate.month === month,
    }
  })

  return {
    year,
    month,
    monthName,
    yearLabel: yearFormatter.format(year),
    weekdayLabels,
    weeks: Array.from({ length: 6 }, (_, index) =>
      cells.slice(index * 7, index * 7 + 7),
    ),
  }
}

function parseISODate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) throw new RangeError(`Expected Gregorian YYYY-MM-DD: ${value}`)

  const [, year, month, day] = match.map(Number)
  const date = new Date(0)
  date.setUTCHours(0, 0, 0, 0)
  date.setUTCFullYear(year, month - 1, day)
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new RangeError(`Invalid Gregorian date: ${value}`)
  }
  return date
}

function toISODate(date: Date): string {
  const year = String(date.getUTCFullYear()).padStart(4, '0')
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function part(parts: Intl.DateTimeFormatPart[], type: string): string {
  return parts.find((item) => item.type === type)?.value ?? ''
}
