import { dayjs } from '#utils/dayjs'
import { formatLocaleNumber } from '../../src/localization/localization'
import { resolveCalendar } from '../../src/localization/calendar'
import {
  formatPersianDate,
  getPersianDateFromISO,
} from '../../src/localization/persianCalendar'
import { readDocumentLocale } from '../../src/utils/readDocumentLocale'

export function formatLabel(name: string) {
  return name
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function formatValue(value: number, precision = 0, shorten = false) {
  if (isNaN(value)) return value.toString()

  let locale = 'en-US'

  if (shorten) {
    let formatted = new Intl.NumberFormat(locale, {
      notation: 'compact',
      maximumFractionDigits: precision,
    }).format(value)

    if (locale == 'en-IN') {
      formatted = formatted.replace('T', 'K')
    }

    return formatted
  } else {
    precision = precision || guessPrecision(value)
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    }).format(value)
  }
}

function guessPrecision(number: number) {
  if (!number || isNaN(number)) return 0
  const str = number.toString()
  const decimalIndex = str.indexOf('.')
  if (decimalIndex === -1) return 0
  return Math.min(str.length - decimalIndex - 1, 2)
}

export type TimeGrain =
  | 'second'
  | 'minute'
  | 'hour'
  | 'day'
  | 'week'
  | 'month'
  | 'quarter'
  | 'year'

const PERSIAN_DATE_FORMATS: Record<Exclude<TimeGrain, 'quarter'>, string> = {
  second: 'MMMM D, YYYY',
  minute: 'MMMM D, YYYY',
  hour: 'MMMM D, YYYY',
  day: 'MMMM D, YYYY',
  week: 'MMM D, YYYY',
  month: 'MMMM, YYYY',
  year: 'YYYY',
}

export function formatDate(date: string, format?: string, grain: TimeGrain = 'day') {
  if (!date) return ''

  const parsed = dayjs(date)
  if (!parsed.isValid()) return parsed.format()

  if (resolveCalendar('auto') === 'persian') {
    const locale = readDocumentLocale()
    if (grain === 'quarter') {
      const persianDate = getPersianDateFromISO(parsed.format('YYYY-MM-DD'))
      const quarter = Math.floor((persianDate.month - 1) / 3) + 1
      return `سه‌ماههٔ ${formatLocaleNumber(quarter)} ${formatLocaleNumber(
        persianDate.year,
      )}`
    }

    const formattedDate = formatPersianDate(
      parsed.format('YYYY-MM-DD'),
      locale,
      PERSIAN_DATE_FORMATS[grain],
    )
    if (!['hour', 'minute', 'second'].includes(grain)) return formattedDate

    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      ...(grain === 'second' ? { second: '2-digit' } : {}),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }
    const time = new Intl.DateTimeFormat(locale, timeOptions).format(
      parsed.toDate(),
    )
    return `${formattedDate} ${time}`
  }

  if (grain) {
    const grainToFormat: Record<TimeGrain, string> = {
      second: 'MMMM D, YYYY h:mm:ss A',
      minute: 'MMMM D, YYYY h:mm A',
      hour: 'MMMM D, YYYY h:00 A',
      day: 'MMMM D, YYYY',
      week: 'MMM Do, YYYY',
      month: 'MMMM, YYYY',
      year: 'YYYY',
      quarter: '[Q]Q, YYYY',
    }

    format = grainToFormat[grain]
  }

  if (!format) {
    format = 'MMM D, YY'
  }

  return dayjs(date).format(format)
}


export function isObject(item: any) {
  return item && typeof item === 'object' && !Array.isArray(item)
}

export function mergeDeep(target: any, ...sources: any[]) {
  if (!sources.length) return target;
  const source = sources.shift();

  if (!source || !isObject(target) || !isObject(source)) {
    // Skip the current source if it's not a proper object
    return mergeDeep(target, ...sources);
  }

  let output = Object.assign({}, target);

  Object.keys(source).forEach((key) => {
    if (isObject(source[key])) {
      if (!(key in output)) {
        output[key] = source[key];
      } else {
        output[key] = mergeDeep(output[key], source[key]);
      }
    } else {
      output[key] = source[key];
    }
  });

  return mergeDeep(output, ...sources);
}
