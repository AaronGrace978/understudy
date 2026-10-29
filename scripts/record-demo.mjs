/** Record real local mock-adapter interactions, never a network/model simulation. */
import { spawn, execFileSync } from "node:child_process";
import {
  mkdtemp,
  mkdir,
  readFile,
  symlink,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const scratch = await mkdtemp(join(tmpdir(), "understudy-recording-"));
// Use the trusted system ffmpeg at Playwright's expected registry path; no download.
const registry = JSON.parse(
  await readFile(
    join(
      dirname(require.resolve("playwright-core/package.json")),
      "browsers.json",
    ),
    "utf8",
  ),
);
const revision = registry.browsers.find((x) => x.name === "ffmpeg").revision;
const ffmpegDir = join(scratch, `ffmpeg-${revision}`);
await mkdir(ffmpegDir);
await symlink(
  process.env.FFMPEG_PATH || "/usr/bin/ffmpeg",
  join(ffmpegDir, "ffmpeg-linux"),
);
process.env.PLAYWRIGHT_BROWSERS_PATH = scratch;
const { chromium } = await import("playwright");
const port = 3015,
  base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["--import", "tsx", "src/server.ts"], {
  env: {
    ...process.env,
    PORT: String(port),
    DOTENV_CONFIG_PATH: join(scratch, "no-env"),
    UNDERSTUDY_DATA_DIR: join(scratch, "profile"),
    OPENAI_API_KEY: "",
    LOCAL_MODEL_URL: "",
    TWITCH_CHANNEL: "",
    TWITCH_BOT_USERNAME: "",
    TWITCH_OAUTH_TOKEN: "",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
server.stdout.on("data", (x) => process.stdout.write(x));
server.stderr.on("data", (x) => process.stderr.write(x));
let browser, context;
async function action(action, value) {
  const response = await fetch(base + "/api/action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, value }),
  });
  assert.equal(response.status, 200, await response.text());
}
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(base + "/api/state")).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  assert.ok(ready, "Recording server did not start");
  const initial = await (await fetch(base + "/api/state")).json();
  assert.equal(initial.provider, "mock");
  assert.equal(initial.twitch, "disconnected");
  assert.equal(initial.capabilities.openai, false);
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  await mkdir("test-results/demo", { recursive: true });
  context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    recordVideo: {
      dir: "test-results/demo",
      size: { width: 1920, height: 1080 },
    },
  });
  const page = await context.newPage();
  const video = page.video();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setContent(`<!doctype html><html><head><style>
 *{box-sizing:border-box}body{margin:0;background:#101014;color:#f3f1f8;font:18px system-ui;overflow:hidden}.top{height:78px;display:flex;align-items:center;justify-content:space-between;padding:0 34px;border-bottom:1px solid #34303c}.logo{font-size:31px;font-weight:750;letter-spacing:-1px}.logo span{color:#c0f785}.top small{font-size:13px;letter-spacing:2px;color:#b4a5ca}.badge{color:#c0f785;border:1px solid #48583a;border-radius:6px;padding:9px 14px;font-size:12px;letter-spacing:1px}.panes{display:grid;grid-template-columns:1280px 640px;height:850px}.pane{height:100%;position:relative}.pane-label{height:34px;padding:7px 22px;font:11px system-ui;letter-spacing:2px;color:#b2a5c4;background:#19171f;border-bottom:1px solid #332b3c}iframe{border:0;width:100%;height:816px}.right{background:radial-gradient(ellipse at 50% 50%,#3e3054,#1b1723);border-left:1px solid #554467}.bottom{height:152px;padding:20px 36px;background:#19171f;border-top:1px solid #43334f;display:flex;gap:30px;align-items:center}.step{color:#bba1f1;font-size:12px;letter-spacing:2px;min-width:185px}.caption{font-size:24px;font-weight:500;line-height:1.4;max-width:1400px}.sub{font-size:13px;color:#a69aaf;margin-top:6px}.progress{position:absolute;bottom:0;left:0;height:3px;background:#c0f785;width:0}#code{display:none;position:absolute;top:78px;left:0;right:0;bottom:152px;background:#15131b;padding:26px 60px;overflow:hidden}#code h2{color:#c0f785;font-size:18px;letter-spacing:2px;margin:0 0 18px}#code pre{font:19px/1.65 ui-monospace,monospace;white-space:pre-wrap;color:#d1c4e3;max-width:1750px}#code .viewport{height:690px;overflow:hidden}
 </style></head><body><div class="top"><div class="logo">understudy<span>✦</span> <small>YOUR AI CO-HOST</small></div><div class="badge">MOCK DEMO · NO TWITCH CONNECTION · NO PAID CALLS</div></div><div class="panes"><div class="pane"><div class="pane-label">01 / STREAMER CONTROL ROOM</div><iframe id="control" src="${base}"></iframe></div><div class="pane right"><div class="pane-label">02 / OBS BROWSER OVERLAY · LIVE CAPTIONS</div><iframe id="overlay" src="${base}/overlay"></iframe></div></div><div id="code"><h2>BUILT WITH CODEX / ACTUAL REPOSITORY EVIDENCE</h2><div class="viewport"><pre id="codeText"></pre></div></div><div class="bottom"><div class="step" id="step">01 / THE PROBLEM</div><div><div class="caption" id="caption">A quick break shouldn’t mean an empty room.</div><div class="sub" id="sub">Understudy keeps your community company. Always clearly AI.</div></div></div><div class="progress" id="progress"></div></body></html>`);
  const control = page.frameLocator("#control"),
    overlay = page.frameLocator("#overlay");
  await control
    .locator("#connection")
    .filter({ hasText: "CONNECTED" })
    .waitFor();
  await overlay.locator("#avatar").waitFor();
  await page
    .frames()
    .find((f) => f.url() === base + "/")
    .addStyleTag({
      content: `header{height:58px}.intro{margin:16px 0}.intro h1{font-size:31px}.intro p{margin:6px 0}.card{padding:16px}.stage-scene{height:210px}.avatar-wrap{width:195px;height:195px}.stage .card-heading{margin-bottom:12px}.stage .card-heading h2{font-size:13px}.disclosure{margin:10px 0;min-height:30px}.mode-switch button{padding:9px 12px}.stage-footer{margin-top:10px}.chat-feed{height:145px}.chat-card{min-height:245px}.layout{gap:16px}.main-column,.side-column{gap:14px}.chat-hint{display:none}footer{display:none}main{padding-right:22px}.voice-card{padding:14px}.card-heading{margin-bottom:12px}#toast{display:none!important}`,
    });
  await page
    .frames()
    .find((f) => f.url() === base + "/overlay")
    .addStyleTag({
      content:
        ".overlay{width:560px;left:40px;bottom:110px}.avatar{width:330px;height:330px;left:115px}.bubble{padding:27px}#caption{font-size:25px}.label{font-size:13px}.footer{font-size:12px}#unlock{display:none}",
    });
  const started = Date.now();
  async function at(
    seconds,
    step,
    caption,
    sub = "Live browser recording · fictional channel and simulated viewers",
  ) {
    const delay = started + seconds * 1000 - Date.now();
    if (delay > 0) await new Promise((r) => setTimeout(r, delay));
    await page.evaluate(
      ({ step, caption, sub, seconds }) => {
        document.querySelector("#step").textContent = step;
        document.querySelector("#caption").textContent = caption;
        document.querySelector("#sub").textContent = sub;
        document.querySelector("#progress").style.width =
          `${(seconds / 150) * 100}%`;
      },
      { step, caption, sub, seconds },
    );
    console.log(`DEMO ${seconds}s: ${caption}`);
  }
  const chat = (user, text) => action("chat", { user, text });
  await at(
    0,
    "01 / THE PROBLEM",
    "The show goes on. Even when you need a minute.",
  );
  await at(
    6,
    "02 / CHANNEL DNA",
    "Your channel has its own language. Give your co-host the context.",
  );
  await control.locator("#editProfile").click();
  await control
    .locator('textarea[name="notes"]')
    .fill(
      "Chat calls itself the Save Squad. Celebrate tiny wins. Never invent personal stories about Nova.\nClip transcript: “One more run. Famous last words.”",
    );
  await at(
    14,
    "02 / CHANNEL DNA",
    "Catchphrases, recurring bits, stream facts — and clear boundaries.",
  );
  await control.locator("#closeProfile").click();
  await at(
    20,
    "03 / CO-HOST",
    "A familiar face for the regulars. A warm welcome for newcomers.",
  );
  await chat("pixelpilot", "hey Save Squad! made it just in time");
  await at(
    24,
    "03 / CO-HOST",
    "Mock viewers enter through the real chat handler.",
  );
  await chat("cozycat", "first time here — Understudy, hello!");
  await at(
    30,
    "03 / CO-HOST",
    "Ask about the stream. Understudy answers from the channel profile.",
  );
  await chat("retro_rae", "Understudy, what are we playing tonight?");
  await at(38, "03 / CO-HOST", "In on the bit. Always under its own identity.");
  await chat("pixelpilot", "Understudy, we survived that one HP run!");
  await overlay.locator('#avatar[src="/assets/laughing.png"]').waitFor();
  await at(
    46,
    "04 / YOUR VOICE",
    "The streamer stays in the loop with push-to-talk or a typed transcript.",
    "Typed-transcript fallback shown · no microphone or transcription API used",
  );
  await control.locator("#speechText").fill("Any ideas for our next segment?");
  await control.locator("#speechForm button").click();
  await at(
    54,
    "05 / CHAT DECIDES",
    "Hand the next segment to chat. One vote per viewer.",
  );
  await control.locator("#poll").click();
  await chat("pixelpilot", "1");
  await at(
    60,
    "05 / CHAT DECIDES",
    "Cozy farming or chaotic racing? The community chooses.",
  );
  await chat("cozycat", "1");
  await chat("retro_rae", "2");
  await at(
    66,
    "05 / CHAT DECIDES",
    "Changed your mind? Your new vote replaces the old one.",
  );
  await chat("pixelpilot", "2");
  await chat("save_squad", "2");
  await at(
    72,
    "05 / CHAT DECIDES",
    "Close the poll and announce the result to the room.",
  );
  await control.getByText("Close poll & announce", { exact: true }).click();
  await at(
    80,
    "06 / STAND-IN",
    "Time for a break. Alt + A hands the mic to Understudy.",
  );
  await control.locator('[data-mode="cohost"]').focus();
  await page.keyboard.press("Alt+a");
  await overlay
    .locator("#caption")
    .filter({ hasText: "I'm Understudy, standing in for Nova" })
    .waitFor();
  await at(
    88,
    "06 / STAND-IN",
    "“I’m Understudy, standing in for Nova.” Always openly AI.",
    "Actual takeover disclosure from the app · no impersonation",
  );
  await at(96, "06 / STAND-IN", "Chat has company while the streamer is away.");
  await chat("cozycat", "Understudy, who are you?");
  await at(
    103,
    "07 / FAMILIAR BITS",
    "Keep a signature bit ready. Invite chat to build the story together.",
  );
  await control.locator("#queueBit").click();
  await control.locator("#next").click();
  await at(
    109,
    "07 / FAMILIAR BITS",
    "The regulars bring the energy. Understudy keeps the seat warm.",
  );
  await chat(
    "retro_rae",
    "Our hero found a save point disguised as a toaster.",
  );
  await at(
    115,
    "08 / HUMAN CONTROL",
    "One button stops the bot. Pending replies cannot take over later.",
  );
  await control.locator("#kill").click();
  await overlay.locator("#mode").filter({ hasText: "STOPPED" }).waitFor();
  await at(
    121,
    "09 / BUILT WITH CODEX",
    "From a README-only repo to a working, tested local app.",
    "Actual CODEX_LOG.md and Git history · no fabricated build evidence",
  );
  const log = await readFile("CODEX_LOG.md", "utf8");
  const history = execFileSync("git", ["log", "--oneline", "-5"], {
    encoding: "utf8",
  });
  await page.evaluate(
    ({ log, history }) => {
      document.querySelector("#code").style.display = "block";
      document.querySelector("#codeText").textContent = history + "\n\n" + log;
    },
    { log, history },
  );
  await at(
    127,
    "09 / BUILT WITH CODEX",
    "Codex built the persona engine, UI, Twitch adapter, voice paths, and tests.",
  );
  await page.evaluate(() => {
    const pre = document.querySelector("#codeText");
    pre.style.transition = "transform 12s linear";
    pre.style.transform = "translateY(-1050px)";
  });
  await at(
    139,
    "09 / VERIFIED HONESTLY",
    "Five tests and a real browser smoke flow. Live integrations remain a separate check.",
  );
  await at(
    145,
    "10 / THE SHOW GOES ON",
    "Your channel. Your culture. An extra voice.",
    "Understudy · Codex × TwitchCon 2026 · github.com/AaronGrace978/understudy",
  );
  await page.evaluate(
    () => (document.querySelector("#code").style.display = "none"),
  );
  await at(
    150,
    "10 / THE SHOW GOES ON",
    "Your channel. Your culture. An extra voice.",
    "Understudy · Codex × TwitchCon 2026 · github.com/AaronGrace978/understudy",
  );
  assert.deepEqual(errors, []);
  const final = await (await fetch(base + "/api/state")).json();
  assert.equal(final.provider, "mock");
  assert.equal(final.twitch, "disconnected");
  assert.equal(final.mode, "stopped");
  assert.equal(final.history.filter((x) => x.kind === "bot").length > 5, true);
  await context.close();
  context = null;
  await video.saveAs("test-results/demo/source.webm");
  await writeFile(
    "test-results/demo/verification.json",
    JSON.stringify(
      {
        width: 1920,
        height: 1080,
        plannedDuration: 150,
        provider: final.provider,
        twitch: final.twitch,
        mode: final.mode,
        browserErrors: errors,
        botMessages: final.history.filter((x) => x.kind === "bot").length,
      },
      null,
      2,
    ),
  );
  console.log("Recording saved: test-results/demo/source.webm");
} finally {
  await context?.close();
  await browser?.close();
  server.kill();
  await rm(scratch, { recursive: true, force: true });
}
