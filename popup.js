const currency = document.querySelector("#currency");
const enabled = document.querySelector("#enabled");
const rate = document.querySelector("#rate");
const updated = document.querySelector("#updated");
const status = document.querySelector("#status");
const refresh = document.querySelector("#refresh");
const adBanner = document.querySelector("#adBanner");
const adSponsor = document.querySelector("#adSponsor");
const adContext = document.querySelector("#adContext");
const adTitle = document.querySelector("#adTitle");
const adBody = document.querySelector("#adBody");
const adCta = document.querySelector("#adCta");
const adClose = document.querySelector("#adClose");
const languageButtons = [...document.querySelectorAll("[data-language]")];

const REMOTE_BANNER_CONFIG_URL = "https://bylochka96.github.io/price-optimizer/banners.json";
const LOCAL_BANNER_CONFIG_URL = chrome.runtime.getURL("banners.json");
const BANNER_DISMISSAL_MS = 2 * 60 * 60 * 1000;
const MEDIA_MARKT_DOMAIN = "mediamarkt.com.tr";

const UI_STRINGS = {
  en: {
    languageSelector: "Interface language",
    brandSubtitle: "Built for MediaMarkt Türkiye",
    convertPrices: "Convert prices",
    convertHint: "Replace TRY prices while you browse",
    displayCurrency: "Display currency",
    groupFeatured: "Featured currencies",
    groupEurope: "Europe",
    groupEasternEurope: "Eastern Europe",
    groupCaucasusCentralAsia: "Caucasus & Central Asia",
    groupGulf: "Gulf region",
    currencyUSD: "USD — US Dollar",
    currencyEUR: "EUR — Euro",
    currencyGBP: "GBP — British Pound",
    currencyCHF: "CHF — Swiss Franc",
    currencyRUB: "RUB — Russian Ruble",
    currencyUAH: "UAH — Ukrainian Hryvnia",
    currencyBYN: "BYN — Belarusian Ruble",
    currencyAZN: "AZN — Azerbaijani Manat",
    currencyKZT: "KZT — Kazakhstani Tenge",
    currencyAED: "AED — UAE Dirham",
    currencySAR: "SAR — Saudi Riyal",
    exchangeRate: "Exchange rate",
    loadingShort: "Loading…",
    loadingRates: "Loading exchange rates…",
    loadingLatestRates: "Loading the latest exchange rates…",
    refreshRates: "Refresh exchange rates",
    refreshingRates: "Refreshing exchange rates…",
    sponsoredOffer: "Sponsored offer",
    closeAdvertisement: "Close advertisement",
    sponsored: "Sponsored",
    adContext: "For MediaMarkt",
    partnerOffer: "Partner offer",
    worksOn: "Works on",
    unavailable: "Unavailable",
    noData: "no data",
    rateUnavailable: "The exchange rate for this currency is currently unavailable",
    updated: "Updated",
    cachedRateSources: "Cached rate sources:",
    rateSources: "Rate sources:",
    settingsSaved: "Settings saved",
    extensionNoResponse: "The extension did not respond",
    couldNotSave: "Could not save settings",
    couldNotRefresh: "Could not refresh exchange rates"
  },
  tr: {
    languageSelector: "Arayüz dili",
    brandSubtitle: "MediaMarkt Türkiye için geliştirildi",
    convertPrices: "Fiyatları dönüştür",
    convertHint: "Gezinirken TRY fiyatlarını değiştir",
    displayCurrency: "Gösterim para birimi",
    groupFeatured: "Öne çıkan para birimleri",
    groupEurope: "Avrupa",
    groupEasternEurope: "Doğu Avrupa",
    groupCaucasusCentralAsia: "Kafkasya ve Orta Asya",
    groupGulf: "Körfez bölgesi",
    currencyUSD: "USD — ABD Doları",
    currencyEUR: "EUR — Euro",
    currencyGBP: "GBP — İngiliz Sterlini",
    currencyCHF: "CHF — İsviçre Frangı",
    currencyRUB: "RUB — Rus Rublesi",
    currencyUAH: "UAH — Ukrayna Grivnası",
    currencyBYN: "BYN — Belarus Rublesi",
    currencyAZN: "AZN — Azerbaycan Manatı",
    currencyKZT: "KZT — Kazakistan Tengesi",
    currencyAED: "AED — BAE Dirhemi",
    currencySAR: "SAR — Suudi Arabistan Riyali",
    exchangeRate: "Döviz kuru",
    loadingShort: "Yükleniyor…",
    loadingRates: "Döviz kurları yükleniyor…",
    loadingLatestRates: "Güncel döviz kurları yükleniyor…",
    refreshRates: "Döviz kurlarını yenile",
    refreshingRates: "Döviz kurları yenileniyor…",
    sponsoredOffer: "Sponsorlu teklif",
    closeAdvertisement: "Reklamı kapat",
    sponsored: "Sponsorlu",
    adContext: "MediaMarkt için",
    partnerOffer: "İş ortağı teklifi",
    worksOn: "Çalıştığı site:",
    unavailable: "Kullanılamıyor",
    noData: "veri yok",
    rateUnavailable: "Bu para biriminin döviz kuru şu anda kullanılamıyor",
    updated: "Güncellendi",
    cachedRateSources: "Önbelleğe alınmış kur kaynakları:",
    rateSources: "Kur kaynakları:",
    settingsSaved: "Ayarlar kaydedildi",
    extensionNoResponse: "Uzantı yanıt vermedi",
    couldNotSave: "Ayarlar kaydedilemedi",
    couldNotRefresh: "Döviz kurları yenilenemedi"
  }
};

