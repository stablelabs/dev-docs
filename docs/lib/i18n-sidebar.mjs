/**
 * i18n sidebar generator.
 *
 * `en` is the source of truth for sidebar *structure* too. This regenerates the
 * `/cn` and `/ko` sections of `docs/sidebar.json` from the `/en` section:
 *
 *   - every `link` has its `/en/...` prefix rewritten to `/<locale>/...`
 *   - every `text` label is translated into the target locale
 *
 * The `/en` section is hand-maintained; the localized sections are generated —
 * do not hand-edit them. Re-run after editing the `/en` sidebar.
 *
 *   ANTHROPIC_API_KEY=... node docs/lib/i18n-sidebar.mjs <locale>
 *
 *   <locale>   cn | ko (required)
 *
 * Labels are translated in a single batched request (deduped). Model: opus.
 */

import Anthropic from '@anthropic-ai/sdk'
import { readFileSync, writeFileSync } from 'node:fs'

const SIDEBAR = 'docs/sidebar.json'
const LANGUAGE = { cn: 'Simplified Chinese (zh-CN)', ko: 'Korean (ko-KR)' }

const [locale] = process.argv.slice(2)
if (!LANGUAGE[locale]) {
  console.error('Usage: node docs/lib/i18n-sidebar.mjs <cn|ko>')
  process.exit(2)
}

const sidebar = JSON.parse(readFileSync(SIDEBAR, 'utf8'))
const source = sidebar['/en']
if (!source) {
  console.error('No "/en" section in docs/sidebar.json')
  process.exit(1)
}

// Collect every unique label in the en sidebar tree.
function collectLabels(items, set = new Set()) {
  for (const item of items) {
    if (typeof item.text === 'string') set.add(item.text)
    if (Array.isArray(item.items)) collectLabels(item.items, set)
  }
  return set
}
const labels = [...collectLabels(source)]

const SYSTEM = `You are a professional technical translator for the Stable blockchain developer documentation. Translate the given English navigation-sidebar labels into ${LANGUAGE[locale]}.

Rules:
- Keep labels short — these are sidebar entries, not sentences.
- DO NOT translate product/protocol identifiers and acronyms: Stable, SDK, USDT0, EVM, RPC, JSON-RPC, API, x402, MPP, EIP-7702, ERC-3009, P2P, MCP, viem, wagmi.
- Preserve any surrounding punctuation/brackets exactly (e.g. "[Agents]" keeps its square brackets).
- Return ONLY a JSON array of the translated strings, in the same order and with the same length as the input. No commentary, no code fence.`

const client = new Anthropic()

// Rewrite an en link prefix to the target locale (same token as i18n-translate).
const localizeLink = (link) =>
  typeof link === 'string' && link.startsWith('/en/')
    ? `/${locale}/${link.slice('/en/'.length)}`
    : link

// Deep-clone the en tree, translating text and localizing links.
function localizeTree(items, dict) {
  return items.map((item) => {
    const out = { ...item }
    if (typeof out.text === 'string') out.text = dict[out.text] ?? out.text
    if (typeof out.link === 'string') out.link = localizeLink(out.link)
    if (Array.isArray(out.items)) out.items = localizeTree(out.items, dict)
    return out
  })
}

const stream = client.messages.stream({
  model: 'claude-opus-4-8',
  max_tokens: 8000,
  thinking: { type: 'adaptive' },
  system: SYSTEM,
  messages: [{ role: 'user', content: JSON.stringify(labels, null, 2) }],
})
const final = await stream.finalMessage()
const raw = final.content
  .filter((b) => b.type === 'text')
  .map((b) => b.text)
  .join('')
  .trim()
  .replace(/^```(?:json)?\n?|\n?```$/g, '')

const translated = JSON.parse(raw)
if (!Array.isArray(translated) || translated.length !== labels.length) {
  console.error(
    `Translation count mismatch: expected ${labels.length}, got ${Array.isArray(translated) ? translated.length : 'non-array'}`,
  )
  process.exit(1)
}
const dict = Object.fromEntries(labels.map((l, i) => [l, translated[i]]))

sidebar[`/${locale}`] = localizeTree(source, dict)

// Match the existing file format: JSON.stringify with 2-space indent, no trailing newline.
writeFileSync(SIDEBAR, JSON.stringify(sidebar, null, 2))
console.log(`${locale}: regenerated sidebar (${labels.length} labels)`)
