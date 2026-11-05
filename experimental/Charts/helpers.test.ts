/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest'
import { formatDate, formatValue } from './helpers'

afterEach(() => {
  document.documentElement.lang = ''
})

describe('experimental chart date localization', () => {
  it('formats chart dates with the shared Persian calendar for fa locale', () => {
    document.documentElement.lang = 'fa-IR'

    expect(formatDate('2026-10-01', undefined, 'day')).toBe('مهر 9, 1405')
    expect(formatDate('2026-10-01', undefined, 'month')).toBe('مهر, 1405')
    expect(formatDate('2026-10-01', undefined, 'year')).toBe('1405')
    expect(formatDate('2026-10-01', undefined, 'quarter')).toBe(
      'سه‌ماههٔ 3 1405',
    )
  })

  it('keeps Gregorian chart labels in English mode', () => {
    document.documentElement.lang = 'en-US'

    expect(formatDate('2026-10-01', undefined, 'day')).toBe('October 1, 2026')
    expect(formatDate('2026-10-01', undefined, 'month')).toBe('October, 2026')
    expect(formatDate('2026-10-01', undefined, 'year')).toBe('2026')
  })

  it('formats Persian chart values with canonical digits', () => {
    document.documentElement.lang = 'fa-IR'

    expect(formatValue(1250)).toMatch(/1/)
    expect(formatValue(1250).replace(/[^0-9]/g, '')).toBe('1250')
    expect(formatValue(1250)).not.toMatch(/[۰-۹٠-٩]/)
  })
})
