const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

(async () => {
  let onTabUpdated;
  const calls = [];
  const chrome = {
    tabs: {
      onUpdated: { addListener(listener) { onTabUpdated = listener; } },
      async sendMessage(tabId, message) {
        calls.push(["ping", tabId, message.type]);
        throw new Error("No receiver");
      }
    },
    scripting: {
      async insertCSS(details) { calls.push(["css", details.target.tabId]); },
      async executeScript(details) { calls.push(["script", details.target.tabId]); }
    },
    runtime: {
      onInstalled: { addListener() {} },
      onMessage: { addListener() {} }
    },
    storage: { sync: {}, local: {} }
  };

  const source = fs.readFileSync(path.join(__dirname, "..", "background.js"), "utf8");
  vm.runInNewContext(source, { chrome, URL, fetch, console, setTimeout, clearTimeout });

  onTabUpdated(7, { status: "complete" }, { url: "https://outside.test/" });
  await new Promise((resolve) => setImmediate(resolve));
  if (calls.length) throw new Error("Recovery ran on an unsupported domain");

  onTabUpdated(7, { status: "complete" }, { url: "https://www.mediamarkt.com.tr/tr/category/telefon" });
  await new Promise((resolve) => setImmediate(resolve));
  const actual = calls.map((call) => call[0]).join(",");
  if (actual !== "ping,css,script") throw new Error(`Unexpected recovery sequence: ${actual}`);

  console.log("Cross-domain navigation recovery test passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