const SOURCE_NAMES_TR = {
  "Central Bank of the Republic of Türkiye": "Türkiye Cumhuriyet Merkez Bankası",
  "Narodowy Bank Polski": "Polonya Merkez Bankası",
  "European Central Bank": "Avrupa Merkez Bankası",
  "ExchangeRate-API (fallback)": "ExchangeRate-API (yedek kaynak)"
};

let state;
let currentBannerCampaign;
let activeBannerCampaign;
let currentLanguage = "en";

applyLanguage();
loadState();
loadBanner();

currency.addEventListener("change", async () => {
  await saveSettings({ targetCurrency: currency.value });
  renderRate();
});

enabled.addEventListener("change", async () => {
  await saveSettings({ enabled: enabled.checked });
});
refresh.addEventListener("click", refreshRates);
adClose.addEventListener("click", dismissCurrentBanner);
for (const button of languageButtons) {
  button.addEventListener("click", async () => {
    const nextLanguage = normalizeLanguage(button.dataset.language);
    if (nextLanguage === currentLanguage) return;
    currentLanguage = nextLanguage;
    applyLanguage();
    if (state) renderRate();
    if (activeBannerCampaign) renderBanner(activeBannerCampaign);
    await saveSettings({ uiLanguage: currentLanguage });
  });
}

function normalizeLanguage(value) {
  return value === "tr" ? "tr" : "en";
}

function t(key) {
  return UI_STRINGS[currentLanguage]?.[key] || UI_STRINGS.en[key] || key;
}

function applyLanguage() {
  document.documentElement.lang = currentLanguage;
  for (const element of document.querySelectorAll("[data-i18n]")) {
    element.textContent = t(element.dataset.i18n);
  }
  for (const element of document.querySelectorAll("[data-i18n-label]")) {
    element.label = t(element.dataset.i18nLabel);
  }
  for (const element of document.querySelectorAll("[data-i18n-title]")) {
    element.title = t(element.dataset.i18nTitle);
  }
  for (const element of document.querySelectorAll("[data-i18n-aria-label]")) {
    element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel));
  }
  for (const button of languageButtons) {
    button.setAttribute("aria-pressed", String(button.dataset.language === currentLanguage));
  }
}

