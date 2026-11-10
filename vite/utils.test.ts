import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import {
  directoryParents,
  findAppName,
  findAppsFolder,
  findBenchPath,
} from './utils.js'

const roots: string[] = []

afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true })
})

describe('directoryParents', () => {
  it('stops at both POSIX and Windows filesystem roots', () => {
    expect([
      ...directoryParents('/home/frappe/apps/helpdesk', path.posix),
    ]).toEqual([
      '/home/frappe/apps/helpdesk',
      '/home/frappe/apps',
      '/home/frappe',
      '/home',
      '/',
    ])
    expect([
      ...directoryParents('C:\\frappe\\apps\\helpdesk', path.win32),
    ]).toEqual([
      'C:\\frappe\\apps\\helpdesk',
      'C:\\frappe\\apps',
      'C:\\frappe',
      'C:\\',
    ])
  })
})

describe('Frappe bench path detection', () => {
  it('finds the bench, apps folder, and app name from a nested directory', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'frappe-ui-vite-utils-'))
    roots.push(root)
    const bench = path.join(root, 'bench')
    const appDirectory = path.join(bench, 'apps', 'helpdesk', 'frontend')
    mkdirSync(path.join(bench, 'sites'), { recursive: true })
    mkdirSync(appDirectory, { recursive: true })

    expect(findBenchPath(appDirectory)).toBe(bench)
    expect(findAppsFolder(appDirectory)).toBe(path.join(bench, 'apps'))
    expect(findAppName(appDirectory)).toBe('helpdesk')
  })

  it('returns null when no bench exists above the starting directory', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'frappe-ui-vite-utils-'))
    roots.push(root)
    const nested = path.join(root, 'not-a-bench', 'frontend')
    mkdirSync(nested, { recursive: true })

    expect(findBenchPath(nested)).toBeNull()
    expect(findAppsFolder(nested)).toBeNull()
    expect(findAppName(nested)).toBeNull()
  })
})
