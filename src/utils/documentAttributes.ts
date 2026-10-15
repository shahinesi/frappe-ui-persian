import { ref } from 'vue'
import { readDocumentLocale } from './readDocumentLocale'

// Shared by document-aware composables and chart renderers, so one page gets
// one observer for its language, direction, and theme attributes.
const documentVersion = ref(0)
let observer: MutationObserver | undefined

/** The version of the document attributes that affect Frappe UI rendering. */
export function documentAttributes(): number {
  if (typeof document === 'undefined') return 0
  if (!observer && typeof MutationObserver !== 'undefined') {
    observer = new MutationObserver(() => documentVersion.value++)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['dir', 'lang', 'data-theme', 'class'],
    })
  }
  return documentVersion.value
}

/** Read the page direction, defaulting to left-to-right when it is undeclared. */
export function documentDir(): 'ltr' | 'rtl' {
  documentAttributes()
  if (typeof document === 'undefined') return 'ltr'
  return document.documentElement.dir === 'rtl' ? 'rtl' : 'ltr'
}

/**
 * Read the page language, defaulting to `en-US` for stable behavior in
 * standalone apps that do not declare a document language.
 */
export function documentLocale(): string {
  documentAttributes()
  return readDocumentLocale()
}
