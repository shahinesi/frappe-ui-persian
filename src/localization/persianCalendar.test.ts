import { describe, expect, it } from 'vitest'
import {
  getISODateFromPersianDate,
  getPersianCalendarMonth,
  getPersianDateFromISO,
} from 'frappe-ui/localization'

describe('Persian calendar conversion', () => {
  it('round trips Nowruz using Gregorian ISO values', () => {
    const persianDate = getPersianDateFromISO('2025-03-21')
    expect(persianDate).toEqual({ year: 1404, month: 1, day: 1 })
    expect(getISODateFromPersianDate(persianDate)).toBe('2025-03-21')
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
    expect(calendar.yearLabel).toBe('۱۴۰۴')
    expect(calendar.weeks).toHaveLength(6)
    expect(calendar.weeks.every((week) => week.length === 7)).toBe(true)
    expect(calendar.weekdayLabels[0]).toBe('شنبه')
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

    expect(faNowruz?.dayLabel).toBe('۱')
    expect(enNowruz?.dayLabel).toBe('1')
    expect(faNowruz?.isoDate).toBe(enNowruz?.isoDate)
  })
})
