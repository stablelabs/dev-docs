/**
 * Structured data (JSON-LD) for the Stable docs.
 *
 * Vocs (1.4.1) renders `config.head({ path })` into the `<head>` of every page
 * at static-build time (see node_modules/vocs/_lib/vite/utils/html.js). That's
 * the single injection point used here: one `head()` function emits a schema.org
 * `@graph` per page plus a few complementary SEO tags (canonical, og:url,
 * og:image, hreflang) that Vocs does not emit on its own.
 *
 * Design:
 *  - Global nodes (Organization, WebSite) are repeated on every page with stable
 *    `@id`s so consumers de-duplicate them. This is the standard, robust pattern
 *    (it's what Yoast emits on every WordPress page) and is friendly to both
 *    classic crawlers and LLM/AI answer engines.
 *  - The per-page article type is derived from the page's Diátaxis frontmatter
 *    (`diataxis: explanation | how-to | reference | tutorial`), which the English
 *    docs already carry. Pages without it (cn/ko) fall back to TechArticle.
 *  - FAQ pages emit FAQPage with parsed Q/A pairs. Tutorial/how-to pages emit
 *    HowTo with steps parsed from their H2 headings. API reference pages emit
 *    APIReference (a TechArticle subtype).
 *
 * Frontmatter is parsed with a tiny built-in reader (no gray-matter dependency).
 * The page index is built once at module load and reused for every page.
 */

import { createElement, Fragment, type ReactElement } from 'react'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

/* --------------------------------- Identity -------------------------------- */

const SITE_URL = 'https://docs.stable.xyz'
const SITE_NAME = 'Stable Docs'
const SITE_DESCRIPTION =
  'Explore Stable docs to integrate stablecoin payments, liquidity, and infrastructure securely into your platform.'

const ORG_URL = 'https://stable.xyz'
const ORG_ID = `${ORG_URL}/#organization`
const WEBSITE_ID = `${SITE_URL}/#website`

const ORG_LOGO = `${SITE_URL}/logo/logo.png`
const DEFAULT_OG_IMAGE = `${SITE_URL}/images/stable-banner.png`

const ORG_SAME_AS = ['https://x.com/stable', 'https://discord.gg/stablexyz']

/* The product the docs are about — attached as `about` on article nodes so the
   entity is unambiguous to AI answer engines. */
const ABOUT_THING = {
  '@type': 'Thing',
  name: 'Stable',
  description:
    'A Layer 1 blockchain where USD₮ (USDT0) is the native gas token and settlement asset, with full EVM compatibility.',
  sameAs: ORG_URL,
}

/* ------------------------------ Page indexing ------------------------------ */

type PageMeta = {
  route: string
  file: string
  locale: string
  title?: string
  description?: string
  diataxis?: string
}

const PAGES_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'pages')

function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else if (/\.mdx?$/.test(entry)) out.push(full)
  }
  return out
}

/** Minimal YAML frontmatter reader for the simple `key: value` shape used here. */
function parseFrontmatter(raw: string): Record<string, string> {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return {}
  const fields: Record<string, string> = {}
  for (const line of match[1].split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
    if (!m) continue
    let value = m[2].trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    )
      value = value.slice(1, -1)
    fields[m[1]] = value
  }
  return fields
}

/** Map an absolute page file to its Vocs route (index files map to their dir). */
function routeFor(file: string): string {
  const rel = relative(PAGES_DIR, file).replace(/\\/g, '/')
  const noExt = rel.replace(/\.(mdx?|md)$/, '')
  if (noExt === 'index') return '/'
  if (noExt.endsWith('/index')) return `/${noExt.slice(0, -'/index'.length)}`
  return `/${noExt}`
}

const LOCALES = ['en', 'cn', 'ko'] as const
const LANG_TAG: Record<string, string> = { en: 'en', cn: 'zh-CN', ko: 'ko' }

function localeOf(route: string): string | undefined {
  const seg = route.split('/').filter(Boolean)[0]
  return seg && (LOCALES as readonly string[]).includes(seg) ? seg : undefined
}

