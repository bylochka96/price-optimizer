# Price Optimizer Privacy Policy

**Effective date:** July 27, 2026

Price Optimizer converts Turkish lira prices displayed on MediaMarkt Türkiye into a currency selected by the user. This policy explains the limited data processing required to provide that feature.

## Data processed locally

Price Optimizer reads visible price text on `mediamarkt.com.tr` in the browser and replaces matching TRY values locally. Product names, prices, page contents, URLs, and browsing history are not sent to the developer or to advertisers.

The extension stores the following information using Chrome extension storage:

- whether price conversion is enabled;
- the selected display currency;
- cached exchange rates and their update time;
- the expiration time of a locally dismissed sponsored banner.

These settings remain in the user's browser or Chrome Sync account until the user changes them, clears extension data, or removes the extension.

## Network requests

The extension makes HTTPS requests to:

- the Central Bank of the Republic of Türkiye, Narodowy Bank Polski, the European Central Bank, and ExchangeRate-API to retrieve currency exchange rates;
- this project's GitHub Pages site to retrieve the current sponsored-banner configuration and optional banner image.

These services may receive standard network metadata such as the user's IP address, user agent, request time, and requested resource as part of normal HTTP delivery. Price Optimizer does not add a persistent user identifier, cookie, product information, page URL, or browsing history to these requests.

## Sponsored banner

The popup may display a clearly labeled sponsored banner. The banner is the same contextual campaign for MediaMarkt users and is not selected using browsing history, product data, personal information, behavioral profiling, or interest-based advertising.

An advertiser's website is opened only after the user clicks the banner button. The destination URL may contain campaign-level UTM parameters. These parameters identify the extension and campaign but do not contain a user identifier or the MediaMarkt page being viewed. After leaving the extension, the destination website's own privacy policy applies.

## Data collection, sharing, and sale

Price Optimizer does not collect analytics, create user profiles, sell personal information, or share page content or browsing activity with the developer or advertisers. No human reviews users' browsing data because that data is not transmitted to the developer.

## Security

All extension network requests use HTTPS. Remote banner configuration is treated only as validated data and is never executed as JavaScript or HTML.

## Children's privacy

Price Optimizer is not directed to children and does not knowingly collect personal information from children.

## Changes

Material changes to this policy will be published on this page and reflected by a revised effective date. Any change that introduces new data handling will also be disclosed in the extension and Chrome Web Store listing when required.

## Contact

Questions or deletion requests can be submitted through the project's [GitHub issue tracker](https://github.com/bylochka96/price-optimizer/issues).

## Chrome Web Store Limited Use

Price Optimizer's use of information obtained through Chrome APIs complies with the Chrome Web Store User Data Policy, including the Limited Use requirements. Information is used only to provide or improve the extension's single user-facing purpose and is not used for personalized advertising.
