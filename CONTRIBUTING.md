# Contributing to the Stable docs

## Golden rule

**English is the source of truth.** Write and edit content in `docs/pages/en/`
only. The Chinese (`cn`) and Korean (`ko`) pages are generated from English by the
translation pipeline — never hand-edit them except to review a generated draft.

If you find yourself editing a `cn`/`ko` page for anything other than reviewing an
auto-generated translation, you're off-process.

> Why this exists (the full rationale): [`ADRs/DR002_i18n_Sync_Pipeline.md`](./ADRs/DR002_i18n_Sync_Pipeline.md).

## Writing or updating a page

1. **Edit English only.** New page → create it under the right Diátaxis folder in
   `docs/pages/en/` (`explanation/`, `how-to/`, `reference/`, `tutorial/`,
   `resources/`) with `title` / `description` / `diataxis` frontmatter.
2. **Update the sidebar if pages were added/moved/renamed.** Edit the `/en/` entries
   in `docs/sidebar.json`; the `cn`/`ko` sidebars mirror it.
3. **Open a PR.** Two workflows run on it:
   - **`i18n-translate`** diffs the en pages you changed, translates *just those*
     into `cn` + `ko`, and commits the translations back to your PR branch.
   - **`i18n-check`** enforces parity — every en page must have a same-path
     `cn`/`ko` file (missing = ❌ blocks merge), flags translations whose English
     source drifted (stale = ⚠ warns), and builds all three locales to catch broken
     links.
4. **Review and merge.** Review the English change *and* the auto-generated
   translations in the same PR. Once translations are committed, `i18n-check` goes
   green → merge.

**Steady state: edit en → bot drafts cn/ko into the PR → review → merge.**

## Special cases

- **Deleting a page:** `git rm` it from `en` **and** the same path in `cn`/`ko`.
  No orphan translations — English is the source of truth.
- **Renaming/moving:** `git mv` in `en`, mirror in `cn`/`ko`, and update
  `docs/sidebar.json`.
- **Fork PRs:** the bot can't push to a fork, so translations won't auto-commit and
  `i18n-check` will fail. A maintainer runs the engine locally and pushes:
  ```bash
  ANTHROPIC_API_KEY=… node docs/lib/i18n-translate.mjs cn <changed/page.mdx> …
  ANTHROPIC_API_KEY=… node docs/lib/i18n-translate.mjs ko <changed/page.mdx> …
  ```
- **Local checks:**
  ```bash
  npm run i18n:check   # parity + freshness snapshot (0 missing = structurally complete)
  npm run docs:build   # builds en/cn/ko, catches broken links
  npm run docs:dev     # local preview
  ```

## The pipeline at a glance

| Piece | What it does |
| --- | --- |
| `docs/pages/en/**` | Canonical content (Diátaxis structure) |
| `docs/lib/verify-i18n.mjs` (`npm run i18n:check`) | Parity gate (block on missing) + staleness (warn on drifted `source_sha`) |
| `docs/lib/i18n-translate.mjs <cn\|ko> [--stale] [pages…]` | Translation engine (`claude-opus-4-8`); stamps `source_path`/`source_sha` |
| `.github/workflows/i18n-check.yml` | Runs the gate + build on every PR |
| `.github/workflows/i18n-translate.yml` | Translates a PR's changed en pages into cn/ko, in-PR |
| `docs/i18n-allowlist.json` | en paths intentionally left untranslated |

A translation is **fresh** when its frontmatter `source_sha` equals
`git hash-object` of the current en file at the same path; editing the English page
flips it to stale until re-translated.
