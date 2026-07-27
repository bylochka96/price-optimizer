(() => {
  "use strict";

  if (!/(^|\.)mediamarkt\.com\.tr$/i.test(location.hostname)) return;
  if (globalThis.__PRICE_OPTIMIZER_MEDIAMARKT_LOADED__) return;
  globalThis.__PRICE_OPTIMIZER_MEDIAMARKT_LOADED__ = true;

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "PRICE_OPTIMIZER_PING") return;
    sendResponse({ ok: true });
  });

  const PRICE_SELECTORS = [
    "mms-price",
    "[class*='price' i]",
    "[id*='price' i]",
    "[data-test*='price' i]",
    "[data-testid*='price' i]",
    "[data-product-price]",
    "[itemprop='price']",
    "[aria-label*='₺']",
    "[aria-label*='TL' i]"
  ].join(",");

  const SKIP_TAGS = new Set([
    "SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT", "SELECT", "OPTION",
    "CODE", "PRE", "SVG", "CANVAS"
  ]);

  const AMOUNT_SOURCE = String.raw`(?:\d{1,3}(?:[.\s\u00A0\u202F]\d{3})+|\d+)(?:,\d{1,2}|,\s*[–—-])?`;
  const CURRENCY_SOURCE = String.raw`(?:₺|TL|TRY)`;
  const suffixPattern = new RegExp(
    String.raw`(^|[^\p{L}\p{N}])(${AMOUNT_SOURCE})\s*${CURRENCY_SOURCE}(?![\p{L}])`,
    "giu"
  );
  const prefixPattern = new RegExp(
    String.raw`(^|[^\p{L}\p{N}])${CURRENCY_SOURCE}\s*(${AMOUNT_SOURCE})(?![\p{L}\p{N}])`,
    "giu"
  );
  const fullPricePattern = new RegExp(
    String.raw`^\s*(?:${CURRENCY_SOURCE}\s*(${AMOUNT_SOURCE})|(${AMOUNT_SOURCE})\s*${CURRENCY_SOURCE})\s*$`,
    "iu"
  );
  const currencyMarkerPattern = /₺|\bTL\b|\bTRY\b/iu;

  const originalText = new WeakMap();
  const lastRendered = new WeakMap();
  const generatedMarkerElements = new Set();
  const dirtyRoots = new Set();
  let settings = { enabled: true, targetCurrency: "EUR" };
  let rates = {};
  let scheduled = false;

  init();

  async function init() {
    try {
      const state = await chrome.runtime.sendMessage({ type: "GET_STATE" });
      if (state?.ok) {
        settings = state.settings;
        rates = state.rates || {};
      }
    } catch (error) {
      console.warn("Price Optimizer could not load settings", error);
    }

    processRoot(document.body);
    startObserver();

    chrome.storage.onChanged.addListener(async (_changes, area) => {
      if (area !== "sync") return;
      try {
        const state = await chrome.runtime.sendMessage({ type: "GET_STATE" });
        if (!state?.ok) return;
        settings = state.settings;
        rates = state.rates || rates;
        rerenderKnownNodes();
        processRoot(document.body);
      } catch (error) {
        console.warn("Price Optimizer could not apply changed settings", error);
      }
    });
  }

  function startObserver() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          const node = mutation.target;
          if (lastRendered.has(node) && node.nodeValue !== lastRendered.get(node)) {
            originalText.set(node, node.nodeValue);
            lastRendered.delete(node);
            clearGeneratedMarkersNear(node);
          }
          queueRoot(node.parentElement);
          continue;
        }

        queueRoot(mutation.target instanceof Element ? mutation.target : mutation.target.parentElement);
        for (const added of mutation.addedNodes) {
          queueRoot(added.nodeType === Node.TEXT_NODE ? added.parentElement : added);
        }
      }
      scheduleProcess();
    });

    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true
    });
  }

  function queueRoot(value) {
    if (!(value instanceof Element) || !value.isConnected) return;
    const priceContainer = value.closest(PRICE_SELECTORS);
    dirtyRoots.add(priceContainer || value);
  }

  function scheduleProcess() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      const roots = compactRoots([...dirtyRoots]);
      dirtyRoots.clear();
      for (const root of roots) processRoot(root);
    });
  }

  function compactRoots(roots) {
    return roots.filter((root, index) => root.isConnected && !roots.some(
      (other, otherIndex) => otherIndex !== index && other.contains(root)
    ));
  }

  function processRoot(root) {
    if (!(root instanceof Element) || SKIP_TAGS.has(root.tagName)) return;

    processTextNodes(root);

    const candidates = [];
    if (root.matches(PRICE_SELECTORS)) candidates.push(root);
    candidates.push(...root.querySelectorAll(PRICE_SELECTORS));

    const compositeScopes = new Set();
    for (const candidate of candidates) {
      let scope = candidate;
      for (let depth = 0; depth < 3 && scope && scope !== document.body; depth += 1) {
        compositeScopes.add(scope);
        scope = scope.parentElement;
      }
    }

    for (const scope of compositeScopes) {
      processCompositePrice(scope);
    }
  }

  function processTextNodes(element) {
    if (element.isContentEditable) return;
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !currencyMarkerPattern.test(getOriginal(node))) {
          return NodeFilter.FILTER_REJECT;
        }
        const parent = node.parentElement;
        if (!parent || SKIP_TAGS.has(parent.tagName) || parent.closest("[contenteditable='true']")) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) renderSingleNode(node);
  }

  function processCompositePrice(element) {
    if (element.isContentEditable) return;
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || SKIP_TAGS.has(parent.tagName) || parent.closest("[contenteditable='true']")) {
          return NodeFilter.FILTER_REJECT;
        }
        return getOriginal(node).trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    for (let index = 0; index < nodes.length - 1; index += 1) {
      let matched = false;
      for (let size = Math.min(4, nodes.length - index); size >= 2; size -= 1) {
        const group = nodes.slice(index, index + size);
        const combined = group.map(getOriginal).join("");
        const match = combined.match(fullPricePattern);
        const amount = match?.[1] || match?.[2];
        if (!amount) continue;

        renderCompositeNodes(group, amount);
        index += size - 1;
        matched = true;
        break;
      }
      if (matched) continue;
    }
  }

  function renderSingleNode(node) {
    remember(node);
    const original = originalText.get(node);
    let rendered = original;
    const targetRate = rates[settings.targetCurrency];

    if (settings.enabled && Number.isFinite(targetRate)) {
      rendered = convertPrices(original, settings.targetCurrency, targetRate);
    }

    setNodeText(node, rendered);
    if (rendered !== original) suppressGeneratedTryMarker(node);
  }

  function renderCompositeNodes(nodes, amount) {
    for (const node of nodes) remember(node);
    const targetRate = rates[settings.targetCurrency];

    if (!settings.enabled || !Number.isFinite(targetRate)) {
      for (const node of nodes) setNodeText(node, originalText.get(node));
      return;
    }

    const value = parseTurkishNumber(amount);
    if (!Number.isFinite(value)) return;
    const converted = createFormatter(settings.targetCurrency).format(value * targetRate);
    const carrier = nodes.reduce((best, node) => digitCount(getOriginal(node)) > digitCount(getOriginal(best)) ? node : best);

    for (const node of nodes) {
      const original = originalText.get(node);
      setNodeText(node, node === carrier ? preserveOuterWhitespace(original, converted) : preserveOuterWhitespace(original, ""));
    }
    suppressGeneratedTryMarker(carrier);
  }

  function convertPrices(text, currency, rate) {
    const formatter = createFormatter(currency);
    const replace = (match, boundary, amount) => {
      const value = parseTurkishNumber(amount);
      return Number.isFinite(value) ? boundary + formatter.format(value * rate) : match;
    };
    return text.replace(suffixPattern, replace).replace(prefixPattern, replace);
  }

  function parseTurkishNumber(raw) {
    let value = raw.replace(/[\s\u00A0\u202F]/g, "").replace(/,[–—-]$/, ",00");
    if (value.includes(",")) {
      value = value.replace(/\./g, "").replace(",", ".");
    } else if (/^\d{1,3}(?:\.\d{3})+$/.test(value)) {
      value = value.replace(/\./g, "");
    }
    return Number(value);
  }

  function createFormatter(currency) {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function remember(node) {
    if (!originalText.has(node)) originalText.set(node, node.nodeValue);
  }

  function getOriginal(node) {
    return originalText.has(node) ? originalText.get(node) : node.nodeValue;
  }

  function setNodeText(node, value) {
    if (node.nodeValue !== value) node.nodeValue = value;
    lastRendered.set(node, value);
  }

  function preserveOuterWhitespace(source, replacement) {
    return (source.match(/^\s*/u)?.[0] || "") + replacement + (source.match(/\s*$/u)?.[0] || "");
  }

  function digitCount(value) {
    return (value.match(/\d/g) || []).length;
  }

  function rerenderKnownNodes() {
    if (!document.body) return;
    clearAllGeneratedMarkers();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (originalText.has(node)) setNodeText(node, originalText.get(node));
    }
  }

  function suppressGeneratedTryMarker(node) {
    let element = node.parentElement;
    for (let depth = 0; depth < 4 && element && element !== document.body; depth += 1) {
      if (pseudoContainsTry(element, "::before")) {
        element.classList.add("price-optimizer-hide-try-before");
        generatedMarkerElements.add(element);
      }
      if (pseudoContainsTry(element, "::after")) {
        element.classList.add("price-optimizer-hide-try-after");
        generatedMarkerElements.add(element);
      }
      element = element.parentElement;
    }
  }

  function pseudoContainsTry(element, pseudo) {
    try {
      const content = getComputedStyle(element, pseudo).content || "";
      return content !== "none" && /₺|\bTL\b|\bTRY\b/iu.test(content);
    } catch {
      return false;
    }
  }

  function clearGeneratedMarkersNear(node) {
    let element = node.parentElement;
    while (element && element !== document.body) {
      if (generatedMarkerElements.has(element)) {
        element.classList.remove("price-optimizer-hide-try-before", "price-optimizer-hide-try-after");
        generatedMarkerElements.delete(element);
      }
      element = element.parentElement;
    }
  }

  function clearAllGeneratedMarkers() {
    for (const element of generatedMarkerElements) {
      element.classList.remove("price-optimizer-hide-try-before", "price-optimizer-hide-try-after");
    }
    generatedMarkerElements.clear();
  }
})();
