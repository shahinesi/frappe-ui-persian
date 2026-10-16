/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest'
import { formatDate } from './helpers'

afterEach(() => {
  document.documentElement.lang = ''
})

describe('experimental chart date localization', () => {
  it('formats chart dates with the shared Persian calendar for fa locale', () => {
    document.documentElement.lang = 'fa-IR'

    expect(formatDate('2026-10-01', undefined, 'day')).toBe('مهر ۹, ۱۴۰۵')
    expect(formatDate('2026-10-01', undefined, 'month')).toBe('مهر, ۱۴۰۵')
    expect(formatDate('2026-10-01', undefined, 'year')).toBe('۱۴۰۵')
    expect(formatDate('2026-10-01', undefined, 'quarter')).toBe(
      'سه‌ماههٔ ۳ ۱۴۰۵',
    )
  })

  it('keeps Gregorian chart labels in English mode', () => {
    document.documentElement.lang = 'en-US'

    expect(formatDate('2026-10-01', undefined, 'day')).toBe('October 1, 2026')
    expect(formatDate('2026-10-01', undefined, 'month')).toBe('October, 2026')
    expect(formatDate('2026-10-01', undefined, 'year')).toBe('2026')
  })
})
