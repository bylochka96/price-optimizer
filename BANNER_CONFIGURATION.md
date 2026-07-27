# Remote Banner Configuration

The extension loads its campaign from:

https://bylochka96.github.io/price-optimizer/banners.json

The packaged `banners.json` is used automatically if the remote file is unavailable or invalid.

## Update the campaign

1. Edit `docs/banners.json` on the `main` branch.
2. Increase `version` whenever the campaign changes. This invalidates an existing two-hour local dismissal.
3. Change `id` when the change represents a new advertiser or campaign.
4. Commit the file. GitHub Pages will publish the new JSON automatically.

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
- Keep `title`, `body`, and `ctaLabel` within the validation limits documented in `popup.js`.
