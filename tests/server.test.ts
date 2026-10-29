import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { createServer } from "node:http";
import { once } from "node:events";
import { defaultProfile } from "../src/persona.js";
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
test("local workflow: mock chat, takeover, votes, profile, provider, idle, cancellation", async (t) => {
  const dir = await mkdtemp(tmpdir() + "/understudy-test-");
  const fixture = createServer(async (req, res) => {
    await new Promise<void>((r) => {
      req.resume();
      req.on("end", r);
    });
    await pause(250);
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        choices: [
          {
            message: { content: "A local model response for the Save Squad." },
          },
        ],
      }),
    );
  });
  fixture.listen(0, "127.0.0.1");
  await once(fixture, "listening");
  const modelPort = (fixture.address() as any).port;
  const port = 3197;
  const child = spawn(process.execPath, ["--import", "tsx", "src/server.ts"], {
    env: {
      ...process.env,
      PORT: String(port),
      UNDERSTUDY_DATA_DIR: dir,
      OPENAI_API_KEY: "",
      TWITCH_CHANNEL: "",
      TWITCH_BOT_USERNAME: "",
      TWITCH_OAUTH_TOKEN: "",
      LOCAL_MODEL_URL: `http://127.0.0.1:${modelPort}`,
      LOCAL_MODEL_NAME: "test-fixture",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (x) => (output += x));
  child.stderr.on("data", (x) => (output += x));
  t.after(async () => {
    child.kill();
    fixture.close();
    await rm(dir, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(base + "/api/state")).ok) {
        ready = true;
        break;
      }
    } catch {}
    await pause(100);
  }
  assert.ok(ready, output);
  const state = async () =>
    (await (await fetch(base + "/api/state")).json()) as any;
  const post = async (path: string, body: unknown) =>
    fetch(base + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  const action = async (action: string, value?: unknown) => {
    const r = await post("/api/action", { action, value });
    assert.equal(r.status, 200, await r.text());
  };
  assert.equal((await state()).provider, "mock");
  assert.equal((await fetch(base + "/overlay")).status, 200);
  assert.equal(
    (await fetch(base + "/assets/thinking.png")).headers.get("content-type"),
    "image/png",
  );
  await action("chat", "Understudy, who are you?");
  assert.match((await state()).history.at(-1).text, /AI co-host/);
  await action("mode", "standin");
  assert.match((await state()).history.at(-1).text, /standing in for Nova/);
  await action("poll");
  await action("chat", "1");
  await action("chat", "2");
  assert.deepEqual((await state()).poll.counts, [0, 1]);
  await action("endPoll");
  assert.equal((await state()).poll, null);
  assert.match((await state()).history.at(-1).text, /Chaotic racing wins/);
  await action("queue");
  assert.equal((await state()).queue.length, 1);
  await action("next");
  assert.equal((await state()).queue.length, 0);
  assert.match((await state()).history.at(-1).text, /fictional story/);
  const profile = {
    ...defaultProfile,
    streamer: "Test host",
    notes: "A custom community",
  };
  assert.equal((await post("/api/profile", profile)).status, 200);
  assert.equal(
    JSON.parse(await readFile(dir + "/profile.json", "utf8")).streamer,
    "Test host",
  );
  assert.equal((await post("/api/profile", { streamer: "" })).status, 400);
  assert.equal((await state()).profile.streamer, "Test host");
  assert.equal(
    (await post("/api/action", { action: "provider", value: "openai" })).status,
    400,
  );
  const denied = await fetch(base + "/api/action", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://evil.example",
    },
    body: JSON.stringify({ action: "kill" }),
  });
  assert.equal(denied.status, 403);
  await action("provider", "local");
  await pause(2600);
  await action("idea");
  assert.match((await state()).history.at(-1).text, /local model response/);
  // Kill while a genuine HTTP model request is in flight: late output must not escape.
  await pause(2600);
  const pending = action("idea");
  await pause(90);
  await action("kill");
  await pending;
  const stopped = await state();
  assert.equal(stopped.mode, "stopped");
  assert.equal(stopped.history.at(-1).text, "Local kill switch activated.");
  const before = stopped.history.filter((x: any) => x.kind === "bot").length;
  await action("chat", "Understudy hello");
  assert.equal(
    (await state()).history.filter((x: any) => x.kind === "bot").length,
    before,
  );
  await action("mode", "cohost");
  await action("idle", 1);
  await pause(2100);
  assert.equal((await state()).mode, "standin");
  await action("idle", 0);
});
