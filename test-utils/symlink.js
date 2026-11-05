import fs from 'node:fs'

/**
 * Create a directory link on Windows without requiring Developer Mode.
 * Junctions preserve the traversal semantics these tests exercise.
 */
export function createDirectorySymlink(target, link) {
  fs.symlinkSync(
    target,
    link,
    process.platform === 'win32' ? 'junction' : 'dir',
  )
}

/**
 * File symlinks require Developer Mode or an elevated token on Windows.
 * Skip only when the host denies that capability; keep all other failures.
 */
export function createFileSymlinkOrSkip(target, link, context) {
  try {
    fs.symlinkSync(target, link, 'file')
  } catch (error) {
    if (
      process.platform === 'win32' &&
      ['EPERM', 'EACCES'].includes(error?.code)
    ) {
      context.skip()
    }
    throw error
  }
}
