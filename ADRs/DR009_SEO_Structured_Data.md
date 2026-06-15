# DR009: Structured Data (JSON-LD) Strategy

## Context

A crawl of the built output (`docs/dist`) found **no structured data at all** on
docs.stable.xyz, and several SEO signals were missing:

| Signal | Before |
| --- | --- |
| `application/ld+json` (any JSON-LD) | **None** on any page |
| `<title>`, `<meta name="description">` | Present (Vocs default) |
| `og:type`, `og:title`, `og:description`, `twitter:card` | Present (Vocs default) |
| `<link rel="canonical">` | **Missing** |
| `og:url`, `og:image`, `twitter:image` | **Missing** |
| `hreflang` alternates | **Missing** (despite en / cn / ko locales) |
| `baseUrl` in `vocs.config.ts` | **Not set** |

What we had to build on: every English page already carries a custom `diataxis`
frontmatter field (`explanation` / `how-to` / `reference` / `tutorial`), which is a
near-perfect signal for choosing a schema type. The corpus is ~225 pages across three
locales (`en` uses a Diátaxis structure; `cn` / `ko` mirror an earlier structure and
lack the `diataxis` field).

Vocs (on **v1.4.1** at the time of this decision) has no dedicated "schema" feature.
The framework-blessed injection point is the **`head` config option**, a function:

```ts
head?: (params: { path: string }) => ReactElement | Promise<ReactElement>
```

Vocs calls this for **every route at static-build time** and renders the returned
elements into the page `<head>` (`node_modules/vocs/_lib/vite/utils/html.js`). Because
it runs during prerender, the JSON-LD ends up in the **static HTML** — exactly what
search crawlers and AI answer engines read without executing JavaScript.

## Decision

Inject JSON-LD and complementary SEO tags centrally via the Vocs `head` function. The
implementation lives in **`docs/lib/structured-data.ts`** and is wired into
**`vocs.config.ts`** via the `head` option.

**Injection mechanics.** `path` is the clean route (trailing slash stripped), e.g. `/`,
`/en`, `/en/tutorial/quick-start`. The function only receives the path, so we build a
**path → frontmatter index** once at module load by scanning `docs/pages/**/*.mdx`. This
keeps all ~225 pages covered from a single file — no per-page MDX edits.

> Per-page frontmatter `head` injection is **not** the right tool here: it would mean
> editing ~225 files and duplicating the schema logic. The central `head` function is the
> maintainable choice.

We deliberately **do not** set `baseUrl`. In Vocs, `baseUrl` emits a `<base>` tag, which
can subtly change relative-URL resolution. All our URLs are generated as absolute strings
inside the module, so the canonical site URL is owned in one place (`SITE_URL`) with zero
risk to existing links.

### Global / shared nodes (every page)

Emitted on every page inside a single `@graph`, with stable `@id`s so consumers
de-duplicate them (the same pattern Yoast emits on every WordPress page — robust for both
classic crawlers and LLMs):

- **`Organization`** (`@id: https://stable.xyz/#organization`) — `name` "Stable",
  `alternateName` "StableChain", `url`, `logo`, and `sameAs` (X, Discord). Referenced by
  `@id` from every page's `publisher` / `author`.
- **`WebSite`** (`@id: https://docs.stable.xyz/#website`) — `name`, `description`,
  `publisher` → Organization, and `inLanguage` for all three locales.

No `SearchAction` is declared: Vocs search is client-side with no query URL endpoint, and
declaring a fake one is worse than omitting it.

### Per-page-type nodes

The page type is chosen from `diataxis` frontmatter plus a couple of path rules. Each
content page also gets a **`BreadcrumbList`**.

| Docs page type | Detection | schema.org `@type` | Extras |
| --- | --- | --- | --- |
| Docs home / product overview | route `/` (landing) | `WebPage` | `about` → Stable |
| Locale home | `/en`, `/cn`, `/ko` | `TechArticle` | breadcrumb |
| Guides / tutorials / quickstarts | `diataxis: tutorial` or `how-to` | `HowTo` | `step[]` parsed from H2 headings, each linking its in-page anchor |
| Conceptual / architecture | `diataxis: explanation` | `TechArticle` | `about` → Stable |
| Reference | `diataxis: reference` | `TechArticle` | — |
| API reference | reference page whose slug ends `-api`, or contains `json-rpc` / `api-overview` | `APIReference` (a `TechArticle` subtype) | — |
| FAQ | slug `faq` | `FAQPage` | `mainEntity[]` of `Question` / `Answer` parsed from the page; falls back to `TechArticle` if fewer than 2 Q/A pairs parse |
| Changelog / release notes | version-history pages (`diataxis: reference`) | `TechArticle` | schema.org has no first-class changelog type; `TechArticle` is the accepted choice |
| Integration guides | live under `how-to` / `reference`; typed as above | `HowTo` / `TechArticle` | — |

Every article-type node carries: `name`, `headline`, `description`, `url`, `inLanguage`
(locale-correct: `en` / `zh-CN` / `ko`), `isPartOf` → WebSite, `author` + `publisher` →
Organization, and `about` → a Stable `Thing`.

### Complementary SEO tags (same `head` function)

Vocs does not emit these, and they make the structured data internally consistent:

- `<link rel="canonical">` — absolute, per page.
- `og:url` — absolute, per page.
- `og:image` + `twitter:image` — defaults to `/images/stable-banner.png`.
- `hreflang` alternates — emitted only when the *same relative path* exists in another
  locale (so `cn` ↔ `ko` mirror pages link to each other; standalone `en` pages don't
  fabricate alternates). This avoids invalid cross-locale links between the divergent `en`
  and `cn`/`ko` trees.

## Consequences

