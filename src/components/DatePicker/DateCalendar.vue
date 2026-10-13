<template>
  <CalendarPanel
    ref="panelRef"
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
    :today-label="resolvedTodayLabel"
    :prev-disabled="isPersian && prevDisabled"
    :next-disabled="isPersian && nextDisabled"
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
    @navigate="navigateToDate"
  />
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
import { generateWeeks } from './utils'
import { generatePersianWeeks } from './persianUtils'
import type {
  CalendarPanelCell,
  CalendarPanelExposed,
  DateCalendarEmits,
  DateCalendarExposed,
  DateCalendarProps,
} from './calendarTypes'

const props = withDefaults(defineProps<DateCalendarProps>(), {
  todayLabel: 'Today',
  calendar: 'gregorian',
})

const emit = defineEmits<DateCalendarEmits>()

/** Selected date in Gregorian `YYYY-MM-DD` format, or `''` when empty. */
const model = defineModel<string>({ default: '' })

const DATE_FORMAT = 'YYYY-MM-DD'
const { locale, direction } = useDocumentLocale()
const isPersian = computed(() => props.calendar === 'persian')

const gregorian = useCalendarView()
const persianYear = ref(getPersianDateFromISO(dayjsLocal().format(DATE_FORMAT)).year)
const persianMonth = ref(
  getPersianDateFromISO(dayjsLocal().format(DATE_FORMAT)).month - 1,
)
const view = gregorian.view

const activeYear = computed(() =>
  isPersian.value ? persianYear.value : gregorian.currentYear.value,
)
const activeMonth = computed(() =>
  isPersian.value ? persianMonth.value : gregorian.currentMonth.value,
)

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

const todayISO = computed(() => dayjsLocal().format(DATE_FORMAT))
const persianMonthData = computed(() =>
  isPersian.value
    ? getPersianCalendarMonth(activeYear.value, activeMonth.value + 1, locale.value)
    : null,
)
const currentMonthStart = computed(
  () => persianMonthData.value?.weeks.flat().find((cell) => cell.isCurrentMonth)?.isoDate ?? '',
)
const currentMonthEnd = computed(
  () => [...(persianMonthData.value?.weeks.flat() ?? [])].reverse().find((cell) => cell.isCurrentMonth)?.isoDate ?? '',
)
const prevDisabled = computed(() =>
  activeYear.value === MIN_SUPPORTED_YEAR && activeMonth.value === 0 ||
  !!props.min && currentMonthStart.value !== '' && props.min.slice(0, 10) >= currentMonthStart.value,
)
const nextDisabled = computed(() =>
  activeYear.value === MAX_SUPPORTED_YEAR && activeMonth.value === 11 ||
  !!props.max && currentMonthEnd.value !== '' && props.max.slice(0, 10) <= currentMonthEnd.value,
)

const weeks = computed<CalendarPanelCell[][]>(() => {
  const selected = model.value
  if (!isPersian.value) {
    return generateWeeks(activeYear.value, activeMonth.value, selected).map(
      (week) =>
        week.map((cell) => ({
          ...cell,
          isUnavailable: checkUnavailable(cell.date),
        })),
    )
  }

  return generatePersianWeeks({
    year: activeYear.value,
    monthIndex: activeMonth.value,
    locale: locale.value,
    selected,
    isUnavailable: checkUnavailable,
  })
})

const monthLabels = computed(() => {
  if (!isPersian.value) return undefined
  return Array.from({ length: 12 }, (_, index) =>
    getPersianMonthName(activeYear.value, index + 1, locale.value),
  )
})
const weekdayLabels = computed(() => persianMonthData.value?.weekdayLabels)
const yearLabel = computed(() => persianMonthData.value?.yearLabel)
const resolvedTodayLabel = computed(
  () =>
    props.calendar === 'persian' &&
    props.todayLabel === 'Today' &&
    locale.value.startsWith('fa')
      ? 'امروز'
      : props.todayLabel,
)
const formatYear = computed(() =>
  isPersian.value
    ? (year: number) =>
        new Intl.NumberFormat(locale.value, { useGrouping: false }).format(year)
    : undefined,
)

const selectableYears = computed(() => {
  if (!isPersian.value) return undefined
  const minDate = props.min ? getPersianDateFromISO(props.min.slice(0, 10)).year : activeYear.value - 100
  const maxDate = props.max ? getPersianDateFromISO(props.max.slice(0, 10)).year : activeYear.value + 10
  const start = Math.max(MIN_SUPPORTED_YEAR, Math.min(minDate, activeYear.value))
  const end = Math.min(MAX_SUPPORTED_YEAR, Math.max(maxDate, activeYear.value))
  return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index)
})

const panelRef = ref<CalendarPanelExposed | null>(null)
const focusedDate = ref<Dayjs | null>(null)
let ownCommit: string | null = null

function seedFocus(): void {
  const anchor = model.value ? dayjs(model.value) : dayjs(todayISO.value)
  if (anchor.isValid()) {
    if (!isPersian.value || getPersianDateFromISO(anchor.format(DATE_FORMAT)).year <= MAX_SUPPORTED_YEAR && getPersianDateFromISO(anchor.format(DATE_FORMAT)).year >= MIN_SUPPORTED_YEAR) {
      if (isPersian.value) setPersianView(anchor)
      else gregorian.focusOn(anchor)
      if (!checkUnavailable(anchor)) {
        focusedDate.value = anchor
        return
      }
    }
  }
  const cell = weeks.value.flat().find((item) => item.inMonth && !item.isUnavailable)
  if (cell) focusedDate.value = cell.date
}

watch(
  () => [model.value, props.calendar] as const,
  ([value]) => {
    if (value === ownCommit) {
      ownCommit = null
      return
    }
    view.value = 'date'
    seedFocus()
  },
  { immediate: true },
)

function commit(value: string): void {
  ownCommit = value
  model.value = value
}

function select(date: Dayjs): void {
  if (checkUnavailable(date)) return
  const value = date.format(DATE_FORMAT)
  focusedDate.value = date
  commit(value)
  emit('select', value)
}

function selectToday(): void {
  const today = dayjs(todayISO.value)
  if (checkUnavailable(today)) return
  navigateToDate(today)
  const value = today.format(DATE_FORMAT)
  commit(value)
  emit('today', value)
}

function focus(): void {
  panelRef.value?.focusInitialCell()
}

defineExpose<DateCalendarExposed>({ focus })
</script>