const index: Map<string, PageMeta> = (() => {
  const map = new Map<string, PageMeta>()
  for (const file of walk(PAGES_DIR)) {
    const raw = readFileSync(file, 'utf8')
    const fm = parseFrontmatter(raw)
    const route = routeFor(file)
    map.set(route, {
      route,
      file,
      locale: localeOf(route) ?? 'en',
      title: fm.title,
      description: fm.description,
      diataxis: fm.diataxis,
    })
  }
  return map
})()

/* ------------------------------ Body parsing ------------------------------- */

const bodyCache = new Map<string, string>()
function bodyOf(file: string): string {
  let body = bodyCache.get(file)
  if (body === undefined) {
    const raw = readFileSync(file, 'utf8')
    body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
    bodyCache.set(file, body)
  }
  return body
}

/** Strip inline markdown to readable plain text (for FAQ answers). */
function stripMarkdown(md: string): string {
  return md
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // links -> text
    .replace(/[*_`]/g, '') // emphasis / code ticks
    .replace(/^\s*[-*]\s+/gm, '') // bullet markers
    .replace(/\s+/g, ' ')
    .trim()
}

function slugify(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

/** HowTo steps from H2 headings, each pointing at its in-page anchor. */
function howToSteps(file: string, url: string) {
  const steps: object[] = []
  let position = 0
  for (const line of bodyOf(file).split(/\r?\n/)) {
    const m = line.match(/^##\s+(.+?)\s*$/)
    if (!m) continue
    const name = m[1].replace(/[*`]/g, '').trim()
    position += 1
    steps.push({
      '@type': 'HowToStep',
      position,
      name,
      url: `${url}#${slugify(name)}`,
    })
  }
  return steps
}

/** Q/A pairs from a FAQ page: bold questions ending in ? / ？ followed by text. */
function faqItems(file: string) {
  const lines = bodyOf(file).split(/\r?\n/)
  const items: { q: string; a: string }[] = []
  let current: { q: string; a: string[] } | null = null

  const flush = () => {
    if (current) {
      const a = stripMarkdown(current.a.join('\n'))
      if (a) items.push({ q: current.q, a })
    }
  }

  for (const line of lines) {
    const q = line.match(/^\*\*(.+?[?？])\*\*\s*$/)
    if (q) {
      flush()
      current = { q: q[1].replace(/\*\*/g, '').trim(), a: [] }
      continue
    }
    if (/^#{1,6}\s/.test(line)) {
      // a new section heading ends the current answer
      flush()
      current = null
      continue
    }
    if (current) current.a.push(line)
  }
  flush()

  return items.map((it) => ({
    '@type': 'Question',
    name: it.q,
    acceptedAnswer: { '@type': 'Answer', text: it.a },
  }))
}

/* ------------------------------ Type mapping ------------------------------- */

type PageType = 'TechArticle' | 'APIReference' | 'HowTo' | 'FAQPage'

function pageTypeFor(meta: PageMeta): PageType {
  const name = meta.route.split('/').pop() ?? ''
  if (name === 'faq') return 'FAQPage'
  if (
    meta.route.includes('/reference/') &&
    (/-api$/.test(name) || name.includes('json-rpc') || name.includes('api-overview'))
  )
    return 'APIReference'
  switch (meta.diataxis) {
    case 'tutorial':
    case 'how-to':
      return 'HowTo'
    case 'explanation':
    case 'reference':
      return 'TechArticle'
    default:
      return 'TechArticle'
  }
}

/* ------------------------------ Graph builders ----------------------------- */

function organizationNode() {
  return {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: 'Stable',
    alternateName: 'StableChain',
    url: ORG_URL,
    logo: { '@type': 'ImageObject', url: ORG_LOGO },
    sameAs: ORG_SAME_AS,
  }
}

function websiteNode() {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: `${SITE_URL}/`,
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    publisher: { '@id': ORG_ID },
    inLanguage: Object.values(LANG_TAG),
  }
}

function breadcrumbNode(meta: PageMeta, url: string) {
  const crumbs: { name: string; url?: string }[] = [
    { name: SITE_NAME, url: `${SITE_URL}/` },
  ]
  const locale = localeOf(meta.route)
  if (locale && meta.route !== `/${locale}`) {
    const home = index.get(`/${locale}`)
    crumbs.push({
      name: home?.title ?? locale.toUpperCase(),
      url: `${SITE_URL}/${locale}`,
    })
  }
  crumbs.push({ name: meta.title ?? 'Page', url })

  return {
    '@type': 'BreadcrumbList',
    '@id': `${url}#breadcrumb`,
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      ...(c.url ? { item: c.url } : {}),
    })),
  }
}