async function loadState() {
  setStatus(t("loadingLatestRates"));
  try {
    const response = await chrome.runtime.sendMessage({ type: "GET_STATE" });
    if (!response?.ok) throw new Error(response?.error || t("extensionNoResponse"));
    state = response;
    currentLanguage = normalizeLanguage(state.settings.uiLanguage);
    applyLanguage();
    if (activeBannerCampaign) renderBanner(activeBannerCampaign);
    currency.value = state.settings.targetCurrency;
    enabled.checked = state.settings.enabled;
    renderRate();
  } catch (error) {
    setStatus(error.message, true);
    rate.textContent = t("unavailable");
  }
}

async function saveSettings(patch) {
  try {
    const response = await chrome.runtime.sendMessage({ type: "SET_SETTINGS", settings: patch });
    if (!response?.ok) throw new Error(response?.error || t("couldNotSave"));
    state = { ...(state || {}), settings: response.settings };
    enabled.checked = response.settings.enabled;
    setStatus(t("settingsSaved"));
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function loadBanner() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) return;
    const hostname = new URL(tab.url).hostname.replace(/^www\./, "").toLowerCase();
    if (hostname !== MEDIA_MARKT_DOMAIN && !hostname.endsWith(`.${MEDIA_MARKT_DOMAIN}`)) return;

    const config = await fetchBannerConfig();
    const campaign = config.campaign;
    if (!campaign?.enabled) return;

    const campaignId = String(campaign.id || "mediamarkt-campaign");
    const dismissalValue = `${config.version || 1}:${campaignId}`;
    const stored = await chrome.storage.local.get("dismissedBanner");
    const dismissal = stored.dismissedBanner;
    const isDismissed = dismissal
      && dismissal.campaign === dismissalValue
      && Number(dismissal.dismissedUntil) > Date.now();
    if (isDismissed) return;

    if (dismissal) await chrome.storage.local.remove("dismissedBanner");

    currentBannerCampaign = dismissalValue;
    activeBannerCampaign = campaign;
    renderBanner(campaign);
  } catch (error) {
    console.warn("Price Optimizer could not load the banner configuration", error);
  }
}

async function fetchBannerConfig() {
  for (const url of [REMOTE_BANNER_CONFIG_URL, LOCAL_BANNER_CONFIG_URL]) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);
      const response = await fetch(url, { cache: "no-store", signal: controller.signal });
      clearTimeout(timer);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const config = await response.json();
      if (!isValidBannerConfig(config)) throw new Error("Invalid banner configuration");
      return config;
    } catch (error) {
      console.warn(`Price Optimizer could not load banner config from ${url}`, error);
    }
  }
  throw new Error("No valid banner configuration is available");
}

function isValidBannerConfig(config) {
  const campaign = config?.campaign;
  return Number.isFinite(Number(config?.version))
    && campaign && typeof campaign === "object"
    && typeof campaign.id === "string" && campaign.id.length > 0 && campaign.id.length <= 80
    && typeof campaign.enabled === "boolean"
    && String(campaign.title || "").length <= 120
    && String(campaign.body || "").length <= 280
    && String(campaign.ctaLabel || "").length <= 40
    && String(campaign.sponsor_TR || "").length <= 80
    && String(campaign.title_TR || "").length <= 120
    && String(campaign.body_TR || "").length <= 280
    && String(campaign.ctaLabel_TR || "").length <= 40
    && String(campaign.url_TR || "").length <= 2048;
}

async function dismissCurrentBanner() {
  adBanner.hidden = true;
  activeBannerCampaign = null;
  if (!currentBannerCampaign) return;

  await chrome.storage.local.set({
    dismissedBanner: {
      campaign: currentBannerCampaign,
      dismissedUntil: Date.now() + BANNER_DISMISSAL_MS
    }
  });
  currentBannerCampaign = null;
}

function campaignValue(campaign, field, fallback = "") {
  const localizedField = `${field}_TR`;
  if (currentLanguage === "tr" && Object.prototype.hasOwnProperty.call(campaign, localizedField)) {
    return campaign[localizedField];
  }
  return Object.prototype.hasOwnProperty.call(campaign, field) ? campaign[field] : fallback;
}

