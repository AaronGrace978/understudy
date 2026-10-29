import { Voice, animateAvatar } from "./voice.js";
const $ = (id) => document.getElementById(id);
let state;
let recording = false;
let recognition;
let recorder;
let stream;
let chunks = [];
let starting = false;
const bus = new BroadcastChannel("understudy-voice");
const avatar = animateAvatar($("avatar"), $("avatarWrap"));
const voice = new Voice((speaking) => {
  avatar.speaking(speaking);
  bus.postMessage({ speaking });
  fetch("/api/voice-state", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ speaking }),
  }).catch(() => {});
  $("emotionLabel").textContent = speaking
    ? "UNDERSTUDY IS SPEAKING"
    : "READY WHEN YOU ARE";
});
let toastTimer;
function toast(text) {
  $("toast").textContent = text;
  $("toast").style.display = "block";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($("toast").style.display = "none"), 6000);
}
async function request(path, body) {
  const r = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw Error(data.error || "Request failed");
  return data;
}
async function action(action, value) {
  try {
    return await request("/api/action", { action, value });
  } catch (e) {
    toast(e.message);
  }
}
function addMessage(m) {
  const row = document.createElement("div");
  row.className = `chat-line ${m.kind}`;
  const time = document.createElement("span");
  time.className = "chat-time";
  time.textContent = new Date(m.at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const name = document.createElement("strong");
  name.textContent = m.user;
  const text = document.createElement("span");
  text.textContent = m.text;
  row.append(time, name, text);
  $("chatFeed").append(row);
  while ($("chatFeed").children.length > 100) $("chatFeed").firstChild.remove();
  $("chatFeed").scrollTop = $("chatFeed").scrollHeight;
  $("chatCount").textContent = $("chatFeed").children.length;
}
function render(s) {
  state = s;
  if (s.voiceConfig) {
    $("voiceEnabled").checked = s.voiceConfig.enabled;
    $("overlayVoice").checked = s.voiceConfig.overlay;
    $("voiceProvider").value = s.voiceConfig.provider;
  }
  $("streamerName").textContent = s.profile.streamer;
  $("channelName").textContent = "@" + s.profile.channel;
  $("toneText").textContent = s.profile.tone;
  $("phrases").replaceChildren(
    ...s.profile.catchphrases.slice(0, 3).map((x) => {
      const span = document.createElement("span");
      span.className = "chip";
      span.textContent = "“" + x + "”";
      return span;
    }),
  );
  $("modeLabel").textContent =
    s.mode === "standin"
      ? "STANDING IN"
      : s.mode === "stopped"
        ? "STOPPED"
        : "CO-HOST";
  $("stageTitle").textContent =
    s.mode === "standin"
      ? "Away from the mic. Still in good company."
      : s.mode === "stopped"
        ? "Taking five. You’re in control."
        : "A little backup. A lot of personality.";
  document
    .querySelectorAll("[data-mode]")
    .forEach((b) => b.classList.toggle("selected", b.dataset.mode === s.mode));
  $("provider").value = s.provider;
  $("providerBadge").textContent =
    s.provider === "mock"
      ? "MOCK · NO API COST"
      : s.provider === "local"
        ? "LOCAL MODEL"
        : "OPENAI · PAID";
  $("twitchStatus").textContent = "Twitch: " + s.twitch;
  $("chatSource").textContent =
    s.twitch === "connected" ? "TWITCH + DEMO CHAT" : "DEMO CHAT";
  $("connect").disabled = s.twitch === "connected" || s.twitch === "connecting";
  $("disconnect").disabled = s.twitch === "disconnected";
  $("idle").value = String(s.idleSeconds);
  $("queueList").replaceChildren(
    ...s.queue.map((x, i) => {
      const div = document.createElement("div");
      div.textContent = `${String(i + 1).padStart(2, "0")} / ${x}`;
      return div;
    }),
  );
  $("next").disabled = !s.queue.length || s.mode === "stopped";
  $("pollBox").hidden = !s.poll;
  if (s.poll) {
    $("pollBox").replaceChildren();
    const title = document.createElement("strong");
    title.textContent = s.poll.question;
    $("pollBox").append(title);
    s.poll.options.forEach((x, i) => {
      const div = document.createElement("div");
      div.textContent = `${i + 1}. ${x} — ${s.poll.counts[i]} votes`;
      $("pollBox").append(div);
    });
    const b = document.createElement("button");
    b.textContent = "Close poll & announce";
    b.className = "secondary";
    b.onclick = () => action("endPoll");
    $("pollBox").append(b);
  }
  $("poll").disabled = !!s.poll || s.mode === "stopped";
  if (s.mode === "stopped") voice.cancel();
}
const events = new EventSource("/api/events");
let initial = true;
events.addEventListener("state", (e) => {
  const s = JSON.parse(e.data);
  render(s);
  if (initial) {
    s.history.forEach(addMessage);
    initial = false;
  }
});
events.onopen = () => {
  $("connection").textContent = "● LOCAL · CONNECTED";
};
events.onerror = () => {
  $("connection").textContent = "● RECONNECTING";
};
events.addEventListener("message", (e) => addMessage(JSON.parse(e.data)));
events.addEventListener("speech", (e) => {
  const data = JSON.parse(e.data);
  $("caption").textContent = "“" + data.text + "”";
  avatar.emotion(data.emotion);
  if ($("voiceEnabled").checked && !$("overlayVoice").checked)
    void voice.speak(data.text, $("voiceProvider").value);
  else if (!$("voiceEnabled").checked)
    toast("New reply · enable Voice output to hear it.");
});
events.addEventListener("emotion", (e) => {
  avatar.emotion(JSON.parse(e.data));
  $("emotionLabel").textContent =
    JSON.parse(e.data) === "thinking"
      ? "THINKING OF THE NEXT BIT…"
      : "READY WHEN YOU ARE";
});
events.addEventListener("speaking", (e) => avatar.speaking(JSON.parse(e.data)));
events.addEventListener("cancel", () => {
  voice.cancel();
  bus.postMessage({ cancel: true });
});
bus.onmessage = (e) => {
  if (typeof e.data.speaking === "boolean") avatar.speaking(e.data.speaking);
};
document
  .querySelectorAll("[data-mode]")
  .forEach((b) => (b.onclick = () => action("mode", b.dataset.mode)));
$("kill").onclick = () => {
  voice.cancel();
  action("kill");
};
document.addEventListener("keydown", (e) => {
  if (e.altKey && e.code === "KeyA" && !e.repeat) {
    e.preventDefault();
    action("mode", state?.mode === "standin" ? "cohost" : "standin");
  }
});
$("chatForm").onsubmit = (e) => {
  e.preventDefault();
  const value = $("chatText").value.trim();
  if (value) {
    action("chat", value);
    $("chatText").value = "";
  }
};
$("speechForm").onsubmit = (e) => {
  e.preventDefault();
  const value = $("speechText").value.trim();
  if (value) {
    action("speech", value);
    $("speechText").value = "";
  }
};
for (const [id, name] of Object.entries({
  poll: "poll",
  queueBit: "queue",
  next: "next",
  idea: "idea",
  activity: "activity",
  connect: "connect",
  disconnect: "disconnect",
}))
  $(id).onclick = () => action(name);
$("provider").onchange = async () => {
  await action("provider", $("provider").value);
  if (state) $("provider").value = state.provider;
};
$("idle").onchange = () => action("idle", Number($("idle").value));
function saveVoice() {
  voice.cancel();
  action("voice", {
    enabled: $("voiceEnabled").checked,
    overlay: $("overlayVoice").checked,
    provider: $("voiceProvider").value,
  });
}
for (const id of ["voiceEnabled", "overlayVoice", "voiceProvider"])
  $(id).onchange = saveVoice;
$("editProfile").onclick = () => {
  if (!state) return;
  for (const [k, v] of Object.entries(state.profile)) {
    const input = $("profileForm").elements.namedItem(k);
    if (input) input.value = Array.isArray(v) ? v.join("\n") : v;
  }
  $("profileDialog").showModal();
};
$("closeProfile").onclick = () => $("profileDialog").close();
$("profileForm").onsubmit = async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  for (const k of ["catchphrases", "bits", "doNotSay"])
    data[k] = data[k]
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);
  try {
    await request("/api/profile", data);
    $("profileDialog").close();
    toast("Channel DNA saved. Your next reply uses the new profile.");
  } catch (e) {
    toast(e.message);
  }
};
$("showPrompt").onclick = async () => {
  const r = await fetch("/api/prompt");
  $("promptPreview").textContent = (await r.json()).prompt;
  $("promptPreview").hidden = false;
};
async function startPTT() {
  if (recording || starting) return;
  starting = true;
  recording = true;
  $("ptt").classList.add("recording");
  $("ptt").textContent = "● Listening… release to send";
  try {
    const Recognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (Recognition) {
      recognition = new Recognition();
      recognition.lang = "en-US";
      recognition.interimResults = false;
      recognition.onresult = (e) => {
        const text = e.results[0][0].transcript;
        $("speechText").value = text;
        action("speech", text);
      };
      recognition.onerror = () =>
        toast(
          "Browser recognition unavailable. Try a typed transcript or configure OpenAI recording.",
        );
      recognition.onend = resetPTT;
      recognition.start();
    } else if (state?.capabilities.openai) {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!recording) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      chunks = [];
      recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        try {
          const blob = new Blob(chunks, { type: recorder.mimeType });
          const r = await fetch("/api/transcribe", {
            method: "POST",
            headers: { "Content-Type": recorder.mimeType.split(";")[0] },
            body: blob,
          });
          const data = await r.json();
          if (!r.ok) throw Error(data.error);
          $("speechText").value = data.text;
          await action("speech", data.text);
        } catch (e) {
          toast(e.message);
        }
        resetPTT();
      };
      recorder.start();
      setTimeout(stopPTT, 30000);
    } else {
      toast(
        "This browser has no speech recognition. Use a typed transcript or configure OpenAI in .env.",
      );
      resetPTT();
    }
  } catch {
    toast("Microphone access failed. Use the typed transcript field.");
    resetPTT();
  } finally {
    starting = false;
  }
}
function resetPTT() {
  recording = false;
  $("ptt").classList.remove("recording");
  $("ptt").textContent = "● Hold to talk";
}
function stopPTT() {
  if (!recording) return;
  recording = false;
  recognition?.stop();
  if (recorder?.state === "recording") recorder.stop();
  resetPTT();
}
$("ptt").onpointerdown = (e) => {
  e.preventDefault();
  $("ptt").setPointerCapture(e.pointerId);
  startPTT();
};
$("ptt").onpointerup = stopPTT;
$("ptt").onpointercancel = stopPTT;
$("ptt").onkeydown = (e) => {
  if ((e.code === "Space" || e.code === "Enter") && !e.repeat) {
    e.preventDefault();
    startPTT();
  }
};
$("ptt").onkeyup = (e) => {
  if (e.code === "Space" || e.code === "Enter") stopPTT();
};
window.addEventListener("blur", stopPTT);
