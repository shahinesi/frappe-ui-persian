import { readDocumentLocale } from '../utils/readDocumentLocale'
import { digitsArToFa, digitsFaToEn } from '@persian-tools/persian-tools'
import { isValidJalaaliDate, jalaaliWeek, toGregorian, toJalaali } from 'jalaali-js'

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
  weekdayAriaLabels: string[]
  /** Six complete weeks, each with seven cells starting on Saturday. */
  weeks: PersianCalendarCell[][]
}

export const MIN_SUPPORTED_YEAR = 1200
export const MAX_SUPPORTED_YEAR = 1600
const DAY_IN_MS = 24 * 60 * 60 * 1000
const PERSIAN_MONTH_NAMES = [
  ['فروردین', 'Farvardin'],
  ['اردیبهشت', 'Ordibehesht'],
  ['خرداد', 'Khordad'],
  ['تیر', 'Tir'],
  ['مرداد', 'Mordad'],
  ['شهریور', 'Shahrivar'],
  ['مهر', 'Mehr'],
  ['آبان', 'Aban'],
  ['آذر', 'Azar'],
  ['دی', 'Dey'],
  ['بهمن', 'Bahman'],
  ['اسفند', 'Esfand'],
] as const

/**
 * Convert a Gregorian ISO date to its Persian calendar fields.
 * The input and returned fields are UTC calendar dates, not local instants.
 */
export function getPersianDateFromISO(isoDate: string): PersianCalendarDate {
  const date = parseISODate(isoDate)
  const { jy: year, jm: month, jd: day } = toJalaali(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
  )
  if (year < MIN_SUPPORTED_YEAR || year > MAX_SUPPORTED_YEAR) {
    throw new RangeError(`Persian date is outside the supported calendar range: ${isoDate}`)
  }
  return { year, month, day }
}

/** Format a Gregorian date-only value for Persian-calendar presentation. */
export function formatPersianDate(
  isoDate: string | null | undefined,
  locale = readDocumentLocale(),
  format = 'YYYY/MM/DD',
): string {
  if (!isoDate) return ''
  const date = getPersianDateFromISO(isoDate)
  const digits = displayCalendarNumber
  const padded = (value: number) => digits(Number(value)).padStart(2, digits(0))
  const monthName = getPersianMonthName(date.year, date.month, locale)
  const tokens: Record<string, string> = {
    YYYY: digits(date.year),
    YY: padded(date.year % 100),
    MMMM: monthName,
    MMM: getPersianMonthName(date.year, date.month, locale, 'short'),
    MM: padded(date.month),
    M: digits(date.month),
    DD: padded(date.day),
    D: digits(date.day),
  }
  return format.replace(/YYYY|MMMM|MMM|YY|MM|DD|M|D/g, (token) => tokens[token])
}

/** Return one localized Persian-calendar month name without building its grid. */
export function getPersianMonthName(
  year: number,
  month: number,
  locale = readDocumentLocale(),
  style: 'long' | 'short' = 'long',
): string {
  if (
    !Number.isInteger(year) ||
    year < MIN_SUPPORTED_YEAR ||
    year > MAX_SUPPORTED_YEAR ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    throw new RangeError('Persian year/month is outside the supported range')
  }
  const [persianName, englishName] = PERSIAN_MONTH_NAMES[month - 1]
  const name = /^fa(?:-|$)/i.test(locale) ? persianName : englishName
  return style === 'short' ? name.slice(0, 3) : name
}

