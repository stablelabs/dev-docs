import { defineConfig } from 'vocs'
import sidebar from './docs/sidebar.json'
import { head } from './docs/lib/structured-data'

export default defineConfig({
  title: 'Stable',
  description:
    'Explore Stable docs to integrate stablecoin payments, liquidity, and infrastructure securely into your platform.',
  iconUrl: '/favicon.png',
  logoUrl: { light: '/logo/logo.png', dark: '/logo/logo-dark.png' },

  // Per-page structured data (JSON-LD) + complementary SEO tags (canonical,
  // og:url, og:image, hreflang), injected into <head> at static-build time.
  // The schema strategy and page-type mapping live in docs/lib/structured-data.ts.
  head,

  // Stable design language, mirrored from the Mintlify site (dev-docs/style.css,
  // docs.json). The dark column reproduces the live identity (bg #001E1E, text
  // #E8FBF7, accent #B4FF82); the light column is a legible derived companion.
  // colorScheme is left unset so both schemes stay available for the nav toggle
  // (docs/layout.tsx) — which means every color and the accent are {light, dark}.
  theme: {
    accentColor: { light: '#1F7A3D', dark: '#B4FF82' },
    variables: {
      // Sharp corners everywhere — the dev-docs signature. Zero every step.
      borderRadius: {
        '0': '0px',
        '2': '0px',
        '3': '0px',
        '4': '0px',
        '6': '0px',
        '8': '0px',
      },
      color: {
        background: { light: '#F6FBF9', dark: '#001E1E' },
        background2: { light: '#FFFFFF', dark: '#042625' },
        background3: { light: '#EEF4F1', dark: '#0A2E2C' },
        background4: { light: '#E7EFEB', dark: '#0F3331' },
        background5: { light: '#E0EAE5', dark: '#143836' },
        backgroundDark: { light: '#EEF4F1', dark: '#001616' },
        text: { light: '#04201D', dark: '#E8FBF7' },
        text2: { light: '#1C3A36', dark: 'rgba(232,251,247,0.82)' },
        text3: { light: '#3A5450', dark: 'rgba(232,251,247,0.64)' },
        text4: { light: '#5C7F7A', dark: 'rgba(232,251,247,0.46)' },
        heading: { light: '#04201D', dark: '#E8FBF7' },
        border: { light: 'rgba(4,32,29,0.12)', dark: 'rgba(232,251,247,0.10)' },
        border2: { light: 'rgba(4,32,29,0.18)', dark: 'rgba(232,251,247,0.16)' },
        link: { light: '#1F7A3D', dark: 'rgba(232,251,247,0.68)' },
        linkHover: { light: '#1F7A3D', dark: '#B4FF82' },
        hr: { light: 'rgba(4,32,29,0.12)', dark: 'rgba(232,251,247,0.12)' },
        codeInlineBackground: {
          light: 'rgba(4,32,29,0.06)',
          dark: 'rgba(232,251,247,0.08)',
        },
        codeBlockBackground: { light: '#EEF4F1', dark: '#001616' },
        tableHeaderBackground: { light: '#EEF4F1', dark: '#04201D' },
      },
    },
  },

  // Sidebar is generated from the Mintlify docs.json by migrate.py.
  sidebar,

  topNav: [
    {
      text: 'Language',
      items: [
        { text: 'English', link: '/en/explanation/learn-overview' },
        { text: '中文', link: '/cn' },
        { text: '한국어', link: '/ko' },
      ],
    },
  ],

  socials: [
    { icon: 'x', link: 'https://x.com/stable' },
    { icon: 'discord', link: 'https://discord.gg/stablexyz' },
  ],

  // PostHog parity with the Mintlify integration can be wired in a Root
  // layout component if desired; see MIGRATION.md.
})
