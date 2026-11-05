import type { Dayjs } from 'dayjs/esm'
import { dayjs, dayjsLocal } from '../../utils/dayjs'
import { getPersianCalendarMonth } from '../../localization/persianCalendar'
import type { CalendarPanelCell } from './calendarTypes'

/** Build the shared DatePicker cell model from a Saturday-first Persian month. */
export function generatePersianWeeks(options: {
  year: number
  monthIndex: number
  locale: string
  selected?: string
  from?: string
  to?: string
  preview?: Dayjs | null
  isUnavailable: (date: Dayjs) => boolean
}): CalendarPanelCell[][] {
  const { year, monthIndex, locale, selected, from, to, preview, isUnavailable } = options
  const fromDate = from ? dayjs(from) : null
  const toDate = to ? dayjs(to) : null
  const hoverDate = !toDate && fromDate && preview ? preview : null
  const orderedHover: Dayjs[] =
    hoverDate && fromDate
      ? hoverDate.isBefore(fromDate, 'day')
        ? [hoverDate, fromDate]
        : [fromDate, hoverDate]
      : []
  const today = dayjsLocal().format('YYYY-MM-DD')
  const month = getPersianCalendarMonth(year, monthIndex + 1, locale)

  return month.weeks.map((week) =>
    week.map((cell) => {
      const date = dayjs(cell.isoDate)
      const isRangeStart = !!fromDate && date.isSame(fromDate, 'day')
      const isRangeEnd = !!toDate && date.isSame(toDate, 'day')
      const inRange = fromDate && toDate
        ? date.isAfter(fromDate, 'day') && date.isBefore(toDate, 'day')
        : orderedHover.length === 2 &&
          date.isAfter(orderedHover[0], 'day') &&
          date.isBefore(orderedHover[1], 'day')

      return {
        date,
        key: cell.isoDate,
        inMonth: cell.isCurrentMonth,
        isToday: cell.isoDate === today,
        isSelected: cell.isoDate === selected,
        isUnavailable: isUnavailable(date),
        displayDay: cell.dayLabel,
        isRangeStart,
        isRangeEnd,
        inRange,
      }
    }),
  )
}