function renderBanner(campaign) {
  adSponsor.textContent = String(campaignValue(campaign, "sponsor", t("sponsored")) || t("sponsored"));
  adContext.textContent = t("adContext");
  adTitle.textContent = String(campaignValue(campaign, "title", t("partnerOffer")) || t("partnerOffer"));
  adBody.textContent = String(campaignValue(campaign, "body", ""));

  const buttonColor = String(campaignValue(campaign, "buttonColor", campaign.accent || ""));
  if (/^#[0-9a-f]{6}$/i.test(buttonColor)) {
    adBanner.style.setProperty("--ad-button-color", buttonColor);
  }

  const backgroundImage = safeBannerImageUrl(campaignValue(campaign, "backgroundImage", ""));
  adBanner.style.setProperty(
    "--ad-background-image",
    backgroundImage ? `url("${backgroundImage}")` : "none"
  );

  const overlay = Number(campaignValue(campaign, "backgroundOverlay", campaign.backgroundOverlay));
  if (Number.isFinite(overlay)) {
    adBanner.style.setProperty("--ad-overlay-opacity", String(Math.min(1, Math.max(0, overlay))));
  }

  const position = safeBackgroundPosition(campaignValue(campaign, "backgroundPosition", "center"));
  adBanner.style.setProperty("--ad-background-position", position);

  const url = safeHttpsUrl(campaignValue(campaign, "url", ""));
  const ctaLabel = String(campaignValue(campaign, "ctaLabel", "")).trim();
  if (url && ctaLabel) {
    adCta.href = url;
    adCta.textContent = ctaLabel;
    adCta.hidden = false;
  } else {
    adCta.hidden = true;
    adCta.removeAttribute("href");
  }

  adBanner.hidden = false;
}

function safeHttpsUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

function safeBannerImageUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  if (/^(?:assets|images)\/[a-z0-9_./-]+$/i.test(raw) && !raw.includes("..")) {
    return chrome.runtime.getURL(raw);
  }

  return safeHttpsUrl(raw);
}

function safeBackgroundPosition(value) {
  const position = String(value || "center").trim().toLowerCase();
  const allowed = new Set([
    "center", "top", "right", "bottom", "left",
    "top left", "top center", "top right",
    "center left", "center right",
    "bottom left", "bottom center", "bottom right"
  ]);
  return allowed.has(position) ? position : "center";
}

async function refreshRates() {
  refresh.disabled = true;
  refresh.textContent = "…";
  setStatus(t("refreshingRates"));
  try {
    const response = await chrome.runtime.sendMessage({ type: "REFRESH_RATES" });
    if (!response?.ok) throw new Error(response?.error || t("couldNotRefresh"));
    state = { ...state, ...response };
    renderRate();
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    refresh.disabled = false;
    refresh.textContent = "↻";
  }
}

function renderRate() {
  const code = currency.value;
  const value = state?.rates?.[code];
  if (!Number.isFinite(value)) {
    rate.textContent = `${code}: ${t("noData")}`;
    updated.textContent = "";
    setStatus(t("rateUnavailable"), true);
    return;
  }

  const digits = value < 0.01 ? 6 : value < 1 ? 4 : 2;
  const locale = currentLanguage === "tr" ? "tr-TR" : "en-GB";
  rate.textContent = `1 TRY = ${value.toLocaleString(locale, { maximumFractionDigits: digits })} ${code}`;
  updated.textContent = `${t("updated")} ${new Date(state.updatedAt).toLocaleString(locale, {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
  })}`;

  const sourceText = (state.sources || [])
    .map((source) => currentLanguage === "tr" ? (SOURCE_NAMES_TR[source] || source) : source)
    .join("\n");
  const sourceHeading = state.stale ? t("cachedRateSources") : t("rateSources");
  setStatus(`${sourceHeading}\n${sourceText || t("unavailable")}`);
}

function setStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle("error", isError);
}
