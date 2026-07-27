const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

(async () => {
  let storedSettings = {
    settingsVersion: 3,
    enabled: false,
    targetCurrency: "USD"
  };

  const chrome = {
    tabs: {
      onUpdated: { addListener() {} },
      async sendMessage() {}
    },
    scripting: {
      async insertCSS() {},
      async executeScript() {}
    },
    runtime: {
      onInstalled: { addListener() {} },
      onMessage: { addListener() {} }
    },
    storage: {
      sync: {
        async get() { return { settings: storedSettings }; },
        async set(value) { storedSettings = value.settings; }
      },
      local: { async get() { return {}; }, async set() {} }
    }
  };

  const context = { chrome, URL, fetch, console, setTimeout, clearTimeout };
  vm.createContext(context);
  const source = fs.readFileSync(path.join(__dirname, "..", "background.js"), "utf8");
  vm.runInContext(source, context);

  const migrated = await context.getSettings();
  if (migrated.uiLanguage !== "en" || migrated.enabled !== false || migrated.targetCurrency !== "USD") {
    throw new Error(`Existing settings were not migrated safely: ${JSON.stringify(migrated)}`);
  }

  const turkish = await context.saveSettings({ uiLanguage: "tr" });
  if (turkish.uiLanguage !== "tr" || turkish.enabled !== false || turkish.targetCurrency !== "USD") {
    throw new Error(`Turkish language was not persisted safely: ${JSON.stringify(turkish)}`);
  }

  const invalid = await context.saveSettings({ uiLanguage: "de" });
  if (invalid.uiLanguage !== "tr") throw new Error("Invalid language unexpectedly replaced the saved language");

  console.log("Language setting migration and persistence tests passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
