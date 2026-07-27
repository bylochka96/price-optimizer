# Permission Justifications

## `storage`

Stores the user's conversion toggle and selected currency, caches exchange rates, and remembers a locally dismissed sponsored banner. No page content is stored.

## `activeTab`

Allows the popup, after a user click, to determine whether the current tab is MediaMarkt and show the relevant contextual banner. The active tab's URL is not transmitted or retained.

## `scripting`

Provides a guarded recovery injection on MediaMarkt when Chrome does not attach the declarative content script after a cross-domain navigation or page restoration. Injection is restricted by the MediaMarkt host permission.

## MediaMarkt host permission

`https://*.mediamarkt.com.tr/*` is required to read and replace visible TRY price text on the only supported retailer.

## Exchange-rate host permissions

The TCMB, NBP, ECB, and ExchangeRate-API origins are required only to retrieve exchange-rate data over HTTPS.

## GitHub Pages host permission

`https://bylochka96.github.io/*` retrieves the non-executable sponsored-banner JSON and optional image. It does not receive the current MediaMarkt URL, product, or price.
