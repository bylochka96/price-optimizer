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
          settings: { enabled: true, targetCurrency: "EUR", uiLanguage: "en" },
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
      activeBannerCampaign = {
        sponsor: "Sponsored",
        sponsor_TR: "Sponsorlu",
        title: "Your ad could be here",
        title_TR: "Reklamınız burada olabilir",
        body: "Place a short description of the advertiser's offer here.",
        body_TR: "Reklamverenin teklifine ait kısa açıklamayı buraya ekleyin.",
        ctaLabel: "Learn more",
        ctaLabel_TR: "Daha fazla bilgi",
        url: "https://example.com/en",
        url_TR: "https://example.com/tr",
        backgroundImage: "",
        backgroundPosition: "center",
        backgroundOverlay: 0.66,
        buttonColor: "#7C3AED"
      };
      renderBanner(activeBannerCampaign);
    });
    await page.locator('[data-language="tr"]').click();
    await page.waitForTimeout(50);

    const layout = await page.evaluate(() => ({
      height: document.documentElement.scrollHeight,
      footerBottom: document.querySelector("footer").getBoundingClientRect().bottom,
      bannerBorderTop: getComputedStyle(document.querySelector("#adBanner")).borderTopWidth,
      buttonColor: getComputedStyle(document.querySelector("#adCta")).backgroundColor,
      backgroundImage: document.querySelector("#adBanner").style.getPropertyValue("--ad-background-image"),
      language: document.documentElement.lang,
      trPressed: document.querySelector('[data-language="tr"]').getAttribute("aria-pressed"),
      convertLabel: document.querySelector('label[for="enabled"]').textContent,
      bannerTitle: document.querySelector("#adTitle").textContent,
      bannerCta: document.querySelector("#adCta").textContent,
      bannerUrl: document.querySelector("#adCta").href,
      fallbackTitle: campaignValue({ title: "English fallback" }, "title")
    }));
    if (layout.height > 600 || layout.footerBottom > 600) {
      throw new Error(`Popup is clipped: ${JSON.stringify(layout)}`);
    }
    if (layout.bannerBorderTop !== "1px") throw new Error(`Unexpected banner border: ${layout.bannerBorderTop}`);
    if (layout.buttonColor !== "rgb(124, 58, 237)") throw new Error(`Unexpected CTA color: ${layout.buttonColor}`);
    if (layout.backgroundImage !== "none") throw new Error(`Unexpected banner background: ${layout.backgroundImage}`);
    if (layout.language !== "tr" || layout.trPressed !== "true") throw new Error("Turkish language switch was not applied");
    if (layout.convertLabel !== "Fiyatları dönüştür") throw new Error(`Unexpected Turkish label: ${layout.convertLabel}`);
    if (layout.bannerTitle !== "Reklamınız burada olabilir") throw new Error(`Unexpected Turkish banner title: ${layout.bannerTitle}`);
    if (layout.fallbackTitle !== "English fallback") throw new Error("Missing _TR field did not fall back to English");
    if (layout.bannerCta !== "Daha fazla bilgi" || !layout.bannerUrl.endsWith("/tr")) {
      throw new Error(`Unexpected Turkish CTA: ${layout.bannerCta} ${layout.bannerUrl}`);
    }
    await page.screenshot({ path: path.join(__dirname, "..", "assets", "popup-preview.png") });
    console.log(`Popup layout test passed (${layout.height}px)`);
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