function articleNode(meta: PageMeta, url: string, type: PageType) {
  const inLanguage = LANG_TAG[meta.locale] ?? 'en'
  const base = {
    '@id': `${url}#primary`,
    name: meta.title,
    headline: meta.title,
    description: meta.description,
    url,
    inLanguage,
    isPartOf: { '@id': WEBSITE_ID },
    about: ABOUT_THING,
    author: { '@id': ORG_ID },
    publisher: { '@id': ORG_ID },
  }

  if (type === 'FAQPage') {
    const mainEntity = faqItems(meta.file)
    // Fall back to a plain article if the page didn't parse into real Q/A pairs.
    if (mainEntity.length >= 2)
      return { '@type': 'FAQPage', ...base, mainEntity }
    return { '@type': 'TechArticle', ...base }
  }

  if (type === 'HowTo')
    return { '@type': 'HowTo', ...base, step: howToSteps(meta.file, url) }

  return { '@type': type, ...base }
}

function graphFor(route: string) {
  const nodes: object[] = [organizationNode(), websiteNode()]
  const meta = index.get(route)

  if (route === '/') {
    // Landing page: describe it as the WebSite's home WebPage.
    nodes.push({
      '@type': 'WebPage',
      '@id': `${SITE_URL}/#webpage`,
      url: `${SITE_URL}/`,
      name: meta?.title ?? SITE_NAME,
      description: meta?.description ?? SITE_DESCRIPTION,
      isPartOf: { '@id': WEBSITE_ID },
      about: ABOUT_THING,
      inLanguage: 'en',
    })
    return nodes
  }

  if (!meta) return nodes // unknown route: global nodes only

  const url = `${SITE_URL}${route}`
  nodes.push(articleNode(meta, url, pageTypeFor(meta)))
  nodes.push(breadcrumbNode(meta, url))
  return nodes
}

/* ------------------------- Complementary SEO tags -------------------------- */

function alternateLinks(route: string): ReactElement[] {
  const locale = localeOf(route)
  if (!locale || !route.startsWith(`/${locale}/`)) return []
  const rest = route.slice(`/${locale}`.length)

  const links: ReactElement[] = []
  let any = false
  for (const other of LOCALES) {
    if (other === locale) continue
    const alt = `/${other}${rest}`
    if (index.has(alt)) {
      any = true
      links.push(
        createElement('link', {
          key: `alt-${other}`,
          rel: 'alternate',
          hrefLang: LANG_TAG[other],
          href: `${SITE_URL}${alt}`,
        }),
      )
    }
  }
  if (any)
    links.push(
      createElement('link', {
        key: `alt-self`,
        rel: 'alternate',
        hrefLang: LANG_TAG[locale],
        href: `${SITE_URL}${route}`,
      }),
    )
  return links
}

/* --------------------------------- head() --------------------------------- */

export function head({ path }: { path: string }): ReactElement {
  const route = path.length > 1 ? path.replace(/\/+$/, '') : path
  const url = route === '/' ? `${SITE_URL}/` : `${SITE_URL}${route}`

  const graph = { '@context': 'https://schema.org', '@graph': graphFor(route) }

  return createElement(
    Fragment,
    null,
    createElement('link', { key: 'canonical', rel: 'canonical', href: url }),
    createElement('meta', { key: 'og-url', property: 'og:url', content: url }),
    createElement('meta', {
      key: 'og-image',
      property: 'og:image',
      content: DEFAULT_OG_IMAGE,
    }),
    createElement('meta', {
      key: 'tw-image',
      name: 'twitter:image',
      content: DEFAULT_OG_IMAGE,
    }),
    ...alternateLinks(route),
    createElement('script', {
      key: 'ld-json',
      type: 'application/ld+json',
      dangerouslySetInnerHTML: { __html: JSON.stringify(graph) },
    }),
  )
}
