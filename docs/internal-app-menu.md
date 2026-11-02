# Shared employee application menu

The canonical public directory is `public/internal-apps.json` in this repository, served at `https://santhai-feedback.vercel.app/internal-apps.json`. Each internal website loads it when opening the application menu, and refreshes every 30 seconds while open. Change the directory and deploy this repository to update menu items across all integrated websites.

## Integrated destinations

| Key | Destination |
| --- | --- |
| internal | CTKM E-F |
| feedback | Feedback customer module, `/#feedback` |
| audit | Audit internal module, `/#audit` |
| website | Website store management, `/#website` |
| calendar | Brand Calendar, SanThai and Gia Hỷ |

The CEO dashboard is deliberately absent from the employee directory. The client also rejects any item with the CEO identifier or any CEO-domain URL except the exact E-F route. The CEO page itself may identify its current location, but employee pages do not show a link to it. No unverified roster, Spin, public customer app, or future-brand URL is inferred.

## Authentication boundary

All links are visible to signed-in users of each integrated app. Every destination retains its existing login, allowlists, module rights, brand scopes, API authorization and RLS. Seeing a link grants no access. A second sign-in may be required when moving between the two existing Supabase Auth projects. No single-sign-on or permission synchronization is introduced.

The directory contains only application names, groups and public URLs. Requests omit credentials and carry no session token, email or authorization header. Cross-origin reads are enabled for this JSON asset only. The menu cannot write business records, roles, schema, report data or backups. No new serverless function is added.

## Failure isolation

Loading the main application never waits for the menu. Every opening clears old links before fetching the latest directory. Closing, switching modules or disposing the component cancels pending requests; sequence guards stop outdated responses. A failed directory request shows the current screen's non-clickable location indicator and a retry-on-reopen message. Each website and its existing controls remain available independently.

Labels are rendered as text; links must use HTTPS, approved internal origins, no embedded credentials, and no CEO destination. External apps open in a separate tab without opener/referrer access. Feedback/Audit/Website links within the same app reuse its existing module switcher for ordinary clicks.

## Risk and rollback

Business-data risk is low: this is static navigation only and existing authentication/data paths are unchanged. Remaining risks are missing/wrong links, a temporarily unavailable directory, or menu layout issues. A wrong visible link still cannot override a destination's own access guard. Tests check the directory, URL rejection, CEO exclusion, existing modules, Calendar permissions, E-F API projection/export, and generated CEO script syntax. Live browser checks must distinguish technical validation from visual acceptance and account coverage.

Rollback is limited to the menu-specific commits and redeployment; no database restoration or role repair is required. The abandoned read-only menu Edge Function was retired before integration, returns HTTP 410, and performs no permission or data reads.
