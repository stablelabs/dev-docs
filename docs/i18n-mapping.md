# i18n mapping (en → cn / ko)

`en` is the source of truth. `cn` and `ko` share an identical structure, so the
**same mapping applies to both locales**. The machine-readable version lives in
[`i18n-mapping.json`](./i18n-mapping.json) and drives the re-homing migration and
`verify-i18n.mts`.

## Status legend

| status | meaning | action |
| --- | --- | --- |
| `rehome` | translation exists at the same relative path as `en` | none (already aligned) |
| `rename` | translation exists at a different path/filename than `en` | `git mv` to the `en` path |
| `translate` | `en` page has no translation | author cn + ko at the `en` path |
| `retire` | cn/ko page with no `en` equivalent | keep-or-retire decision (pending) |

## Totals

- **126** en pages (canonical set).
- **49** existing cn/ko pages → 44 `rename` + 2 `rehome` + 3 `retire`.
- **80** en pages need fresh translation in each of cn and ko.

## Orphans — retired

`en` is the source of truth, so cn/ko pages with no English counterpart were
retired (`git rm` from both locales) rather than kept:

- `introduction/why-stable.mdx`
- `introduction/stable-for-users.mdx`
- `resources/official-links.mdx`

If any of these concepts should exist, add the page to `en/` first; the
translation pipeline will then propagate it to cn/ko.
