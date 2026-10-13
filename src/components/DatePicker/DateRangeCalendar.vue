<template>
  <div
    class="flex"
    :class="isDualPaneActive ? 'divide-x divide-outline-gray-2' : ''"
  >
    <CalendarPanel
      ref="leftPanelRef"
      :view="view"
      :current-year="activeYear"
      :current-year-label="yearLabel"
      :current-month="activeMonth"
      :month-labels="monthLabels"
      :weekday-labels="weekdayLabels"
      :week-start="isPersian ? 6 : 0"
      :direction="direction"
      :selectable-years="selectableYears"
      :format-year="formatYear"
      :weeks="weeks"
      :today-label="isDualPaneActive ? '' : todayLabel"
      :prev-disabled="isPersian && prevDisabled"
      :next-disabled="isPersian && nextDisabled"
      :hide-next="isDualPaneActive"
      :hide-out-of-month="isDualPaneActive"
      :center-header="isDualPaneActive"
      :min="props.min"
      :max="props.max"
      v-model:focused-date="focusedDate"
      @prev="prev"
      @next="next"
      @today="selectToday"
      @cycle-view="cycleView"
      @select-month="selectMonth"
      @select-year="selectYear"
      @select-date="select"
      @hover-cell="onCellHover"
      @navigate="onPanelNavigate"
    />
    <CalendarPanel
      v-if="isDualPaneActive"
      ref="rightPanelRef"
      :view="view"
      :current-year="rightYear"
      :current-year-label="rightYearLabel"
      :current-month="rightMonth"
      :month-labels="monthLabels"
      :weekday-labels="weekdayLabels"
      :week-start="isPersian ? 6 : 0"
      :direction="direction"
      :selectable-years="selectableYears"
      :format-year="formatYear"
      :weeks="rightWeeks"
      hide-prev
      hide-today
      hide-out-of-month
      center-header
      :min="props.min"
      :max="props.max"
      v-model:focused-date="focusedDate"
      @next="next"
      @cycle-view="cycleView"
      @select-date="select"
      @hover-cell="onCellHover"
      @navigate="onPanelNavigate"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Dayjs } from 'dayjs/esm'
import { dayjs, dayjsLocal } from '../../utils/dayjs'
import {
  getPersianCalendarMonth,
  getPersianDateFromISO,
  getPersianMonthName,
  MAX_SUPPORTED_YEAR,
  MIN_SUPPORTED_YEAR,
} from '../../localization/persianCalendar'
import { useDocumentLocale } from '../../localization/localization'
import CalendarPanel from './CalendarPanel.vue'
import { makeUnavailableCheck, useCalendarView } from './composables'
import { generatePersianWeeks } from './persianUtils'
import { generateRangeWeeks, rangeKey, stepRange } from './utils'
import type {
  CalendarPanelCell,
  CalendarPanelExposed,
  DateRangeCalendarEmits,
  DateRangeCalendarExposed,
  DateRangeCalendarProps,
} from './calendarTypes'
import type { DateRangeValue } from './types'

const props = withDefaults(defineProps<DateRangeCalendarProps>(), {
  todayLabel: 'Today',
  dualPane: false,
  calendar: 'gregorian',
})
const emit = defineEmits<DateRangeCalendarEmits>()
const model = defineModel<DateRangeValue>({ default: () => [] })
const DATE_FORMAT = 'YYYY-MM-DD'
const { locale, direction } = useDocumentLocale()
const isPersian = computed(() => props.calendar === 'persian')
const gregorian = useCalendarView()
const nowPersian = getPersianDateFromISO(dayjsLocal().format(DATE_FORMAT))
const persianYear = ref(nowPersian.year)
const persianMonth = ref(nowPersian.month - 1)
const view = gregorian.view
const fromDate = computed(() => model.value[0] ?? '')
const toDate = computed(() => model.value[1] ?? '')
const activeYear = computed(() => isPersian.value ? persianYear.value : gregorian.currentYear.value)
const activeMonth = computed(() => isPersian.value ? persianMonth.value : gregorian.currentMonth.value)

