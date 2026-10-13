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

## Persian calendar model

For applications that need to render a Jalali calendar while keeping Frappe's
Gregorian API contract, the localization subpath also exports a headless
calendar model:

```ts
import {
  getISODateFromPersianDate,
  getPersianCalendarMonth,
  getPersianDateFromISO,
} from 'frappe-ui/localization'

const grid = getPersianCalendarMonth(1404, 1, 'fa-IR')
const selected = getISODateFromPersianDate({ year: 1404, month: 1, day: 1 })
const displayFields = getPersianDateFromISO(selected)
```

The grid contains six weeks, always ordered Saturday through Friday. Each cell
includes a Persian day label and a Gregorian `isoDate`; pass that ISO value to
the existing DatePicker model or backend without converting the stored value.
The model is headless and does not replace Frappe UI's interactive DatePicker.
Its supported Persian years are 1200–1600. Calendar conversion uses the
runtime's `Intl` Persian calendar implementation, so no date-conversion
dependency is bundled.

## Vazirmatn

Import the optional utility stylesheet. It includes the Vazirmatn variable
font and its SIL Open Font License notice:

```ts
import 'frappe-ui/localization/style.css'
```

```vue
<section class="fui-vazirmatn">Persian text</section>
```

The `.fui-vazirmatn` class applies the bundled `Vazirmatn` font with a
sans-serif fallback. It is opt-in: importing the stylesheet does not change
typography outside elements carrying this class. Font loading uses
`font-display: swap`.
