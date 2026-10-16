import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const localizationDir = dirname(fileURLToPath(import.meta.url))
const packageRoot = resolve(localizationDir, '../..')

describe('localization stylesheet assets', () => {
  it('ships the opt-in Vazirmatn font and its OFL notice with the package', () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(packageRoot, 'package.json'), 'utf8'),
    )
    const stylesheetExport = packageJson.exports['./localization/style.css']
    const stylesheet = readFileSync(
      resolve(localizationDir, 'style.css'),
      'utf8',
    )
    const fontPath = resolve(
      localizationDir,
      '../fonts/Vazirmatn/Vazirmatn-wght.woff2',
    )
    const license = readFileSync(
      resolve(localizationDir, '../fonts/Vazirmatn/OFL.txt'),
      'utf8',
    )

    expect(stylesheetExport.import).toBe('./src/localization/style.css')
    expect(packageJson.files).toContain('src')
    expect(stylesheet).toContain("font-family: Vazirmatn")
    expect(stylesheet).toContain("url('../fonts/Vazirmatn/Vazirmatn-wght.woff2')")
    expect(stylesheet).toContain('.fui-vazirmatn')
    expect(existsSync(fontPath)).toBe(true)
    expect(license).toContain('SIL OPEN FONT LICENSE Version 1.1')
  })
})
