/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest'
import { buildAxisChartOption } from './axisChartOptions'
import type { ChartTokens } from './tokens'
import type { AxisChartConfig } from './types'
import { formatTimeAxisLabel } from './format'

const tokens: ChartTokens = {
  categorical: ['#111111', '#222222', '#333333'],
  sequential: ['#000011', '#000022', '#000033'],
  diverging: ['#001100', '#002200', '#003300'],
  axisLabel: 'ink-5',
  axisTitle: 'ink-7',
  axisLine: 'outline-2',
  gridline: 'outline-1',
  dataLabel: 'ink-6',
  insideLabel: 'ink-8',
  backdrop: '#ffffff',
}

function buildTimeAxis() {
  const config: AxisChartConfig = {
    type: 'bar',
    data: [
      { date: '2026-10-01', sales: 10 },
      { date: '2026-11-01', sales: 20 },
    ],
    xAxis: { key: 'date', type: 'time' },
    series: [{ name: 'sales' }],
  }
  return buildAxisChartOption(config, { tokens }) as any
}

afterEach(() => {
  document.documentElement.lang = ''
})

describe('formatTimeAxisLabel locale calendar', () => {
  it('uses Persian month and day labels for Persian document locales', () => {
    document.documentElement.lang = 'fa-IR'

    expect(buildTimeAxis().xAxis.axisLabel.formatter('2026-10-01')).toBe(
      'مهر',
    )
    expect(formatTimeAxisLabel('2026-10-02', 'day')).toBe('10')
  })

  it('keeps the Gregorian English labels in English mode', () => {
    document.documentElement.lang = 'en-US'

    expect(buildTimeAxis().xAxis.axisLabel.formatter('2026-10-01')).toBe(
      'Oct',
    )
    expect(formatTimeAxisLabel('2026-10-02', 'day')).toBe('2')
  })

  it('allows an explicit Gregorian calendar to override a Persian locale', () => {
    document.documentElement.lang = 'fa-IR'

    expect(formatTimeAxisLabel('2026-10-01', 'month', 0, 'gregorian')).toBe(
      'Oct',
    )
  })
})
