const SETTINGS_KEY = "settings";
const RATES_KEY = "ratesCacheV2";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const SETTINGS_VERSION = 3;

const DEFAULT_SETTINGS = {
  settingsVersion: SETTINGS_VERSION,
  enabled: true,
  targetCurrency: "EUR",
  uiLanguage: "en"
};

const UI_LANGUAGES = ["en", "tr"];

const TARGET_CURRENCIES = [
  "USD", "EUR", "GBP", "RUB", "AZN", "KZT", "AED", "SAR", "CHF", "UAH", "BYN"
];

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !isMediaMarktUrl(tab?.url)) return;
  ensureMediaMarktContentScript(tabId).catch((error) => {
    console.warn("Price Optimizer: navigation recovery failed", error);
  });
});

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.sync.get(SETTINGS_KEY);
  const previous = stored[SETTINGS_KEY];
  const hasCurrentSettings = previous?.settingsVersion === SETTINGS_VERSION;
  const settings = {
    settingsVersion: SETTINGS_VERSION,
    enabled: hasCurrentSettings && typeof previous?.enabled === "boolean"
      ? previous.enabled
      : DEFAULT_SETTINGS.enabled,
    targetCurrency: TARGET_CURRENCIES.includes(previous?.targetCurrency)
      ? previous.targetCurrency
      : DEFAULT_SETTINGS.targetCurrency,
    uiLanguage: UI_LANGUAGES.includes(previous?.uiLanguage)
      ? previous.uiLanguage
      : DEFAULT_SETTINGS.uiLanguage
  };
  await chrome.storage.sync.set({ [SETTINGS_KEY]: settings });
  await chrome.alarms.clear("disable-conversion");
  chrome.alarms.create("refresh-rates", { periodInMinutes: 360 });
  try {
    await getRates(true);
  } catch (error) {
    console.warn("Price Optimizer: initial rate update failed", error);
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "refresh-rates") {
    getRates(true).catch((error) => console.warn("Rate refresh failed", error));
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "GET_STATE") {
    Promise.all([getSettings(), getRates(false)])
      .then(([settings, rates]) => sendResponse({ ok: true, settings, ...rates }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === "SET_SETTINGS") {
    saveSettings(message.settings)
      .then((settings) => sendResponse({ ok: true, settings }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === "REFRESH_RATES") {
    getRates(true)
      .then((rates) => sendResponse({ ok: true, ...rates }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
});

async function getSettings() {
  const stored = await chrome.storage.sync.get(SETTINGS_KEY);
  const raw = stored[SETTINGS_KEY];
  const hasCurrentSettings = raw?.settingsVersion === SETTINGS_VERSION;
  const settings = {
    settingsVersion: SETTINGS_VERSION,
    enabled: hasCurrentSettings && typeof raw?.enabled === "boolean"
      ? raw.enabled
      : DEFAULT_SETTINGS.enabled,
    targetCurrency: TARGET_CURRENCIES.includes(raw?.targetCurrency)
      ? raw.targetCurrency
      : DEFAULT_SETTINGS.targetCurrency,
    uiLanguage: UI_LANGUAGES.includes(raw?.uiLanguage)
      ? raw.uiLanguage
      : DEFAULT_SETTINGS.uiLanguage
  };
  if (!hasCurrentSettings || raw.enabled !== settings.enabled || raw.targetCurrency !== settings.targetCurrency || raw.uiLanguage !== settings.uiLanguage) {
    await chrome.storage.sync.set({ [SETTINGS_KEY]: settings });
  }
  return settings;
}

async function saveSettings(patch) {
  const current = await getSettings();
  const next = {
    settingsVersion: SETTINGS_VERSION,
    enabled: typeof patch?.enabled === "boolean" ? patch.enabled : current.enabled,
    targetCurrency: TARGET_CURRENCIES.includes(patch?.targetCurrency)
      ? patch.targetCurrency
      : current.targetCurrency,
    uiLanguage: UI_LANGUAGES.includes(patch?.uiLanguage)
      ? patch.uiLanguage
      : current.uiLanguage
  };
  await chrome.storage.sync.set({ [SETTINGS_KEY]: next });
  return next;
}

async function getRates(forceRefresh) {
  const stored = await chrome.storage.local.get(RATES_KEY);
  const cached = stored[RATES_KEY];
  const isFresh = cached && Date.now() - cached.updatedAt < CACHE_TTL_MS;

  if (!forceRefresh && isFresh) return cached;

  try {
    const fresh = await fetchRateBundle();
    await chrome.storage.local.set({ [RATES_KEY]: fresh });
    return fresh;
  } catch (error) {
    if (cached) return { ...cached, stale: true, warning: error.message };
    throw error;
  }
}

async function fetchRateBundle() {
  const rates = { TRY: 1 };
  const sources = [];
  const failures = [];

  for (const provider of [fetchTcmbRates, fetchNbpRates, fetchEcbRates, fetchOpenErRates]) {
    const missing = TARGET_CURRENCIES.filter((code) => !Number.isFinite(rates[code]));
    if (!missing.length) break;

    try {
      const result = await provider();
      for (const code of missing) {
        if (Number.isFinite(result.rates[code]) && result.rates[code] > 0) {
          rates[code] = result.rates[code];
        }
      }
      sources.push(result.source);
    } catch (error) {
      failures.push(error.message);
    }
  }

  const missing = TARGET_CURRENCIES.filter((code) => !Number.isFinite(rates[code]));
  if (missing.length === TARGET_CURRENCIES.length) {
    throw new Error(`Could not retrieve exchange rates. ${failures.join("; ")}`);
  }

  return {
    rates,
    updatedAt: Date.now(),
    sources,
    missing,
    stale: false
  };
}

async function fetchTcmbRates() {
  const response = await fetch("https://www.tcmb.gov.tr/kurlar/today.xml", {
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`TCMB HTTP ${response.status}`);
  const xml = await response.text();
  const rates = {};
  const blockPattern = /<Currency\b[^>]*(?:CurrencyCode|Kod)=["']([A-Z]{3})["'][^>]*>([\s\S]*?)<\/Currency>/g;

  for (const match of xml.matchAll(blockPattern)) {
    const code = match[1];
    if (!TARGET_CURRENCIES.includes(code)) continue;
    const block = match[2];
    const unit = Number(block.match(/<Unit>([^<]+)<\/Unit>/)?.[1] || 1);
    const buying = Number(block.match(/<ForexBuying>([^<]+)<\/ForexBuying>/)?.[1]);
    const selling = Number(block.match(/<ForexSelling>([^<]+)<\/ForexSelling>/)?.[1]);
    const tryPerUnit = Number.isFinite(buying) && Number.isFinite(selling)
      ? (buying + selling) / 2
      : buying || selling;
    if (Number.isFinite(tryPerUnit) && tryPerUnit > 0) rates[code] = unit / tryPerUnit;
  }

  if (!Object.keys(rates).length) throw new Error("TCMB returned an empty exchange-rate table");
  return { rates, source: "Central Bank of the Republic of Türkiye" };
}

async function fetchNbpRates() {
  const urls = [
    "https://api.nbp.pl/api/exchangerates/tables/A?format=json",
    "https://api.nbp.pl/api/exchangerates/tables/B?format=json"
  ];
  const results = await Promise.allSettled(urls.map(fetchJson));
  const entries = results
    .filter((result) => result.status === "fulfilled")
    .flatMap((result) => result.value?.[0]?.rates || []);

  if (!entries.length) throw new Error("NBP API is unavailable");

  const plnPerUnit = { PLN: 1 };
  for (const entry of entries) {
    const scaleMatch = String(entry.currency || "").match(/^\s*(\d[\d\s]*)\s+/);
    const scale = scaleMatch ? Number(scaleMatch[1].replace(/\s/g, "")) : 1;
    if (entry.code && Number.isFinite(entry.mid)) {
      plnPerUnit[entry.code] = entry.mid / scale;
    }
  }

  if (!plnPerUnit.TRY) throw new Error("The NBP tables do not contain a TRY rate");

  const rates = {};
  for (const code of TARGET_CURRENCIES) {
    if (plnPerUnit[code]) rates[code] = plnPerUnit.TRY / plnPerUnit[code];
  }

  return { rates, source: "Narodowy Bank Polski" };
}

async function fetchEcbRates() {
  const response = await fetch("https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml", {
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`ECB HTTP ${response.status}`);
  const xml = await response.text();
  const perEuro = { EUR: 1 };
  const pattern = /currency=['\"]([A-Z]{3})['\"]\s+rate=['\"]([0-9.]+)['\"]/g;
  for (const match of xml.matchAll(pattern)) perEuro[match[1]] = Number(match[2]);
  if (!perEuro.TRY) throw new Error("ECB data does not contain a TRY rate");

  const rates = {};
  for (const code of TARGET_CURRENCIES) {
    if (perEuro[code]) rates[code] = perEuro[code] / perEuro.TRY;
  }
  return { rates, source: "European Central Bank" };
}

async function fetchOpenErRates() {
  const data = await fetchJson("https://open.er-api.com/v6/latest/TRY");
  if (data?.result !== "success" || !data.rates) {
    throw new Error("The fallback API returned an invalid response");
  }
  const rates = {};
  for (const code of TARGET_CURRENCIES) {
    if (Number.isFinite(data.rates[code])) rates[code] = data.rates[code];
  }
  return { rates, source: "ExchangeRate-API (fallback)" };
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`${new URL(url).hostname}: HTTP ${response.status}`);
  return response.json();
}

function isMediaMarktUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:"
      && (url.hostname === "mediamarkt.com.tr" || url.hostname.endsWith(".mediamarkt.com.tr"));
  } catch {
    return false;
  }
}

async function ensureMediaMarktContentScript(tabId) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { type: "PRICE_OPTIMIZER_PING" });
    if (response?.ok) return;
  } catch {
    // No receiver means Chrome did not attach the declarative content script to this document.
  }

  await chrome.scripting.insertCSS({ target: { tabId }, files: ["content.css"] });
  await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
}
