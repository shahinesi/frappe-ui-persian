/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from 'vitest'
import { ref } from 'vue'
import {
  formatLocaleDate,
  formatLocaleDateRange,
  formatLocaleNumber,
  formatLocalePercent,
  resolveCalendar,
  useDocumentLocale,
  useLocalizedText,
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

describe('useLocalizedText', () => {
  it('translates shared picker defaults for Persian and preserves English', async () => {
    const placeholder = useLocalizedText('Select date')
    expect(placeholder.value).toBe('Select date')
    document.documentElement.lang = 'fa-IR'
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(placeholder.value).toBe('انتخاب تاریخ')
    expect(useLocalizedText('Now').value).toBe('اکنون')
    document.documentElement.lang = 'en-US'
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(placeholder.value).toBe('Select date')
  })

  it('recognizes Persian language tags case-insensitively', async () => {
    document.documentElement.lang = 'FA-IR'
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(useLocalizedText('Select date').value).toBe('انتخاب تاریخ')
    expect(resolveCalendar('auto', 'FA-IR')).toBe('persian')
    expect(resolveCalendar('auto', 'fr-FA')).toBe('gregorian')
  })

  it('refreshes translated text when the document language changes', async () => {
    document.documentElement.lang = 'fa-IR'
    const translator = (message: string) =>
      document.documentElement.lang.startsWith('fa')
        ? { 'No results': 'نتیجه‌ای پیدا نشد' }[message]
        : undefined
    const text = useLocalizedText('No results', translator)

    expect(text.value).toBe('نتیجه‌ای پیدا نشد')

    document.documentElement.lang = 'en-US'
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(text.value).toBe('No results')
  })

  it('supports reactive source messages and translator adapters', () => {
    const message = ref('No results')
    const translator = ref<(message: string) => string | undefined>(
      (value) => `fa:${value}`,
    )
    const text = useLocalizedText(message, translator)

    expect(text.value).toBe('fa:No results')

    message.value = 'No options'
    translator.value = () => undefined
    expect(text.value).toBe('No options')
  })

  it('tracks a reactive catalog through a host translator during locale switches', async () => {
    document.documentElement.lang = 'fa-IR'
    const catalogs = ref({
      fa: { 'No results': 'نتیجه‌ای پیدا نشد' },
      en: { 'No results': 'No results' },
    })
    const translator = (message: string) => {
      const language = document.documentElement.lang.startsWith('fa')
        ? 'fa'
        : 'en'
      return catalogs.value[language][message as 'No results']
    }
    const text = useLocalizedText('No results', translator)

    expect(text.value).toBe('نتیجه‌ای پیدا نشد')

    catalogs.value = {
      ...catalogs.value,
      en: { 'No results': 'No results found' },
    }
    document.documentElement.lang = 'en-US'
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(text.value).toBe('No results found')

    catalogs.value = {
      ...catalogs.value,
      fa: { 'No results': 'موردی پیدا نشد' },
    }
    document.documentElement.lang = 'fa-IR'
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(text.value).toBe('موردی پیدا نشد')
  })
})

describe('resolveCalendar', () => {
  it('defaults Persian locales to the Persian calendar and others to Gregorian', () => {
    expect(resolveCalendar('auto', 'fa')).toBe('persian')
    expect(resolveCalendar(undefined, 'fa-IR')).toBe('persian')
    expect(resolveCalendar('auto', 'fa-AF')).toBe('persian')
    expect(resolveCalendar('auto', 'en-US')).toBe('gregorian')
    expect(resolveCalendar('auto', 'fr-FR')).toBe('gregorian')
    expect(resolveCalendar('auto', 'fr-FA')).toBe('gregorian')
  })

  it('allows an explicit calendar to override the locale', () => {
    expect(resolveCalendar('gregorian', 'fa-IR')).toBe('gregorian')
    expect(resolveCalendar('persian', 'en-US')).toBe('persian')
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

describe('formatLocalePercent', () => {
  it('formats percentage points with Persian digits and percent symbol', () => {
    document.documentElement.lang = 'fa-IR'
    expect(formatLocalePercent(12.5, { maximumFractionDigits: 1 })).toBe(
      '۱۲٫۵٪',
    )
    expect(formatLocalePercent(0)).toBe('۰٪')
  })

  it('preserves the English percentage convention', () => {
    document.documentElement.lang = 'en-US'
    expect(formatLocalePercent(12.5, { maximumFractionDigits: 1 })).toBe(
      '12.5%',
    )
  })

  it('keeps missing values distinct from zero', () => {
    expect(formatLocalePercent(null)).toBe('')
    expect(formatLocalePercent(undefined)).toBe('')
    expect(formatLocalePercent(Number.NaN)).toBe('')
    expect(formatLocalePercent(0)).not.toBe('')
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

  it('formats Tehran datetimes across local midnight without shifting the day', () => {
    document.documentElement.lang = 'fa-IR'
    const options: Intl.DateTimeFormatOptions = {
      calendar: 'persian',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'Asia/Tehran',
    }
    const beforeMidnight = formatLocaleDate('2026-03-20T20:29:00Z', options)
    const afterMidnight = formatLocaleDate('2026-03-20T20:30:00Z', options)
    expect(beforeMidnight).toContain('۱۴۰۴/۱۲/۲۹')
    expect(afterMidnight).toContain('۱۴۰۵/۰۱/۰۱')
  })

  it('returns an empty string for invalid and absent values', () => {
    expect(formatLocaleDate('2025-02-30')).toBe('')
    expect(formatLocaleDate('not a date')).toBe('')
    expect(formatLocaleDate(null)).toBe('')
  })
})

describe('formatLocaleDateRange', () => {
  it('formats Gregorian ISO date-only ranges as Persian without changing their days', () => {
    document.documentElement.lang = 'fa-IR'
    expect(
      formatLocaleDateRange('2026-10-01', '2026-10-02', {
        calendar: 'persian',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    ).toBe('۹ تا ۱۰ مهر ۱۴۰۵')
  })

  it('formats ranges in the active English locale', () => {
    document.documentElement.lang = 'en-US'
    expect(
      formatLocaleDateRange('2026-10-01', '2026-10-02', {
        month: 'short',
        day: 'numeric',
        rangeSeparator: ' to ',
      }),
    ).toBe('Oct 1 to Oct 2')
  })

  it('keeps date-only endpoints on their ISO calendar day in western timezones', () => {
    document.documentElement.lang = 'en-US'
    expect(
      formatLocaleDateRange('2026-10-01', '2026-10-01', {
        dateStyle: 'medium',
        timeZone: 'America/Los_Angeles',
      }),
    ).toBe('Oct 1, 2026')
  })

  it('returns an empty string for missing, invalid, and reversed ranges', () => {
    expect(formatLocaleDateRange(null, '2026-10-02')).toBe('')
    expect(formatLocaleDateRange('2026-02-30', '2026-03-02')).toBe('')
    expect(formatLocaleDateRange('2026-10-02', '2026-10-01')).toBe('')
  })
})