- All ~225 pages gain JSON-LD and consistent SEO tags from a single file; new pages are
  picked up automatically by the frontmatter scan and inherit the right schema from their
  `diataxis` field (or `TechArticle` by default). No MDX pages need editing.
- **FAQPage and HowTo rich results:** Google restricted *visible* FAQ rich results to
  government/health sites in 2023 and deprecated HowTo rich results. The markup remains
  valid and valuable — it is still consumed by AI answer engines (ChatGPT, Perplexity,
  Gemini) and other crawlers for entity/answer extraction, which is the bigger prize for
  developer docs. That is why we keep it.
- The site config stays unchanged apart from the `head` wiring; canonical URL ownership is
  centralized in `SITE_URL`.

### Maintenance

Everything is in `docs/lib/structured-data.ts`:

- **Change identity** (logo, social profiles, org name): edit the constants at the top
  (`ORG_*`, `SITE_*`, `ORG_SAME_AS`).
- **Change a page-type mapping**: edit `pageTypeFor()`.
- **Add a new page type**: extend `pageTypeFor()` and add a branch in `articleNode()`.
- **Add `dateModified`**: Vocs can inject `lastModified` (git commit date) into
  frontmatter; if enabled, read it in the page index and add it to `articleNode()`.

## Verification & testing

Checks from fastest to most thorough. Run everything from the repo root.

### Step 1 — Fast logic check (no full build, ~2s)

Renders the schema for representative routes and asserts the JSON parses and the right
`@type` is chosen for each page type. Quickest way to confirm a change.

```bash
node --experimental-strip-types docs/lib/verify-structured-data.mts
```

Expected: a block per route ending in `✓ all routes produced valid JSON-LD`. You should
see `HowTo` (with a step count) for tutorials/how-tos, `APIReference` for `*-api` pages,
`FAQPage` (with a Q/A count) for FAQ pages in all three languages, `TechArticle` for
explanation/reference, and `WebPage` for `/`. Exit code is non-zero if anything fails.

> Node 18.19+/20+/22 supports `--experimental-strip-types`. On very new Node you can drop
> the flag.

### Step 2 — Live dev server spot-check

```bash
npm run docs:dev
```

Open a page, e.g. `http://localhost:5173/en/tutorial/quick-start`, then **View Source**
(not DevTools Elements — you want the served HTML) and search for `application/ld+json`.
Confirm the `<script>` block is present and contains `HowTo` with a `step` array. Repeat
for one page of each type:

- `/` → `WebPage` + `Organization` + `WebSite`
- `/en/explanation/overview` → `TechArticle`
- `/en/reference/json-rpc-api` → `APIReference`
- `/en/reference/faq` → `FAQPage` with `mainEntity`

### Step 3 — Full production build + grep the output

```bash
npm run docs:build
```

Then confirm every built HTML page carries JSON-LD:

```bash
# Pages WITHOUT a JSON-LD <script> (should print nothing):
for f in $(find docs/dist -name '*.html'); do
  grep -q '<script type="application/ld+json">' "$f" || echo "MISSING: $f"
done

# Count of pages WITH it (should equal your page count):
grep -rl '<script type="application/ld+json">' docs/dist --include='*.html' | wc -l
```

> Use `--include='*.html'` so the count isn't inflated by JS bundles that happen to
> contain the string. The landing page only gets its JSON-LD after a **complete** build,
> so make sure the build finished before grepping.

Pretty-print and validate one built page's JSON-LD locally:

```bash
python3 - <<'PY'
import re, json
html = open('docs/dist/en/reference/faq/index.html').read()
m = re.search(r'<script type="application/ld\+json">(.*?)</script>', html, re.S)
print(json.dumps(json.loads(m.group(1)), indent=2, ensure_ascii=False))
PY
```

Preview the production build in a browser with `npm run docs:preview`.

### Step 4 — Validate against schema.org / Google (authoritative)

Use the rendered HTML, since these tools read the served markup.

1. **Schema Markup Validator** — https://validator.schema.org/ — Paste a page URL (after
   deploy) or the raw HTML (local). Confirm zero errors; warnings about
   recommended-but-optional properties are fine.
2. **Google Rich Results Test** — https://search.google.com/test/rich-results — Run a
   tutorial page, an FAQ page, and a reference page. Check it detects the item types and
   reports no errors.

What to expect: `BreadcrumbList` is broadly eligible for rich results. `FAQPage` and
`HowTo` are **valid** but Google no longer shows their rich results for most sites (policy
change, 2023) — expected, and the markup is still consumed by AI answer engines.
`Organization` / `WebSite` are knowledge-graph signals, not visible snippets.

### Step 5 — Post-deploy verification

After deploying to docs.stable.xyz:

1. **View served HTML** (proves crawlers see it without running JS):
   ```bash
   curl -s https://docs.stable.xyz/en/tutorial/quick-start | grep -o 'application/ld+json'
   ```
2. **Run live URLs** through the two validators in Step 4.
3. **Google Search Console** → *Enhancements* and *URL Inspection*: after Google recrawls,
   it reports detected structured-data items per URL (allow days/weeks for recrawl).
4. **Check canonical + hreflang** are present:
   ```bash
   curl -s https://docs.stable.xyz/cn/introduction/faq | grep -oE 'rel="canonical"[^>]*|hrefLang="[^"]*"'
   ```

### What "passing" looks like

| Check | Pass condition |
| --- | --- |
| Step 1 script | `✓ all routes produced valid JSON-LD`, exit 0 |
| Step 3 grep | no `MISSING:` lines; count = page count |
| schema.org validator | 0 errors |
| Rich Results Test | item types detected, 0 errors |
| Search Console | structured-data items detected per URL (post-recrawl) |

If you change `docs/lib/structured-data.ts`, re-run **Step 1** first — it catches almost
everything in seconds.