function setPersianView(date: Dayjs): void {
  const parts = getPersianDateFromISO(date.format(DATE_FORMAT))
  if (parts.year < MIN_SUPPORTED_YEAR || parts.year > MAX_SUPPORTED_YEAR) return
  persianYear.value = parts.year
  persianMonth.value = parts.month - 1
}

function navigateToDate(date: Dayjs): void {
  if (isPersian.value) setPersianView(date)
  else gregorian.focusOn(date)
  focusedDate.value = date
}

function prev(): void {
  if (!isPersian.value) return gregorian.prev()
  if (prevDisabled.value) return
  if (persianMonth.value === 0) {
    persianMonth.value = 11
    persianYear.value--
  } else persianMonth.value--
}

function next(): void {
  if (!isPersian.value) return gregorian.next()
  if (nextDisabled.value) return
  if (persianMonth.value === 11) {
    persianMonth.value = 0
    persianYear.value++
  } else persianMonth.value++
}

function selectMonth(month: number): void {
  if (isPersian.value) persianMonth.value = month
  else gregorian.selectMonth(month)
  view.value = 'date'
}

function selectYear(year: number): void {
  if (isPersian.value) {
    if (year < MIN_SUPPORTED_YEAR || year > MAX_SUPPORTED_YEAR) return
    persianYear.value = year
  }
  else gregorian.selectYear(year)
}

function cycleView(): void {
  view.value = view.value === 'date' ? 'monthYear' : 'date'
}

const checkUnavailable = makeUnavailableCheck(
  () => props.min,
  () => props.max,
  () => props.isDateUnavailable,
)
const hoverDate = ref<Dayjs | null>(null)

function buildRangeWeeks(year: number, month: number): CalendarPanelCell[][] {
  if (isPersian.value) {
    return generatePersianWeeks({
      year,
      monthIndex: month,
      locale: locale.value,
      from: fromDate.value,
      to: toDate.value,
      preview: hoverDate.value ?? focusedDate.value,
      isUnavailable: checkUnavailable,
    })
  }
  return generateRangeWeeks({
    year,
    monthIndex: month,
    from: fromDate.value,
    to: toDate.value,
    preview: hoverDate.value ?? focusedDate.value,
    isUnavailable: checkUnavailable,
  })
}

const weeks = computed(() => buildRangeWeeks(activeYear.value, activeMonth.value))
const isDualPaneActive = computed(() =>
  props.dualPane && view.value === 'date' &&
  (!isPersian.value || activeYear.value < MAX_SUPPORTED_YEAR || activeMonth.value < 11),
)
const rightAnchor = computed(() => {
  if (isPersian.value) {
    const year = activeMonth.value === 11 ? activeYear.value + 1 : activeYear.value
    const month = activeMonth.value === 11 ? 0 : activeMonth.value + 1
    return { year, month }
  }
  const nextMonth = dayjs().year(activeYear.value).month(activeMonth.value).add(1, 'month')
  return { year: nextMonth.year(), month: nextMonth.month() }
})
const rightYear = computed(() => rightAnchor.value.year)
const rightMonth = computed(() => rightAnchor.value.month)
const rightWeeks = computed(() => buildRangeWeeks(rightYear.value, rightMonth.value))
const currentMonthData = computed(() => isPersian.value
  ? getPersianCalendarMonth(activeYear.value, activeMonth.value + 1, locale.value)
  : null)
const rightMonthData = computed(() => isPersian.value
  ? getPersianCalendarMonth(rightYear.value, rightMonth.value + 1, locale.value)
  : null)
const currentMonthStart = computed(
  () => currentMonthData.value?.weeks.flat().find((cell) => cell.isCurrentMonth)?.isoDate ?? '',
)
const currentMonthEnd = computed(
  () => [...(currentMonthData.value?.weeks.flat() ?? [])].reverse().find((cell) => cell.isCurrentMonth)?.isoDate ?? '',
)
const prevDisabled = computed(() =>
  activeYear.value === MIN_SUPPORTED_YEAR && activeMonth.value === 0 ||
  !!props.min && currentMonthStart.value !== '' && props.min.slice(0, 10) >= currentMonthStart.value,
)
const nextDisabled = computed(() =>
  activeYear.value === MAX_SUPPORTED_YEAR && activeMonth.value === 11 ||
  !!props.max && currentMonthEnd.value !== '' && props.max.slice(0, 10) <= currentMonthEnd.value,
)
const monthLabels = computed(() => isPersian.value
  ? Array.from({ length: 12 }, (_, index) => getPersianMonthName(activeYear.value, index + 1, locale.value))
  : undefined)
