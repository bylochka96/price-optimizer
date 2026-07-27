# Price Optimizer

Price Optimizer is a Manifest V3 browser extension focused exclusively on MediaMarkt Türkiye. It replaces visible Turkish-lira prices on `mediamarkt.com.tr` with the user's selected currency while preserving the site's existing typography and layout.

## Supported website

- `mediamarkt.com.tr`

No content script or page permission is granted for any other retail website.

## Currencies

- USD — US Dollar
- EUR — Euro
- GBP — British Pound
- RUB — Russian Ruble
- AZN — Azerbaijani Manat
- KZT — Kazakhstani Tenge
- AED — UAE Dirham
- SAR — Saudi Riyal
- CHF — Swiss Franc
- UAH — Ukrainian Hryvnia
- BYN — Belarusian Ruble

The extension tries the Central Bank of the Republic of Türkiye, Narodowy Bank Polski, and the European Central Bank before using ExchangeRate-API as a fallback. Rates are stored locally for six hours and can be refreshed from the popup.

## MediaMarkt price handling

The content script supports the formats currently used across MediaMarkt category, product, campaign, and dynamically loaded sections, including:

- `₺43.259,–`
- `₺43259,00`
- `43.259,00 TL`
- prices whose currency, integer, decimal, or dash suffix is split across adjacent HTML elements
- product-card currency markers rendered as a sibling element or a CSS pseudo-element
- old prices, discounted prices, instalment amounts, and prices inserted after scrolling or filtering

The original DOM text is retained in memory so disabling conversion or changing currency restores and recalculates prices without compounding previous conversions.
Currency values use the shortest symbol supplied by the browser (`$`, `€`, `£`, `₽`, and similar). The ISO code is shown only when the browser has no distinct narrow symbol for that currency.
After a cross-domain tab navigation, the service worker verifies that the MediaMarkt content script is present and performs one guarded recovery injection when Chrome did not attach it automatically.

## Popup and advertising

- Conversion is enabled by default and remains under the user's manual control.
- The popup can be switched between English and Turkish; the selected language is saved with the user's synchronized settings.
- The popup uses a compact red, black, and white MediaMarkt-inspired visual system.
- The current campaign is loaded from [GitHub Pages](https://bylochka96.github.io/price-optimizer/banners.json), with packaged `banners.json` as a validated fallback.
- Closing the campaign stores one local two-hour dismissal.
- The example advertiser link contains UTM parameters; replace the placeholder domain and campaign copy before publishing.
- `backgroundImage` accepts an HTTPS URL or a safe local path under `assets/` or `images/`.
- `backgroundPosition` controls image alignment and `backgroundOverlay` controls the white readability layer from `0` to `1`.
- `buttonColor` controls the CTA button independently from the banner border.
- Turkish campaign copy is read from optional `sponsor_TR`, `title_TR`, `body_TR`, `ctaLabel_TR`, and `url_TR` fields, with automatic fallback to English.

## Install locally

1. Open `chrome://extensions` or `edge://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select the `Price Optimizer` folder.
5. Reload an already open MediaMarkt tab after installing or updating the extension.

## Chrome Web Store publication

- Build the upload archive with `./scripts/build.ps1`.
- Store metadata and disclosure answers are under `store/`.
- The public [privacy policy](https://bylochka96.github.io/price-optimizer/privacy.html) is mirrored in `PRIVACY.md`.
- Follow `store/submission-checklist.md` in the Chrome Web Store Developer Dashboard.

## Remote advertising configuration

Edit `docs/banners.json` on the `main` branch to update the campaign without publishing a new extension package. See `BANNER_CONFIGURATION.md` for validation, versioning, image, color, and privacy rules.

## Branding note

The `PO` spiral is an original Price Optimizer asset designed to fit the requested retail color palette. MediaMarkt names and trademarks belong to their respective owners. Price Optimizer is not affiliated with or endorsed by MediaMarkt.
