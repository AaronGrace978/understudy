import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1300 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
try {
  await page.goto("http://127.0.0.1:3000");
  await page.waitForFunction(() =>
    document.querySelector("#connection").textContent.includes("CONNECTED"),
  );
  await page.locator('[data-mode="cohost"]').click();
  await page.locator("#editProfile").click();
  await page.locator('input[name="streamer"]').fill("Nova");
  await page.getByText("Save channel DNA", { exact: true }).click();
  await page.waitForFunction(
    () => !document.querySelector("#profileDialog").open,
  );
  await page
    .locator("#chatText")
    .fill("Understudy, what are we playing tonight?");
  await page.locator("#chatForm button").click();
  await page.waitForFunction(() =>
    document
      .querySelector("#chatFeed")
      .textContent.includes("Tonight: indie games"),
  );
  const overlayContext = await browser.newContext();
  const overlay = await overlayContext.newPage();
  await overlay.goto("http://127.0.0.1:3000/overlay");
  await overlay.waitForFunction(
    () => document.querySelector("#mode").textContent === "AI CO-HOST",
  );
  await page.keyboard.press("Alt+a");
  await page.waitForFunction(
    () => document.querySelector("#modeLabel").textContent === "STANDING IN",
  );
  await overlay.waitForFunction(() =>
    document
      .querySelector("#caption")
      .textContent.includes("standing in for Nova"),
  );
  await page.locator("#poll").click();
  await page.locator("#chatText").fill("2");
  await page.locator("#chatForm button").click();
  await page.waitForFunction(() =>
    document
      .querySelector("#pollBox")
      .textContent.includes("Chaotic racing — 1 votes"),
  );
  await page.getByText("Close poll & announce", { exact: true }).click();
  await page.waitForFunction(() => document.querySelector("#pollBox").hidden);
  await page.locator("#queueBit").click();
  await page.waitForFunction(() =>
    document.querySelector("#queueList").textContent.includes("Storytime"),
  );
  await mkdir("docs", { recursive: true });
  await page.evaluate(
    () => (document.querySelector("#toast").style.display = "none"),
  );
  await page.screenshot({ path: "docs/control-room.png", fullPage: true });
  await overlay.setViewportSize({ width: 800, height: 700 });
  await overlay.screenshot({ path: "docs/overlay.png", omitBackground: true });
  await page.locator("#voiceEnabled").check();
  await page.locator("#overlayVoice").check();
  await overlay.waitForFunction(
    () => document.querySelector("#mode").textContent === "AI · STANDING IN",
  );
  const voiceState = await (
    await page.request.get("http://127.0.0.1:3000/api/state")
  ).json();
  assert.deepEqual(voiceState.voiceConfig, {
    enabled: true,
    overlay: true,
    provider: "browser",
  });
  await page.locator("#voiceEnabled").uncheck();
  await page.locator("#kill").click();
  await overlay.waitForFunction(
    () => document.querySelector("#mode").textContent === "STOPPED",
  );
  assert.match(await overlay.locator("#caption").textContent(), /paused/);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
    "mobile horizontal overflow",
  );
  await page.locator('[data-mode="cohost"]').click();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: control room, profile save, mock response, hotkey, overlay synchronization, vote, queue, stop, mobile layout; no browser errors.",
  );
} finally {
  await browser.close();
}
