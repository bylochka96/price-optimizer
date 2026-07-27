const { chromium } = require("playwright");
const path = require("node:path");

(async () => {
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--no-first-run"]
  });
  try {
    const page = await browser.newPage();
    page.on("console", (message) => console.log("PAGE:", message.text()));
    page.on("pageerror", (error) => console.error("PAGE ERROR:", error.message));

    await page.addInitScript(() => {
      window.chrome.runtime = {
        sendMessage: async () => ({
          ok: true,
          settings: { enabled: true, targetCurrency: "EUR" },
          rates: { EUR: 0.02 }
        }),
        onMessage: { addListener() {} }
      };
      window.chrome.storage = { onChanged: { addListener() {} } };
    });

    await page.route("https://www.mediamarkt.com.tr/test", (route) => route.fulfill({
    contentType: "text/html; charset=utf-8",
    body: `<!doctype html><body>
      <div data-testid="price" id="dash">₺43.259,–</div>
      <div data-testid="price" id="decimal">₺43259,00</div>
      <div data-testid="price" id="suffix">43.259,00 TL</div>
      <div data-testid="price" id="split"><span>₺</span><span>17.999</span><sup>,–</sup></div>
      <div data-testid="price" id="fraction"><span>1.399,</span><span>99 TL</span></div>
      <div id="detached"><span>₺</span><span class="product-price">1.999,–</span></div>
      <style>#pseudo::before { content: "₺ "; }</style>
      <div data-testid="price" id="pseudo">₺1.000,00</div>
      <div id="dynamic"></div>
    </body>`
    }));

    await page.goto("https://www.mediamarkt.com.tr/test");
    await page.addStyleTag({ path: path.join(__dirname, "..", "content.css") });
    await page.addScriptTag({ path: path.join(__dirname, "..", "content.js") });
    await page.waitForTimeout(100);

    const expected = {
    dash: "€865.18",
    decimal: "€865.18",
    suffix: "€865.18",
    split: "€359.98",
    fraction: "€28.00",
    detached: "€39.98",
    pseudo: "€20.00"
    };

    for (const [id, value] of Object.entries(expected)) {
      const actual = (await page.locator(`#${id}`).innerText()).trim();
      if (actual !== value) throw new Error(`${id}: expected ${value}, received ${actual}`);
    }

    const pseudoContent = await page.locator("#pseudo").evaluate(
      (element) => getComputedStyle(element, "::before").content
    );
    if (pseudoContent !== "none") throw new Error(`pseudo marker was not hidden: ${pseudoContent}`);

    await page.locator("#dynamic").evaluate((element) => {
      element.innerHTML = '<span class="product-price">₺9.999,–</span>';
    });
    await page.waitForTimeout(100);
    const dynamic = (await page.locator("#dynamic").innerText()).trim();
    if (dynamic !== "€199.98") throw new Error(`dynamic: expected €199.98, received ${dynamic}`);

    console.log("MediaMarkt price conversion tests passed");
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
