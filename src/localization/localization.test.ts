/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from 'vitest'
import {
  formatLocaleDate,
  formatLocaleNumber,
  useDocumentLocale,
} from './localization'

afterEach(() => {
  document.documentElement.lang = ''
  document.documentElement.dir = ''
})

describe('useDocumentLocale', () => {
  it('reads document language and direction with stable defaults', async () => {
    const state = useDocumentLocale()
    expect(state.locale.value).toBe('en-US')
    expect(state.direction.value).toBe('ltr')

    document.documentElement.lang = 'fa-IR'
    document.documentElement.dir = 'rtl'
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(state.locale.value).toBe('fa-IR')
    expect(state.direction.value).toBe('rtl')
  })

  it('reacts when the document language and direction change', async () => {
    const state = useDocumentLocale()
    const seen: string[] = []
    const stopLocale = state.locale.value
    document.documentElement.lang = 'de-DE'
    document.documentElement.dir = 'rtl'
    await new Promise((resolve) => setTimeout(resolve, 0))
    seen.push(state.locale.value, state.direction.value)

    expect(stopLocale).toBe('en-US')
    expect(seen).toEqual(['de-DE', 'rtl'])
  })
})

describe('formatLocaleNumber', () => {
  it('formats with the document locale and preserves zero', () => {
    document.documentElement.lang = 'fa-IR'
    expect(formatLocaleNumber(1234.5, { maximumFractionDigits: 1 })).toBe(
      '۱٬۲۳۴٫۵',
    )
    expect(formatLocaleNumber(0)).toBe('۰')
  })

  it('keeps absent values distinct from zero', () => {
    expect(formatLocaleNumber(null)).toBe('')
    expect(formatLocaleNumber(undefined)).toBe('')
    expect(formatLocaleNumber(Number.NaN)).toBe('')
    expect(formatLocaleNumber(0)).not.toBe('')
  })
})

describe('formatLocaleDate', () => {
  it('formats a Gregorian ISO date as Persian presentation when requested', () => {
    document.documentElement.lang = 'fa-IR'
    expect(
      formatLocaleDate('2025-03-20', {
        calendar: 'persian',
        dateStyle: 'long',
      }),
    ).toBe('۳۰ اسفند ۱۴۰۳')
  })

  it('keeps date-only values on the same calendar day', () => {
    document.documentElement.lang = 'en-US'
    expect(
      formatLocaleDate('2025-03-20', {
        dateStyle: 'medium',
        timeZone: 'America/Los_Angeles',
      }),
    ).toBe('Mar 20, 2025')
  })

  it('returns an empty string for invalid and absent values', () => {
    expect(formatLocaleDate('2025-02-30')).toBe('')
    expect(formatLocaleDate('not a date')).toBe('')
    expect(formatLocaleDate(null)).toBe('')
  })
})
