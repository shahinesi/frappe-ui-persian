---
outline: [2, 3]
---

# Localization foundations

`frappe-ui/localization` provides small display-layer helpers for applications
that declare their active language and direction on the document element. The
application remains responsible for setting those attributes:

```html
<html lang="fa-IR" dir="rtl"></html>
```

```ts
import {
  formatLocaleDate,
  formatLocaleNumber,
  useDocumentLocale,
} from 'frappe-ui/localization'

const { locale, direction } = useDocumentLocale()
const amount = formatLocaleNumber(1234.5)
const date = formatLocaleDate('2025-03-20', {
  calendar: 'persian',
  dateStyle: 'long',
})
```

`useDocumentLocale()` reacts when the document's `lang` or `dir` changes. It
does not mutate the document. Components should continue to use logical layout
properties and native direction inheritance; callers can bind `direction` to a
local subtree when needed.

The formatting helpers only produce display strings. A date-only `YYYY-MM-DD`
value is interpreted as a UTC calendar date to avoid timezone day shifts. An
explicit `calendar: 'persian'` asks the browser's `Intl` implementation to
render that Gregorian input using the Persian calendar. The original value, API
payload, and database representation are unchanged. `null`, `undefined`, and
`NaN` number values format as empty; zero formats as zero.

The `DatePicker` still accepts and emits Gregorian `YYYY-MM-DD` values and
renders its existing Gregorian calendar. These helpers do not turn that
interactive calendar into a Jalali calendar; that requires a separately
designed, tested calendar adapter.

## Vazirmatn

Import the optional utility stylesheet and register the font asset in the
consuming app:

```ts
import 'frappe-ui/localization/style.css'
```

```vue
<section class="fui-vazirmatn">Persian text</section>
```

The package does not bundle the font file. The class applies the `Vazirmatn`
font family when the consuming application has loaded it, with a sans-serif
fallback.
