import { describe, expect, it } from 'vitest'
import {
  getISODateFromPersianDate,
  getPersianCalendarMonth,
  getPersianDateFromISO,
  formatPersianDate,
  parsePersianDate,
} from 'frappe-ui/localization/calendar'

describe('Persian calendar conversion', () => {
  it('round trips Nowruz using Gregorian ISO values', () => {
    const persianDate = getPersianDateFromISO('2025-03-21')
    expect(persianDate).toEqual({ year: 1404, month: 1, day: 1 })
    expect(getISODateFromPersianDate(persianDate)).toBe('2025-03-21')
  })

  it('keeps date-only values stable across the Tehran midnight and Nowruz boundary', () => {
    expect(formatPersianDate('2025-03-20', 'fa-IR')).toBe('1403/12/30')
    expect(formatPersianDate('2025-03-21', 'fa-IR')).toBe('1404/01/01')
    expect(parsePersianDate('۱۴۰۳/۱۲/۳۰', 'YYYY/MM/DD', 'fa-IR')).toBe(
      '2025-03-20',
    )
    expect(parsePersianDate('۱۴۰۴/۰۱/۰۱', 'YYYY/MM/DD', 'fa-IR')).toBe(
      '2025-03-21',
    )
  })

  it('rejects invalid Gregorian and Persian dates rather than rolling over', () => {
    expect(() => getPersianDateFromISO('2025-02-30')).toThrow(RangeError)
    expect(() =>
      getISODateFromPersianDate({ year: 1404, month: 13, day: 1 }),
    ).toThrow(RangeError)
    expect(() =>
      getISODateFromPersianDate({ year: 1404, month: 12, day: 30 }),
    ).toThrow(RangeError)
  })

  it('supports a real leap-year Esfand 30 boundary', () => {
    const leapDay = { year: 1403, month: 12, day: 30 }
    const isoDate = getISODateFromPersianDate(leapDay)

    expect(isoDate).toBe('2025-03-20')
    expect(getPersianDateFromISO(isoDate)).toEqual(leapDay)
  })
})

describe('getPersianCalendarMonth', () => {
  it('returns six weeks starting Saturday with unchanged Gregorian ISO values', () => {
    const calendar = getPersianCalendarMonth(1404, 1, 'fa-IR')
    const cells = calendar.weeks.flat()

    expect(calendar.monthName).toContain('فروردین')
    expect(calendar.yearLabel).toBe('1404')
    expect(calendar.weeks).toHaveLength(6)
    expect(calendar.weeks.every((week) => week.length === 7)).toBe(true)
    expect(calendar.weekdayLabels).toEqual(['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'])
    expect(calendar.weekdayAriaLabels[0]).toBe('شنبه')
    expect(calendar.weeks[0][0].isoDate).toBe('2025-03-15')
    expect(calendar.weeks[0][0].weekday).toBe(0)
    expect(cells.find((cell) => cell.isCurrentMonth)?.isoDate).toBe(
      '2025-03-21',
    )
    expect(
      cells.find((cell) => cell.isoDate === '2025-03-21')?.persianDate,
    ).toEqual({
      year: 1404,
      month: 1,
      day: 1,
    })
  })

  it('localizes visible day numbers without changing selected ISO dates', () => {
    const persian = getPersianCalendarMonth(1404, 1, 'fa-IR')
    const english = getPersianCalendarMonth(1404, 1, 'en-US')
    const faNowruz = persian.weeks
      .flat()
      .find((cell) => cell.isoDate === '2025-03-21')
    const enNowruz = english.weeks
      .flat()
      .find((cell) => cell.isoDate === '2025-03-21')

    expect(faNowruz?.dayLabel).toBe('1')
    expect(enNowruz?.dayLabel).toBe('1')
    expect(faNowruz?.isoDate).toBe(enNowruz?.isoDate)
  })
})

describe('Persian date presentation', () => {
  it('formats and parses Jalali input while preserving its Gregorian ISO value', () => {
    const iso = '2027-01-01'

    expect(getPersianDateFromISO(iso)).toEqual({ year: 1405, month: 10, day: 11 })
    expect(formatPersianDate(iso, 'fa-IR')).toBe('1405/10/11')
    expect(formatPersianDate(iso, 'en-US')).toBe('1405/10/11')
    expect(parsePersianDate('۱۴۰۵/۱۰/۱۱')).toBe(iso)
    expect(parsePersianDate('١٤٠٥/١٠/١١')).toBe(iso)
    expect(parsePersianDate('۱۱ دی ۱۴۰۵', 'DD MMMM YYYY', 'fa-IR')).toBe(iso)
    expect(formatPersianDate(iso, 'en-US', 'MMM D')).toBe('Dey 11')
    expect(parsePersianDate('Dey 11', 'MMM D', 'en-US')).toBe(iso)
    expect(parsePersianDate('11/10/1405', 'DD/MM/YYYY')).toBe(iso)
    expect(parsePersianDate('۱۴۰۵/۱۲/۳۰')).toBeNull()
  })
})