const weekdayLabels = computed(() => currentMonthData.value?.weekdayLabels)
const yearLabel = computed(() => currentMonthData.value?.yearLabel)
const rightYearLabel = computed(() => rightMonthData.value?.yearLabel)
const formatYear = computed(() => isPersian.value
  ? (year: number) => new Intl.NumberFormat(locale.value, { useGrouping: false }).format(year)
  : undefined)
const selectableYears = computed(() => {
  if (!isPersian.value) return undefined
  const minYear = props.min ? getPersianDateFromISO(props.min.slice(0, 10)).year : activeYear.value - 100
  const maxYear = props.max ? getPersianDateFromISO(props.max.slice(0, 10)).year : activeYear.value + 10
  const start = Math.max(MIN_SUPPORTED_YEAR, Math.min(minYear, activeYear.value))
  const end = Math.min(MAX_SUPPORTED_YEAR, Math.max(maxYear, activeYear.value))
  return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index)
})
const todayLabel = computed(() =>
  isPersian.value && props.todayLabel === 'Today' && locale.value.startsWith('fa')
    ? 'امروز'
    : props.todayLabel,
)

const leftPanelRef = ref<CalendarPanelExposed | null>(null)
const rightPanelRef = ref<CalendarPanelExposed | null>(null)
const focusedDate = ref<Dayjs | null>(null)
let ownKey: string | null = null

function seedFocus(): void {
  const anchor = fromDate.value ? dayjs(fromDate.value) : dayjsLocal().startOf('day')
  if (anchor.isValid() && !checkUnavailable(anchor)) {
    const persianYear = getPersianDateFromISO(anchor.format(DATE_FORMAT)).year
    if (!isPersian.value || persianYear >= MIN_SUPPORTED_YEAR && persianYear <= MAX_SUPPORTED_YEAR) {
      focusedDate.value = anchor
      navigateToDate(anchor)
      return
    }
  }
  const cell = weeks.value.flat().find((item) => item.inMonth && !item.isUnavailable)
  if (cell) focusedDate.value = cell.date
}

watch(
  () => [rangeKey(model.value), props.calendar] as const,
  ([key]) => {
    if (key === ownKey) {
      ownKey = null
      return
    }
    view.value = 'date'
    seedFocus()
  },
  { immediate: true },
)

function onPanelNavigate(target: Dayjs): void {
  if (isDualPaneActive.value) {
    const targetDate = target.format(DATE_FORMAT)
    const targetMonth = isPersian.value
      ? getPersianDateFromISO(targetDate)
      : { year: target.year(), month: target.month() + 1 }
    const inLeft = targetMonth.year === activeYear.value && targetMonth.month - 1 === activeMonth.value
    const inRight = targetMonth.year === rightYear.value && targetMonth.month - 1 === rightMonth.value
    if (inLeft || inRight) {
      focusedDate.value = target
      return
    }
  }
  navigateToDate(target)
}

function commit(range: DateRangeValue): void {
  if (range[0] && range[1]) hoverDate.value = null
  ownKey = rangeKey(range)
  model.value = range
}

function select(date: Dayjs): void {
  if (checkUnavailable(date)) return
  const range = stepRange([fromDate.value, toDate.value], date)
  focusedDate.value = date
  commit(range)
  emit('select', range)
}

function selectToday(): void {
  const today = dayjsLocal().startOf('day')
  if (checkUnavailable(today)) return
  navigateToDate(today)
  const value = today.format(DATE_FORMAT)
  const range: DateRangeValue = [value, value]
  commit(range)
  emit('today', range)
}

function onCellHover(date: Dayjs | null): void {
  hoverDate.value = fromDate.value && !toDate.value ? date : null
}

function focus(): void {
  leftPanelRef.value?.focusInitialCell()
}

defineExpose<DateRangeCalendarExposed>({ focus })
</script>
