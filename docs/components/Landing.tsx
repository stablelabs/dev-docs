import './Landing.css'

/* Single-fold landing for Stable — no scroll.
   Use-case-led: cards describe what you do on Stable (send payments, settle
   cross-border, make agentic payments), not who you are.
   Styling uses only Vocs theme variables.
   (The theme switcher lives in the top nav — see docs/layout.tsx.) */

/* Opens Vocs' global search dialog by replaying its own `/` shortcut, so the
   hero search and the nav search share one index + UI. */
function openSearch() {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true }))
}

type Path = {
  title: string
  pain: string
  href: string
  pilot?: boolean
  icon: React.ReactNode
}

const I = {
  // simple inline icons (nav affordances, not body content)
  card: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
  ),
  globe: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z"/></svg>
  ),
  agent: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="7" width="16" height="13" rx="2"/><path d="M12 7V3"/><circle cx="12" cy="3" r="1"/><line x1="9" y1="12" x2="9" y2="15"/><line x1="15" y1="12" x2="15" y2="15"/></svg>
  ),
}

// Outcome-led use cases — what you do on Stable.
const paths: Path[] = [
  {
    title: 'Send payments',
    pain: 'Move USDT0 natively — P2P transfers, recurring subscriptions, invoice settlement, and pay-per-call APIs. Instant and sub-cent.',
    href: '/en/explanation/payments-overview',
    icon: I.card,
  },
  {
    title: 'Settle cross-border',
    pain: 'Reach an off-ramp network across Africa and the Middle East. Pay out into named accounts without building bank relationships from scratch.',
    href: '/en/reference/ramps',
    icon: I.globe,
  },
  {
    title: 'Make agentic payments',
    pain: 'Let autonomous agents pay per request through MCP servers and packaged skills wired into AI editors.',
    href: '/en/explanation/agent-settlement',
    pilot: true,
    icon: I.agent,
  },
]

// Qualitative facts already asserted across the docs — no invented numbers.
const facts = ['Sub-second finality', 'Sub-cent fees', 'USDT-native gas', 'EVM-equivalent']

const Arrow = () => <span className="sl-arrow" aria-hidden="true">→</span>

export function Landing() {
  return (
    <div className="sl">
      {/* ----- FOLD (single screen, no scroll) ----- */}
      <section className="sl-fold">
        <header className="sl-hero">
          <img
            src="/images/stable-wordmark-dark.svg"
            alt="Stable"
            className="sl-logo sl-logo--light"
          />
          <img
            src="/images/stable-wordmark-light.svg"
            alt="Stable"
            className="sl-logo sl-logo--dark"
          />
          {/* <span className="sl-kicker">
            <span className="sl-kicker__dot" aria-hidden="true" />
            Settlement layer for stablecoins
          </span> */}
          <h1 className="sl-h1">
            Settle stablecoin payments in seconds, at{' '}
            <span className="sl-h1__accent">sub-cent cost.</span>
          </h1>
          <p className="sl-sub">
            A payments Layer 1 where USDT0 is the native gas token — instant
            settlement, fully EVM-compatible, no separate gas asset to manage.
          </p>

          <div className="sl-actions">
            <button
              type="button"
              className="sl-search"
              onClick={openSearch}
              aria-label="Search the docs"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <span className="sl-search__label">Search the docs</span>
              <kbd className="sl-search__kbd">/</kbd>
            </button>
            <a className="sl-cta" href="/en/explanation/learn-overview">
              Read the docs <Arrow />
            </a>
          </div>
        </header>

        <nav className="sl-paths" aria-label="Pick the outcome you need">
          {paths.map((p) => (
            <a className="sl-card" href={p.href} key={p.title}>
              <span className="sl-card__icon">{p.icon}</span>
              <span className="sl-card__head">
                <span className="sl-card__title">{p.title}</span>
                {p.pilot ? <span className="sl-chip">Pilot</span> : null}
              </span>
              <span className="sl-card__pain">{p.pain}</span>
              <span className="sl-card__link">
                Learn more <Arrow />
              </span>
            </a>
          ))}
        </nav>

        <div className="sl-trust">
          <ul className="sl-trust__facts">
            {facts.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <div className="sl-trust__links">
            <a href="/en/reference/connect">Connect to the network</a>
            <a href="/en/reference/mainnet-information">Network status</a>
            <a href="/en/reference/developer-assistance">Get support</a>
          </div>
        </div>
      </section>
    </div>
  )
}
