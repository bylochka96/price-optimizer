const { chromium } = require("playwright");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

(async () => {
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--no-first-run", "--allow-file-access-from-files"]
  });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 600 } });
    await page.addInitScript(() => {
      window.chrome.runtime = {
        getURL: (value) => value,
        sendMessage: async () => ({
          ok: true,
          settings: { enabled: true, targetCurrency: "EUR" },
          rates: { EUR: 0.02 },
          updatedAt: Date.now(),
          sources: ["Central Bank of the Republic of Türkiye", "Narodowy Bank Polski"],
          stale: false
        })
      };
      window.chrome.tabs = { query: async () => [{ url: "https://www.mediamarkt.com.tr/tr/category/telefon" }] };
      window.chrome.storage = { local: { get: async () => ({}), set: async () => {} } };
    });

    const popupUrl = pathToFileURL(path.join(__dirname, "..", "popup.html")).href;
    await page.goto(popupUrl);
    await page.waitForTimeout(100);
    await page.evaluate(() => {
      renderBanner({
        sponsor: "Sponsored",
        title: "Your ad could be here",
        body: "Place a short description of the advertiser's offer here.",
        ctaLabel: "Learn more",
        url: "https://example.com/",
        backgroundImage: "images/neutral-banner-background.png",
        backgroundPosition: "center",
        backgroundOverlay: 0.66,
        buttonColor: "#18864B"
      });
    });

    const layout = await page.evaluate(() => ({
      height: document.documentElement.scrollHeight,
      footerBottom: document.querySelector("footer").getBoundingClientRect().bottom,
      bannerBorderTop: getComputedStyle(document.querySelector("#adBanner")).borderTopWidth,
      buttonColor: getComputedStyle(document.querySelector("#adCta")).backgroundColor,
      backgroundImage: getComputedStyle(document.querySelector("#adBanner")).backgroundImage
    }));
    if (layout.height > 600 || layout.footerBottom > 600) {
      throw new Error(`Popup is clipped: ${JSON.stringify(layout)}`);
    }
    if (layout.bannerBorderTop !== "1px") throw new Error(`Unexpected banner border: ${layout.bannerBorderTop}`);
    if (layout.buttonColor !== "rgb(24, 134, 75)") throw new Error(`Unexpected CTA color: ${layout.buttonColor}`);
    if (!layout.backgroundImage.includes("neutral-banner-background.png")) throw new Error("Banner background image was not applied");
    await page.screenshot({ path: path.join(__dirname, "..", "assets", "popup-preview.png") });
    console.log(`Popup layout test passed (${layout.height}px)`);
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
