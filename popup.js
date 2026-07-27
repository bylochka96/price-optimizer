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

const REMOTE_BANNER_CONFIG_URL = "https://bylochka96.github.io/price-optimizer/banners.json";
const LOCAL_BANNER_CONFIG_URL = chrome.runtime.getURL("banners.json");
const BANNER_DISMISSAL_MS = 2 * 60 * 60 * 1000;
const MEDIA_MARKT_DOMAIN = "mediamarkt.com.tr";

let state;
let currentBannerCampaign;

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

async function loadState() {
  setStatus("Loading the latest exchange rates…");
  try {
    const response = await chrome.runtime.sendMessage({ type: "GET_STATE" });
    if (!response?.ok) throw new Error(response?.error || "The extension did not respond");
    state = response;
    currency.value = state.settings.targetCurrency;
    enabled.checked = state.settings.enabled;
    renderRate();
  } catch (error) {
    setStatus(error.message, true);
    rate.textContent = "Unavailable";
  }
}

async function saveSettings(patch) {
  try {
    const response = await chrome.runtime.sendMessage({ type: "SET_SETTINGS", settings: patch });
    if (!response?.ok) throw new Error(response?.error || "Could not save settings");
    state = { ...(state || {}), settings: response.settings };
    enabled.checked = response.settings.enabled;
    setStatus("Settings saved");
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
    && String(campaign.ctaLabel || "").length <= 40;
}

async function dismissCurrentBanner() {
  adBanner.hidden = true;
  if (!currentBannerCampaign) return;

  await chrome.storage.local.set({
    dismissedBanner: {
      campaign: currentBannerCampaign,
      dismissedUntil: Date.now() + BANNER_DISMISSAL_MS
    }
  });
  currentBannerCampaign = null;
}

function renderBanner(campaign) {
  adSponsor.textContent = String(campaign.sponsor || "Sponsored");
  adContext.textContent = "For MediaMarkt";
  adTitle.textContent = String(campaign.title || "Partner offer");
  adBody.textContent = String(campaign.body || "");

  const buttonColor = String(campaign.buttonColor || campaign.accent || "");
  if (/^#[0-9a-f]{6}$/i.test(buttonColor)) {
    adBanner.style.setProperty("--ad-button-color", buttonColor);
  }

  const backgroundImage = safeBannerImageUrl(campaign.backgroundImage);
  adBanner.style.setProperty(
    "--ad-background-image",
    backgroundImage ? `url("${backgroundImage}")` : "none"
  );

  const overlay = Number(campaign.backgroundOverlay);
  if (Number.isFinite(overlay)) {
    adBanner.style.setProperty("--ad-overlay-opacity", String(Math.min(1, Math.max(0, overlay))));
  }

  const position = safeBackgroundPosition(campaign.backgroundPosition);
  adBanner.style.setProperty("--ad-background-position", position);

  const url = safeHttpsUrl(campaign.url);
  const ctaLabel = String(campaign.ctaLabel || "").trim();
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
  setStatus("Refreshing exchange rates…");
  try {
    const response = await chrome.runtime.sendMessage({ type: "REFRESH_RATES" });
    if (!response?.ok) throw new Error(response?.error || "Could not refresh exchange rates");
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
    rate.textContent = `${code}: no data`;
    updated.textContent = "";
    setStatus("The exchange rate for this currency is currently unavailable", true);
    return;
  }

  const digits = value < 0.01 ? 6 : value < 1 ? 4 : 2;
  rate.textContent = `1 TRY = ${value.toLocaleString("en-GB", { maximumFractionDigits: digits })} ${code}`;
  updated.textContent = `Updated ${new Date(state.updatedAt).toLocaleString("en-GB", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
  })}`;

  const sourceText = (state.sources || []).join("\n");
  const sourceHeading = state.stale ? "Cached rate sources:" : "Rate sources:";
  setStatus(`${sourceHeading}\n${sourceText || "Unavailable"}`);
}

function setStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle("error", isError);
}
