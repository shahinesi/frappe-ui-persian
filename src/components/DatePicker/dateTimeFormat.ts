import { digitsArToFa, digitsFaToEn } from '@persian-tools/persian-tools'
import type { Dayjs } from 'dayjs/esm'
import { dayjs } from '../../utils/dayjs'
import { formatPersianDate, parsePersianDate } from '../../localization/persianCalendar'
import { isPersianLocale, toIntlLocale } from '../../localization/locale'

const DATE_FORMAT = 'YYYY-MM-DD'
const DATE_TIME_FORMAT = `${DATE_FORMAT} HH:mm:ss`
const FORMAT_TOKENS = /\[[^\]]*\]|YYYY|MMMM|MMM|YY|MM|M|Do|DD|D|dddd|ddd|dd|d|HH|H|hh|h|mm|m|ss|s|A|a|./g

/** Render a DateTimePicker's format string with Jalali date fields and canonical numeric text. */
export function formatPersianDateTime(
	isoDate: string,
	time: string,
	locale: string,
	format: string,
): string {
	const dateTime = dayjs(`${isoDate} ${time}`)
	const weekdayDate = new Date(`${isoDate}T00:00:00Z`)
	const dateTokens = ['YYYY', 'YY', 'MMMM', 'MMM', 'MM', 'M', 'Do', 'DD', 'D']
	const timeTokens = ['HH', 'H', 'hh', 'h', 'mm', 'm', 'ss', 's', 'A', 'a']

	return (format.match(FORMAT_TOKENS) || [])
		.map((token) => {
			if (token.startsWith('[')) return token.slice(1, -1)
			if (dateTokens.includes(token)) {
				return formatPersianDate(isoDate, locale, token === 'Do' ? 'D' : token)
			}
			if (['dddd', 'ddd', 'dd'].includes(token)) {
				return new Intl.DateTimeFormat(toIntlLocale(locale), {
					weekday: token === 'dddd' ? 'long' : 'short',
					timeZone: 'UTC',
				}).format(weekdayDate)
			}
			if (token === 'd') return String(weekdayDate.getUTCDay())
			if (timeTokens.includes(token)) {
				if (['A', 'a'].includes(token) && isPersianLocale(locale)) {
					return dateTime.hour() < 12 ? 'ق.ظ.' : 'ب.ظ.'
				}
				return dateTime.format(token)
			}
			return token
		})
		.join('')
}

/** Parse Persian-calendar fields in a caller-supplied Day.js format into a local Gregorian value. */
export function parsePersianDateTimeInput(
	raw: string,
	locale: string,
	format: string,
): Dayjs | null {
	const input = digitsFaToEn(digitsArToFa(raw))
	const fields = parseDateTimeFields(input, format)
	if (!fields) return null

	const yearToken = ['YYYY', 'YY'].find((token) => fields[token] !== undefined)
	const monthToken = ['MMMM', 'MMM', 'MM', 'M'].find(
		(token) => fields[token] !== undefined,
	)
	const dayToken = ['DD', 'Do', 'D'].find((token) => fields[token] !== undefined)
	if (!monthToken || !dayToken) return null

	const dateTokens = [yearToken, monthToken, dayToken].filter(
		(token): token is string => Boolean(token),
	)
	const dateValues = dateTokens.map((token) =>
		(fields[token] || '').replace(/(?:st|nd|rd|th)$/i, ''),
	)
	const datePattern = dateTokens
		.map((token) => (token === 'Do' ? 'D' : token))
		.join('/')
	const isoDate = parsePersianDate(dateValues.join('/'), datePattern, locale)
	if (!isoDate) return null

	const hourToken = ['HH', 'H', 'hh', 'h'].find(
		(token) => fields[token] !== undefined,
	)
	const minuteToken = ['mm', 'm'].find((token) => fields[token] !== undefined)
	const secondToken = ['ss', 's'].find((token) => fields[token] !== undefined)
	let hours = Number(hourToken ? fields[hourToken] : 0)
	const minutes = Number(minuteToken ? fields[minuteToken] : 0)
	const seconds = Number(secondToken ? fields[secondToken] : 0)
	const meridiem = fields.A ?? fields.a
	if (['hh', 'h'].includes(hourToken || '') && (hours < 1 || hours > 12)) {
		return null
	}
	if (meridiem !== undefined) {
		const normalized = meridiem.replace(/[\s.]/g, '').toLocaleLowerCase(locale)
		const isAM = ['am', 'قظ', 'قبل از ظهر'].some((value) =>
			normalized.includes(value.replace(/[\s.]/g, '')),
		)
		const isPM = ['pm', 'بظ', 'بعد از ظهر'].some((value) =>
			normalized.includes(value.replace(/[\s.]/g, '')),
		)
		if (!isAM && !isPM) return null
		if (hours < 1 || hours > 12) return null
		if (isAM && hours === 12) hours = 0
		if (isPM && hours < 12) hours += 12
	}
	if (hours > 23 || minutes > 59 || seconds > 59) return null

	const time = [hours, minutes, seconds]
		.map((value) => String(value).padStart(2, '0'))
		.join(':')
	const parsed = dayjs(`${isoDate} ${time}`, DATE_TIME_FORMAT, true)
	return parsed.isValid() ? parsed : null
}

/** Accept only an explicit, valid Gregorian ISO date/time as the Jalali input fallback. */
export function parseCanonicalDateTimeInput(raw: string): Dayjs | null {
	const input = digitsFaToEn(digitsArToFa(raw))
	const match = /^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}(?::\d{2})?))?$/.exec(input)
	if (!match) return null

	const [, isoDate, inputTime = '00:00:00'] = match
	if (!dayjs(isoDate, DATE_FORMAT, true).isValid()) return null
	const time = inputTime.length === 5 ? `${inputTime}:00` : inputTime
	const parsed = dayjs(`${isoDate} ${time}`, DATE_TIME_FORMAT, true)
	return parsed.isValid() ? parsed : null
}

function parseDateTimeFields(input: string, format: string): Record<string, string> | null {
	const tokens = format.match(FORMAT_TOKENS) || []
	const captureTokens: string[] = []
	const pattern = tokens
		.map((token) => {
			if (token.startsWith('[')) return escapeRegExp(token.slice(1, -1))
			if (token === 'YYYY') {
				captureTokens.push(token)
				return '(\\d{4})'
			}
			if (['YY', 'MM', 'M', 'Do', 'DD', 'D', 'HH', 'H', 'hh', 'h', 'mm', 'm', 'ss', 's'].includes(token)) {
				captureTokens.push(token)
				return token === 'YY' ? '(\\d{2})' : '(\\d{1,2}(?:st|nd|rd|th)?)'
			}
			if (['MMMM', 'MMM', 'dddd', 'ddd', 'dd', 'A', 'a'].includes(token)) {
				captureTokens.push(token)
				return '(.+?)'
			}
			return escapeRegExp(token)
		})
		.join('')
	const match = new RegExp(`^${pattern}$`, 'i').exec(input)
	if (!match) return null
	return Object.fromEntries(captureTokens.map((token, index) => [token, match[index + 1]]))
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
