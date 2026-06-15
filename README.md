# Stable Docs

The source for [docs.stable.xyz](https://docs.stable.xyz) — Stable's stablecoin
payments, liquidity, and infrastructure documentation. Built with
[Vocs](https://vocs.dev) and deployed to Cloudflare (see `wrangler.jsonc`).

## Architectural Design Records (ADRs)

> **If you are an agent or contributor working in this repo, read this first.**

Significant technical decisions are documented as ADRs in [`ADRs/`](./ADRs).
Each record captures the **context**, **decision**, and **consequences** of a
choice so the rationale survives beyond the conversation that produced it.

- **Before changing architecture, search `ADRs/` for an existing decision.** Do
  not silently revisit a settled decision — extend or supersede it with a new ADR.
- **After making a significant decision, write an ADR.** Naming convention:
  `DR###_DESCRIPTIVE_NAME.md` (zero-padded, incrementing — e.g.
  `DR009_Search_Provider.md`).
- See [`ADRs/README.md`](./ADRs/README.md) for the full convention and the index
  of current records.

## Development

Requires Node `>=22` (see `.nvmrc`).

```bash
npm install
npm run docs:dev      # local dev server
npm run docs:build    # static build (outputs to docs/dist)
npm run docs:preview  # preview the production build
```

## Structure

| Path | Purpose |
| --- | --- |
| `docs/pages/` | Content pages (`en`, `cn`, `ko` locales; `en` uses a Diátaxis structure) |
| `docs/sidebar.json` | Navigation, generated from the Mintlify `docs.json` by `migrate.py` |
| `docs/lib/structured-data.ts` | Per-page JSON-LD / SEO `<head>` injection (see [DR009](./ADRs/DR009_SEO_Structured_Data.md)) |
| `docs/components/`, `docs/layout.tsx`, `docs/styles.css` | Theme and layout |
| `vocs.config.ts` | Site config, theme, nav, socials |
| `ADRs/` | Architectural Design Records |

## SEO / structured data

The JSON-LD strategy, its rationale, and the verification/testing steps are documented
in [DR009](./ADRs/DR009_SEO_Structured_Data.md). Implementation lives in
`docs/lib/structured-data.ts`, wired into `vocs.config.ts` via the `head` option.
