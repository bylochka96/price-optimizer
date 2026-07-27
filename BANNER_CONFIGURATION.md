# Remote Banner Configuration

The extension loads its campaign from:

https://bylochka96.github.io/price-optimizer/banners.json

The packaged `banners.json` is used automatically if the remote file is unavailable or invalid.

## Update the campaign

1. Edit `docs/banners.json` on the `main` branch.
2. Keep `version` unchanged for ordinary text, color, image, and URL updates.
3. Increase `version` only when the updated campaign must be shown again to users who dismissed the current campaign during the last two hours.
4. Change `id` when the change represents a new advertiser or campaign.
5. Commit the file. GitHub Pages will publish the new JSON automatically.

## English and Turkish campaign copy

English fields are the default. Add a matching field with the uppercase `_TR` suffix for Turkish:

```json
{
  "sponsor": "Sponsored",
  "sponsor_TR": "Sponsorlu",
  "title": "Your ad could be here",
  "title_TR": "Reklamınız burada olabilir",
  "body": "Place a short description here.",
  "body_TR": "Kısa açıklamayı buraya ekleyin.",
  "ctaLabel": "Learn more",
  "ctaLabel_TR": "Daha fazla bilgi",
  "url": "https://example.com/en",
  "url_TR": "https://example.com/tr"
}
```

When the popup language is Turkish, the extension uses the `_TR` value. If an optional `_TR` field is absent, the corresponding English value is used. Campaign identity, enablement, and appearance fields remain shared unless an `_TR` override is explicitly supplied.

## Background images

For a remote image, upload it under `docs/`, then use its Pages URL:

```json
"backgroundImage": "https://bylochka96.github.io/price-optimizer/banner.jpg"
```

Use HTTPS, keep the image lightweight, and ensure that you have the right to display it. `backgroundOverlay` accepts a number from `0` to `1`; higher values make text easier to read. `buttonColor` accepts a six-digit HEX color.

## Safety rules

- Do not put HTML, JavaScript, or tracking identifiers into text fields.
- Use only an HTTPS destination URL.
- Do not include the current page, product, price, or a user identifier in UTM parameters.
- Keep `title`, `body`, `ctaLabel`, and their `_TR` counterparts within the validation limits documented in `popup.js`.