/** Parse a Persian-calendar date into a Gregorian ISO date-only value. */
export function parsePersianDate(
  value: string,
  format = 'YYYY/MM/DD',
  locale = readDocumentLocale(),
): string | null {
  const normalized = digitsFaToEn(digitsArToFa(value.trim()))
  const parts: string[] = []
  const pattern = format.replace(/YYYY|MMMM|MMM|YY|MM|DD|M|D|./g, (token) => {
    if (!['YYYY', 'MMMM', 'MMM', 'YY', 'MM', 'M', 'DD', 'D'].includes(token)) {
      return token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }
    parts.push(token)
    if (token === 'YYYY') return '(\\d{4})'
    if (token === 'YY') return '(\\d{2})'
    if (token === 'MMMM' || token === 'MMM') return '(.+?)'
    return '(\\d{1,2})'
  })
  const match = new RegExp(`^${pattern}$`).exec(normalized)
  if (!match) return null

  const fields: Record<string, string> = {}
  parts.forEach((token, index) => {
    fields[token[0]] = match[index + 1]
  })
  const currentDate = new Date()
  const currentISO = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`
  let year = fields.Y ? Number(fields.Y) : getPersianDateFromISO(currentISO).year
  if (!Number.isFinite(year)) return null
  if (format.includes('YY') && !format.includes('YYYY')) year += year < 50 ? 1400 : 1300
  let month = Number(fields.M)
  if (Number.isNaN(month) && fields.M) {
    const requestedMonth = fields.M.trim().toLocaleLowerCase(locale)
    try {
      month = Array.from({ length: 12 }, (_, index) => index + 1).find(
        (candidate) => [
          getPersianMonthName(year, candidate, locale, 'long'),
          getPersianMonthName(year, candidate, locale, 'short'),
        ].some((name) => name.toLocaleLowerCase(locale) === requestedMonth),
      ) ?? Number.NaN
    } catch {
      return null
    }
  }
  const day = Number(fields.D)
  if (![year, month, day].every(Number.isFinite)) return null
  try {
    const isoDate = getISODateFromPersianDate({ year, month, day })
    const roundTrip = getPersianDateFromISO(isoDate)
    return roundTrip.year === year && roundTrip.month === month && roundTrip.day === day
      ? isoDate
      : null
  } catch {
    return null
  }
}

/**
 * Convert a Persian calendar date to a Gregorian YYYY-MM-DD value using
 * jalaali-js; unsupported years and invalid days fail explicitly.
 */
export function getISODateFromPersianDate(
  persianDate: PersianCalendarDate,
): string {
  const { year, month, day } = persianDate
  if (
    !Number.isInteger(year) ||
    year < MIN_SUPPORTED_YEAR ||
    year > MAX_SUPPORTED_YEAR ||
    !isValidJalaaliDate(year, month, day)
  ) {
    throw new RangeError('Persian date is outside the supported calendar range')
  }

  const gregorian = toGregorian(year, month, day)
  return toISODate(new Date(Date.UTC(gregorian.gy, gregorian.gm - 1, gregorian.gd)))
}

/**
 * Build a six-week, Saturday-first Persian calendar grid.
 * Every cell carries an unchanged Gregorian ISO date for model/API use.
 */
export function getPersianCalendarMonth(
  year: number,
  month: number,
  locale = readDocumentLocale(),
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

  const { saturday } = jalaaliWeek(year, month, 1)
  const gridStartGregorian = toGregorian(saturday.jy, saturday.jm, saturday.jd)
  const gridStart = new Date(Date.UTC(
    gridStartGregorian.gy,
    gridStartGregorian.gm - 1,
    gridStartGregorian.gd,
  ))
  const weekdayFormatter = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    timeZone: 'UTC',
  })
  const monthName = getPersianMonthName(year, month, locale)
  const weekdayAriaLabels = Array.from({ length: 7 }, (_, index) => {
    // 2025-03-22 is a Saturday; indexing from it makes Saturday stable at 0.
    return weekdayFormatter.format(new Date(Date.UTC(2025, 2, 22 + index)))
  })
  const weekdayLabels = locale.toLowerCase().startsWith('fa')
    ? ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']
    : weekdayAriaLabels
  const cells = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart.getTime() + index * DAY_IN_MS)
    const isoDate = toISODate(date)
    const persianDate = getPersianDateFromISO(isoDate)
    return {
      isoDate,
      persianDate,
      dayLabel: displayCalendarNumber(persianDate.day),
      weekday: index % 7,
      isCurrentMonth: persianDate.year === year && persianDate.month === month,
    }
  })

  return {
    year,
    month,
    monthName,
    yearLabel: displayCalendarNumber(year),
    weekdayLabels,
    weekdayAriaLabels,
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

/** Keep numeric text canonical; the Persian document's Vazirmatn font renders it. */
function displayCalendarNumber(value: number): string {
  return String(value)
}
