import { configDefaults, defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    plugins: [
      {
        name: 'strip-cli-shebang-in-tests',
        enforce: 'pre',
        transform(source, id) {
          const normalizedId = id.replaceAll('\\', '/')
          if (
            !normalizedId.includes('/scripts/migrate-') ||
            !normalizedId.endsWith('.js') ||
            !source.startsWith('#!')
          )
            return

          return source.replace(/^[^\r\n]*(?:\r?\n|$)/, '')
        },
      },
    ],
    test: {
      globals: true,
      root: __dirname,
      setupFiles: ['./vitest.setup.ts'],
      // .github/barista/scripts/*.test.ts are bun:test files for the barista
      // GitHub Action scripts, run by `bun test` in a separate CI job — not
      // valid vitest specs (they import from 'bun:test', which vitest can't
      // resolve).
      //
      // packages/* are separate npm packages with their own test runner.
      exclude: [...configDefaults.exclude, '.github/**', 'packages/**'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html', 'lcov'],
        reportsDirectory: 'coverage/vitest',
        include: ['src/**/*.{ts,vue}'],
        exclude: [
          'src/**/*.cy.ts',
          'src/**/*.spec.ts',
          'src/**/*.test.ts',
          'src/**/test-helpers.ts',
          'src/**/*.story.vue',
          'src/**/stories/**',
          'src/**/types.ts',
          'src/**/types/**',
          'src/**/index.ts',
        ],
      },
    },
  }),
)
