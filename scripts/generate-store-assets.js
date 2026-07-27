const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "store", "assets");
fs.mkdirSync(output, { recursive: true });

function svg(width, height, content) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <style>
      .ui { font-family: Arial, Helvetica, sans-serif; }
      .title { font-size: 56px; font-weight: 800; }
      .subtitle { font-size: 27px; font-weight: 500; }
      .body { font-size: 23px; font-weight: 600; }
      .small { font-size: 18px; font-weight: 600; }
    </style>
    ${content}
  </svg>`);
}

async function buildScreenshot() {
  const base = svg(1280, 800, `
    <rect width="1280" height="800" fill="#f2f2f2"/>
    <rect width="760" height="800" fill="#df0000"/>
    <circle cx="114" cy="116" r="66" fill="#fff"/>
    <text class="ui title" x="74" y="250" fill="#fff">Price Optimizer</text>
    <text class="ui subtitle" x="74" y="294" fill="#fff">MediaMarkt TRY prices in your currency</text>
    <rect x="74" y="355" width="590" height="92" rx="16" fill="#fff"/>
    <text class="ui small" x="100" y="390" fill="#555">ORIGINAL PRICE</text>
    <text class="ui body" x="100" y="424" fill="#171717">₺43.259,–</text>
    <path d="M365 401h70" stroke="#df0000" stroke-width="6" stroke-linecap="round"/>
    <path d="m427 386 18 15-18 15" fill="none" stroke="#df0000" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    <text class="ui small" x="478" y="390" fill="#555">CONVERTED</text>
    <text class="ui body" x="478" y="424" fill="#171717">$2,118.30</text>
    <text class="ui body" x="84" y="525" fill="#fff">• 11 selected currencies</text>
    <text class="ui body" x="84" y="574" fill="#fff">• Dynamic MediaMarkt price support</text>
    <text class="ui body" x="84" y="623" fill="#fff">• English and Turkish popup</text>
    <text class="ui small" x="84" y="704" fill="#ffd9d9">Independent extension — not affiliated with MediaMarkt</text>
    <rect x="790" y="70" width="430" height="660" rx="28" fill="#fff" stroke="#ddd" stroke-width="2"/>
  `);
  const popup = await sharp(path.join(root, "assets", "popup-preview.png")).resize(390, 600).png().toBuffer();
  const icon = await sharp(path.join(root, "icons", "icon128.png")).resize(112, 112).png().toBuffer();
  await sharp(base).composite([
    { input: icon, left: 58, top: 60 },
    { input: popup, left: 810, top: 100 }
  ]).png().toFile(path.join(output, "screenshot-1280x800.png"));
}

async function buildSmallPromo() {
  const base = svg(440, 280, `
    <rect width="440" height="280" fill="#df0000"/>
    <circle cx="102" cy="140" r="72" fill="#fff"/>
    <text class="ui" x="198" y="125" fill="#fff" font-size="31" font-weight="800">Price</text>
    <text class="ui" x="198" y="164" fill="#fff" font-size="31" font-weight="800">Optimizer</text>
    <text class="ui" x="198" y="200" fill="#ffd8d8" font-size="19" font-weight="600">₺  →  $  €  £</text>
  `);
  const icon = await sharp(path.join(root, "icons", "icon128.png")).resize(126, 126).png().toBuffer();
  await sharp(base).composite([{ input: icon, left: 39, top: 77 }]).png().toFile(path.join(output, "small-promo-440x280.png"));
}

async function buildMarquee() {
  const base = svg(1400, 560, `
    <rect width="1400" height="560" fill="#df0000"/>
    <circle cx="250" cy="280" r="165" fill="#fff"/>
    <text class="ui" x="500" y="245" fill="#fff" font-size="82" font-weight="800">Price Optimizer</text>
    <text class="ui" x="505" y="315" fill="#ffd8d8" font-size="35" font-weight="600">MediaMarkt TRY prices in your currency</text>
    <text class="ui" x="505" y="388" fill="#fff" font-size="40" font-weight="700">₺  →  $  €  £  ₽  ₼  ₸  ₴</text>
  `);
  const icon = await sharp(path.join(root, "icons", "icon128.png")).resize(286, 286).png().toBuffer();
  await sharp(base).composite([{ input: icon, left: 107, top: 137 }]).png().toFile(path.join(output, "marquee-1400x560.png"));
}

Promise.all([buildScreenshot(), buildSmallPromo(), buildMarquee()])
  .then(() => console.log(`Store assets written to ${output}`))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
