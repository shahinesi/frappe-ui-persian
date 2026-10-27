import { describe, expect, it } from 'vitest'
import {
	formatPersianDateTime,
	parseCanonicalDateTimeInput,
	parsePersianDateTimeInput,
} from './dateTimeFormat'

const format = 'MMMM D, YYYY [at] h:mm A'

describe('Persian DateTimePicker formats', () => {
	it('formats custom Jalali date tokens and Persian day periods with canonical digits', () => {
		expect(
			formatPersianDateTime('2026-10-01', '12:30:00', 'fa-IR', format),
		).toBe('مهر 9, 1405 at 12:30 ب.ظ.')
	})

	it('parses a custom Persian month/date format and Persian numeral input to Gregorian', () => {
		const parsed = parsePersianDateTimeInput(
			'مهر ۱۰, ۱۴۰۵ at ۱۲:۳۱ ب.ظ.',
			'fa-IR',
			format,
		)
		expect(parsed?.format('YYYY-MM-DD HH:mm:ss')).toBe('2026-10-02 12:31:00')
	})

	it('rejects invalid Jalali dates rather than treating them as Gregorian years', () => {
		expect(
			parsePersianDateTimeInput('1404/12/30 12:31:05', 'fa-IR', 'YYYY/MM/DD HH:mm:ss'),
		).toBeNull()
	})

	it('accepts only valid canonical Gregorian ISO input as fallback', () => {
		expect(parseCanonicalDateTimeInput('2026-10-02 12:31:05')?.format('YYYY-MM-DD HH:mm:ss'))
			.toBe('2026-10-02 12:31:05')
		expect(parseCanonicalDateTimeInput('2026-02-30 12:31:05')).toBeNull()
		expect(parseCanonicalDateTimeInput('1404/12/30 12:31:05')).toBeNull()
	})

	it('preserves English month and meridiem labels for an explicit Persian calendar', () => {
		expect(
			formatPersianDateTime('2026-10-01', '12:30:00', 'en-US', format),
		).toBe('Mehr 9, 1405 at 12:30 PM')
		const parsed = parsePersianDateTimeInput(
			'Mehr 10, 1405 at 12:31 PM',
			'en-US',
			format,
		)
		expect(parsed?.format('YYYY-MM-DD HH:mm:ss')).toBe('2026-10-02 12:31:00')
	})
})
