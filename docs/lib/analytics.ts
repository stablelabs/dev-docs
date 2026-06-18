/**
 * PostHog analytics for the Stable docs.
 *
 * Carried over from the previous Mintlify site (dev-docs/docs.json → `posthog.
 * apiKey`). Keeping the same project key + ingestion host means historical data
 * stays continuous across the migration to Vocs.
 *
 * Injection mechanism: Vocs' documented `head` config option (see
 * node_modules/vocs/_lib/config.d.ts — "Additional tags to include in the
 * <head> tag of the page HTML"). `vocs.config.ts` composes this `analyticsHead()`
 * with the SEO `head()` from structured-data.ts into a single Fragment. We emit
 * the standard PostHog browser snippet so analytics loads async and independently
 * of the app bundle — it keeps reporting even if the React bundle fails to
 * hydrate, which is what the Mintlify integration did implicitly.
 *
 * The key below is a public, write-only project (`phc_…`) key — safe to ship to
 * the browser. The host is PostHog's US ingestion endpoint.
 */

import { createElement, type ReactElement } from 'react'

const POSTHOG_KEY = 'phc_w5S82EA6htCdGahiKPNEskpaEr9PofM5YDKsw8JtfhUi'
const POSTHOG_HOST = 'https://us.i.posthog.com'

/**
 * Standard PostHog snippet (verbatim from PostHog's install docs) plus an
 * `init` call. Config notes:
 *  - `capture_pageview: 'history_change'` — Vocs is a client-side-routed SPA, so
 *    the default "initial load only" behaviour would miss every in-app
 *    navigation. This fires `$pageview` on pushState/popstate instead.
 *  - `person_profiles: 'identified_only'` — docs traffic is anonymous; avoid
 *    creating a person profile for every visitor.
 */
const SNIPPET = `!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug getPageViewId captureTraceFeedback captureTraceMetric".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
posthog.init('${POSTHOG_KEY}',{api_host:'${POSTHOG_HOST}',person_profiles:'identified_only',capture_pageview:'history_change'});`

/** The PostHog `<script>` tag, for composition into Vocs' `head` config. */
export function analyticsHead(): ReactElement {
  return createElement('script', {
    key: 'posthog',
    dangerouslySetInnerHTML: { __html: SNIPPET },
  })
}
