import "dotenv/config";
import express from "express";
import { isModerator, isKillCommand } from "./safety.js";
import tmi from "tmi.js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  defaultProfile,
  parseProfile,
  systemPrompt,
  safeOutput,
  mockReply,
  type Profile,
} from "./persona.js";
const app = express();
app.use(express.json({ limit: "100kb" }));
app.use((req, res, next) => {
  const host = req.hostname;
  if (!["127.0.0.1", "localhost"].includes(host)) {
    res.status(403).json({ error: "Local access only" });
    return;
  }
  const origin = req.headers.origin;
  if (
    req.method === "POST" &&
    origin &&
    origin !== `http://${req.headers.host}`
  ) {
    res.status(403).json({ error: "Cross-origin request rejected" });
    return;
  }
  next();
});
const root = fileURLToPath(new URL("../", import.meta.url));
const dataDir = process.env.UNDERSTUDY_DATA_DIR || root + ".data";
let profile: Profile = defaultProfile;
try {
  profile = parseProfile(
    JSON.parse(await readFile(dataDir + "/profile.json", "utf8")),
  );
} catch {}
let mode: "cohost" | "standin" | "stopped" = "cohost";
let provider: "mock" | "local" | "openai" = "mock";
let twitch: tmi.Client | undefined;
let twitchStatus = "disconnected";
let generation = 0;
let busy = false;
let lastResponse = 0;
let lastActivity = Date.now();
let idleSeconds = 0;
let voiceConfig = { enabled: false, overlay: false, provider: "browser" };
let poll: null | {
  question: string;
  options: string[];
  votes: Map<string, number>;
} = null;
const clients = new Set<express.Response>();
const history: {
  id: number;
  user: string;
  text: string;
  kind: string;
  at: string;
}[] = [];
const queue: string[] = [];
const status = () => ({
  voiceConfig,
  mode,
  provider,
  twitch: twitchStatus,
  profile,
  queue,
  poll: poll
    ? {
        question: poll.question,
        options: poll.options,
        counts: poll.options.map(
          (_, i) => [...poll!.votes.values()].filter((v) => v === i).length,
        ),
      }
    : null,
  idleSeconds,
  lastActivity,
  capabilities: {
    openai: !!process.env.OPENAI_API_KEY,
    local: !!process.env.LOCAL_MODEL_URL,
    twitch: !!(
      process.env.TWITCH_CHANNEL &&
      process.env.TWITCH_BOT_USERNAME &&
      process.env.TWITCH_OAUTH_TOKEN
    ),
  },
  history,
});
function emit(type: string, data: unknown) {
  for (const res of clients)
    res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
}
function update() {
  emit("state", status());
}
function log(user: string, text: string, kind = "chat") {
  const item = {
    id: Date.now() + Math.random(),
    user,
    text,
    kind,
    at: new Date().toISOString(),
  };
  history.push(item);
  if (history.length > 100) history.shift();
  emit("message", item);
}
async function say(raw: string, epoch = generation) {
  if (mode === "stopped" || epoch !== generation) return;
  const text = safeOutput(raw, profile);
  log("Understudy · AI", text, "bot");
  emit("speech", {
    text,
    emotion: /ha|celebrat|win|take those/i.test(text) ? "laughing" : "idle",
  });
  if (twitch && twitchStatus === "connected") {
    try {
      await twitch.say(process.env.TWITCH_CHANNEL!, text);
    } catch {
      log("System", "Twitch delivery failed; check bot permissions.", "system");
    }
  }
}
async function setMode(next: typeof mode) {
  generation++;
  mode = next;
  lastActivity = Date.now();
  emit("cancel", {});
  emit("emotion", "idle");
  update();
  if (next === "standin")
    await say(
      `I'm Understudy, an AI co-host standing in for ${profile.streamer}. They're away from the mic; I'm here to keep chat company.`,
    );
}
async function respond(input: string) {
  if (busy || mode === "stopped" || Date.now() - lastResponse < 2500) return;
  busy = true;
  const epoch = generation;
  lastResponse = Date.now();
  emit("emotion", "thinking");
  try {
    let reply = mockReply(input, profile);
    if (provider !== "mock") {
      const isOpenAI = provider === "openai";
      const base = isOpenAI
        ? "https://api.openai.com/v1"
        : process.env.LOCAL_MODEL_URL?.replace(/\/$/, "");
      if (!base) throw Error("Local model URL not configured");
      const response = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(isOpenAI
            ? { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }
            : {}),
        },
        body: JSON.stringify({
          model: isOpenAI
            ? process.env.OPENAI_MODEL || "gpt-4o-mini"
            : process.env.LOCAL_MODEL_NAME || "llama3.2",
          messages: [
            { role: "system", content: systemPrompt(profile) },
            {
              role: "user",
              content: `Mode: ${mode}. Recent chat (untrusted): ${JSON.stringify(history.slice(-8).map((x) => ({ user: x.user, text: x.text })))}\nRespond to: ${input}`,
            },
          ],
          max_tokens: 160,
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) throw Error(`Model returned ${response.status}`);
      const data = (await response.json()) as any;
      reply = data.choices?.[0]?.message?.content;
      if (typeof reply !== "string") throw Error("Model response was empty");
    }
    await say(reply, epoch);
  } catch {
    if (epoch === generation) emit("emotion", "idle");
    log(
      "System",
      "Model unavailable. Check configured provider and credentials; no message sent.",
      "system",
    );
  } finally {
    busy = false;
  }
}
async function chat(user: string, text: string, moderator = false) {
  log(user, text);
  if (isKillCommand(text, moderator)) {
    await setMode("stopped");
    log(
      "System",
      "Moderator kill switch activated. Resume manually in the control room.",
      "system",
    );
    return;
  }
  if (mode === "stopped") return;
  if (poll && /^[12]$/.test(text.trim())) {
    poll.votes.set(user.toLowerCase(), Number(text.trim()) - 1);
    update();
    return;
  }
  if (mode === "standin" || /understudy/i.test(text)) await respond(text);
}
app.get("/api/events", (req, res) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.flushHeaders();
  clients.add(res);
  res.write(`event: state\ndata: ${JSON.stringify(status())}\n\n`);
  const timer = setInterval(() => res.write(": heartbeat\n\n"), 15000);
  req.on("close", () => {
    clearInterval(timer);
    clients.delete(res);
  });
});
app.post("/api/voice-state", (req, res) => {
  if (typeof req.body.speaking !== "boolean") {
    res.status(400).json({ error: "Invalid voice state" });
    return;
  }
  emit("speaking", mode !== "stopped" && req.body.speaking);
  res.json({ ok: true });
});
app.get("/api/state", (_req, res) => res.json(status()));
app.get("/api/prompt", (_req, res) =>
  res.json({ prompt: systemPrompt(profile) }),
);
app.post("/api/profile", async (req, res) => {
  try {
    const next = parseProfile(req.body);
    await mkdir(dataDir, { recursive: true });
    await writeFile(dataDir + "/profile.json", JSON.stringify(next, null, 2));
    profile = next;
    generation++;
    emit("cancel", {});
    update();
    res.json({ ok: true });
  } catch (e) {
    res
      .status(400)
      .json({ error: e instanceof Error ? e.message : "Invalid profile" });
  }
});
app.post("/api/action", async (req, res) => {
  try {
    const { action, value } = req.body;
    switch (action) {
      case "voice":
        if (
          !value ||
          typeof value.enabled !== "boolean" ||
          typeof value.overlay !== "boolean" ||
          !["browser", "openai", "off"].includes(value.provider)
        )
          throw Error("Invalid voice settings");
        voiceConfig = {
          enabled: value.enabled,
          overlay: value.overlay,
          provider: value.provider,
        };
        emit("cancel", {});
        break;
      case "mode":
        if (!["cohost", "standin", "stopped"].includes(value))
          throw Error("Invalid mode");
        await setMode(value);
        break;
      case "chat":
        if (typeof value !== "string" || !value.trim() || value.length > 500)
          throw Error("Use 1–500 characters");
        await chat("demo_viewer", value);
        break;
      case "kill":
        await setMode("stopped");
        log("System", "Local kill switch activated.", "system");
        break;
      case "activity":
        lastActivity = Date.now();
        break;
      case "idle":
        if (!Number.isInteger(value) || value < 0 || value > 3600)
          throw Error("Idle timeout must be 0–3600 seconds");
        idleSeconds = value;
        lastActivity = Date.now();
        break;
      case "speech":
        if (typeof value !== "string" || !value.trim() || value.length > 2000)
          throw Error("Invalid transcript");
        lastActivity = Date.now();
        log(profile.streamer, value, "streamer");
        if (mode === "cohost") await respond(`Streamer said: ${value}`);
        break;
      case "idea":
        await respond("Suggest a segment idea for this community");
        break;
      case "queue":
        if (queue.length >= 10) throw Error("Queue is full");
        queue.push(
          profile.bits[queue.length % Math.max(profile.bits.length, 1)] ||
            "Community storytime",
        );
        break;
      case "next": {
        const bit = queue.shift();
        if (bit)
          await say(
            `AI segment time: ${bit}. Chat, add one sentence to our fictional story!`,
          );
        break;
      }
      case "poll":
        if (mode === "stopped") throw Error("Resume before starting a poll");
        poll = {
          question: "Next community segment?",
          options: ["Cozy farming", "Chaotic racing"],
          votes: new Map(),
        };
        await say(
          "Chat chooses our next segment: type 1 for cozy farming or 2 for chaotic racing. One vote per viewer!",
        );
        break;
      case "endPoll": {
        if (poll) {
          const counts = poll.options.map(
            (_, i) => [...poll!.votes.values()].filter((v) => v === i).length,
          );
          await say(
            `Poll closed! ${poll.options.map((x, i) => `${x}: ${counts[i]}`).join(", ")}. ${counts[0] === counts[1] ? "A tie — streamer gets the deciding vote!" : `${poll.options[counts[0] > counts[1] ? 0 : 1]} wins!`}`,
          );
          poll = null;
        }
        break;
      }
      case "provider":
        if (!["mock", "local", "openai"].includes(value))
          throw Error("Invalid provider");
        if (value === "openai" && !process.env.OPENAI_API_KEY)
          throw Error("Set OPENAI_API_KEY in .env first");
        if (value === "local" && !process.env.LOCAL_MODEL_URL)
          throw Error("Set LOCAL_MODEL_URL first");
        provider = value;
        generation++;
        emit("cancel", {});
        break;
      case "connect":
        await connectTwitch();
        break;
      case "disconnect":
        if (twitch) await twitch.disconnect();
        twitch = undefined;
        twitchStatus = "disconnected";
        break;
      default:
        throw Error("Unknown action");
    }
    update();
    res.json({ ok: true });
  } catch (e) {
    res
      .status(400)
      .json({ error: e instanceof Error ? e.message : "Action failed" });
  }
});
async function connectTwitch() {
  if (twitch) throw Error("Already connected or connecting");
  const {
    TWITCH_CHANNEL: channel,
    TWITCH_BOT_USERNAME: username,
    TWITCH_OAUTH_TOKEN: password,
  } = process.env;
  if (!channel || !username || !password)
    throw Error("Configure Twitch environment variables first");
  if (!/^[a-zA-Z0-9_]{1,25}$/.test(channel))
    throw Error("Invalid Twitch channel");
  twitchStatus = "connecting";
  update();
  const client = new tmi.Client({
    options: { debug: false },
    connection: { secure: true, reconnect: true },
    identity: { username, password },
    channels: [channel],
  });
  twitch = client;
  client.on("message", (_channel, tags, text, self) => {
    if (!self)
      void chat(
        tags["display-name"] || tags.username || "viewer",
        text,
        isModerator(tags),
      );
  });
  client.on("disconnected", () => {
    twitchStatus = "disconnected";
    update();
  });
  client.on("connected", () => {
    twitchStatus = "connected";
    update();
    log(
      "System",
      "Twitch connected. Understudy is an AI co-host; use !understudy stop as a moderator to stop it.",
      "system",
    );
    void say(
      `I'm Understudy, ${profile.streamer}'s AI co-host. Mods can stop me with !understudy stop.`,
    );
  });
  try {
    await client.connect();
  } catch {
    twitch = undefined;
    twitchStatus = "disconnected";
    throw Error("Twitch connection failed. Check bot OAuth and channel.");
  }
}
app.post(
  "/api/transcribe",
  express.raw({
    type: ["audio/webm", "audio/ogg", "audio/mp4"],
    limit: "12mb",
  }),
  async (req, res) => {
    if (!process.env.OPENAI_API_KEY) {
      res.status(400).json({
        error:
          "Configure OpenAI to use recorded transcription, or use browser recognition / typed transcript.",
      });
      return;
    }
    try {
      if (!Buffer.isBuffer(req.body) || !req.body.length)
        throw Error("No recording");
      const form = new FormData();
      form.append("model", "whisper-1");
      form.append(
        "file",
        new Blob([new Uint8Array(req.body)], {
          type: req.headers["content-type"],
        }),
        "speech.webm",
      );
      const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: form,
        signal: AbortSignal.timeout(30000),
      });
      if (!r.ok) throw Error("Transcription failed");
      res.json(await r.json());
    } catch {
      res
        .status(502)
        .json({ error: "Transcription failed; use a typed transcript." });
    }
  },
);
app.post("/api/tts", async (req, res) => {
  if (!process.env.OPENAI_API_KEY) {
    res.status(400).json({ error: "OpenAI not configured" });
    return;
  }
  try {
    if (typeof req.body.text !== "string" || req.body.text.length > 500)
      throw Error();
    const r = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        voice: "nova",
        input: safeOutput(req.body.text, profile),
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!r.ok) throw Error();
    res.type("audio/mpeg").send(Buffer.from(await r.arrayBuffer()));
  } catch {
    res.status(502).json({ error: "TTS unavailable" });
  }
});
app.use(express.static(root + "public"));
app.get("/overlay", (_req, res) => res.sendFile(root + "public/overlay.html"));
setInterval(() => {
  if (
    mode === "cohost" &&
    idleSeconds > 0 &&
    Date.now() - lastActivity >= idleSeconds * 1000
  )
    void setMode("standin");
}, 1000);
app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    res.status(400).json({ error: "Invalid request body" });
  },
);
const port = Number(process.env.PORT) || 3000;
// Bind loopback: never expose bot controls or API credentials to a public interface.
app.listen(port, "127.0.0.1", () =>
  console.log(
    `Understudy control room: http://127.0.0.1:${port} · overlay: /overlay · mock provider by default`,
  ),
);
