# DR003: Page filenames must not end in `index`

## Context

Several pages were 404ing in dev and in the production build even though their
`.mdx` source existed and was linked from `docs/sidebar.json`:

- `/en/explanation/accounts-index` and its siblings `ai-agents-index`,
  `contracts-index`, `payments-index` (the four "guides" hub pages), in all
  three locales — 12 files.
- `/cn/index`, `/ko/index` (the language-switcher targets).

The cause is in Vocs' route generation. Vocs maps page files to URLs in
`node_modules/vocs/_lib/vite/plugins/virtual-routes.js`:

```js
let pagePath = path.replace(replacer, '').replace(/\.[^.]*$/, '');
if (pagePath.endsWith('index'))
    pagePath = pagePath.replace(/index$/, '').replace(/\/$/, '');
```

The intent is the standard "`index.mdx` becomes the directory root" rule
(`pages/cn/index.mdx` → `/cn`). But the check is `endsWith('index')` and the
strip is `/index$/` — **neither is anchored to a path separator.** So the
trailing string `index` is removed from *any* filename, not just a standalone
`index.mdx`:

| Source file | Intended URL | Actual URL Vocs emits |
| --- | --- | --- |
| `explanation/accounts-index.mdx` | `/…/accounts-index` | `/…/accounts-` |
| `cn/index.mdx` | `/cn` | `/cn` (correct) |

So `accounts-index.mdx` was served at `/…/accounts-` and every link to
`/…/accounts-index` 404'd. The `cn/index.mdx` → `/cn` mapping was correct, but
the `topNav` language switcher in `vocs.config.ts` linked to `/cn/index` /
`/ko/index`, which don't exist.

This is upstream behavior in Vocs (v1.4.1), not something we configure. We don't
control route generation, so we adapt our filenames to it.

## Decision

**No page file under `docs/pages/**` may have a basename ending in `index`
other than a standalone `index.mdx`.** A standalone `index.mdx` is the only
legitimate use of the word — it intentionally maps a directory to its root URL.

Concretely:

1. The four hub pages were renamed `*-index.mdx` → `*-guides.mdx` in all three
   locales (`git mv`, history preserved), matching their frontmatter titles
   ("Accounts guides", "Payments guides", …). All references were updated:
   `sidebar.json` (12 links), the cross-links in the sibling `*-overview.mdx`
   pages, and the `source_path` frontmatter in the cn/ko mirrors.
2. The `topNav` language switcher links were corrected to the directory roots:
   `/cn/index` → `/cn`, `/ko/index` → `/ko`.

To link to a section landing page, use a standalone `index.mdx` in that
directory (URL = the directory) or a descriptively-named file that does **not**
end in `index` (e.g. `-guides`, `-overview`). Do not reach for `-index` as a
"section index" naming idiom — it is the one suffix Vocs will silently eat.

## Consequences

- The 12 hub pages and the two locale-root switcher links resolve correctly in
  dev and in `docs:build` output.
- This is a public-URL change. The old `…-index` paths are gone, but they were
  already 404s, so no working URL was lost. There is nothing to redirect.
- A future contributor naming a page `foo-index.mdx` will silently ship a broken
  URL — the build does **not** error, it just emits `/foo-`. The guardrail is
  this record plus `docs:build` link-checking: a `sidebar.json` link to the
  intended `/foo-index` fails the build, surfacing the mistake. (A lint rule
  rejecting non-`index.mdx` files ending in `index` would make this active
  rather than incidental — an open follow-up if it recurs.)

## Related

- **Node ≥ 22 is required to build.** Vocs uses `globSync` from `node:fs`, which
  does not exist on Node 20 (`docs:build` throws
  `does not provide an export named 'globSync'`). Pinned in `.nvmrc` (`22`) and
  noted in `CLAUDE.md`; run `nvm use` before `docs:dev` / `docs:build`.
- Renames must stay path-parallel across `en`/`cn`/`ko` per
  [DR002](./DR002_i18n_Sync_Pipeline.md) — hence all 12 files moved together and
  the cn/ko `source_path` frontmatter was updated alongside the en rename.
