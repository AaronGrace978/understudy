# Understudy

## Elevator pitch

An openly AI Twitch co-host that knows your channel's running jokes, riffs alongside you, and keeps chat company when you step away. Your channel. Your culture. An extra voice.

## Inspiration

A stream is more than its gameplay. It's the catchphrases, tiny rituals, and regulars who make the room feel familiar. But the streamer has to carry that room while also playing, producing, and moderating. Even a short break can stop the conversation.

We wanted a co-host with a clearly separate identity and a shared understanding of the channel. The goal is to give streamers a little breathing room and viewers something to participate in.

## What it does

Understudy turns streamer-authored notes and pasted clip transcripts into a channel profile: tone, catchphrases, recurring bits, stream facts, and boundaries.

In co-host mode it reacts to mentions and streamer push-to-talk transcripts, answers stream questions, and suggests segments. In stand-in mode, activated manually or after an idle timer, it announces that it is an AI standing in for the streamer and keeps chat company. A segment desk runs per-viewer polls and queues familiar bits. A transparent OBS browser overlay displays an original animated PNG-tuber, captions, and speech states.

The streamer can stop it from the control room. On Twitch, moderators and the broadcaster can use `!understudy stop`. The bot uses its own account and never needs to impersonate the human.

## How we built it

**Codex was the implementation partner throughout the build.** Starting from a README-only repository, Codex scaffolded the Node/TypeScript server, compiled channel profiles into guarded system prompts, implemented the browser control room and OBS overlay, authored the PNG avatar assets, wired tmi.js and optional model/voice providers, and wrote the validation and submission materials. `CODEX_LOG.md` records the actual brief, follow-up approval, design decisions, and verification. Git history shows the milestones.

We built mock-first so the whole experience runs with `npm i && npm run dev`, without accounts or API charges. Real chat uses tmi.js with server-side bot credentials. Generation supports a local OpenAI-compatible endpoint or optional paid OpenAI calls. Speech uses browser synthesis with an optional OpenAI TTS adapter; transcription uses browser recognition or optional OpenAI audio transcription. The default demo is explicitly labeled as mock.

A single local HTTP server serves both browser surfaces. Server-sent events synchronize mode, captions, emotion, and actual speech playback state, including an OBS browser process that does not share browser storage with the control room. Persona JSON persists locally; tokens never go to browser code.

## Challenges we ran into

- **Shared channel culture without identity confusion:** we separated a streamer-curated profile from the AI's identity and built disclosure into takeover and Twitch connection.
- **Stopping safely across asynchronous work:** a response can finish after a streamer presses Stop. Generation epochs invalidate that late output; a delayed HTTP-model integration test exercises the race.
- **Voice across two browser processes:** OBS cannot rely on the control room's localStorage or BroadcastChannel. Speech configuration and playback events therefore travel through the server.
- **A demo that doesn't require secrets:** deterministic mock chat and model replies make the core interaction reviewable without Twitch or paid APIs.

## Accomplishments that we're proud of

A complete local control-room workflow, an original PNG-tuber overlay, explicit AI takeover, per-viewer chat voting, profile editing, browser and optional API voice paths, and an authenticated moderator-command boundary. Automated checks cover profile safety, moderator authorization, model-adapter HTTP behavior, stopping pending output, and the browser demo flow.

The current evidence uses mock chat and a local HTTP model fixture. Live Twitch login, paid OpenAI calls, physical microphone/audio capture, and OBS playback need verification with the submitter's accounts and recording machine; we do not present them as already validated.

## What we learned

A good AI co-host needs restraint as much as personality: a bounded persona, intentional triggers, legible status, and a dependable way to stop. Building the no-credentials demo first also made it easier to distinguish product behavior from integration setup problems.

## What's next

Channel-specific poll authoring, stronger moderation and adversarial evaluation, controlled import of streamer-approved transcripts, broader voice-provider adapters, and live tests with streamers and their moderators. We would measure whether breaks feel better for communities rather than assume retention gains.

## Built with

OpenAI Codex, TypeScript, Node.js, Express, tmi.js, Twitch IRC, Server-Sent Events, HTML, CSS, JavaScript, Web Speech API, MediaRecorder, optional OpenAI API, optional Ollama/OpenAI-compatible local models, Playwright, Pillow (asset authoring).

## Submission fields to complete

- Repository: https://github.com/AaronGrace978/understudy
- Demo video: **add the public three-minute recording URL**
- Screenshots: `docs/control-room.png` and `docs/overlay.png`
- Event deadline from the supplied brief: **November 2, 2026, 5:00 PM ET**; verify on Devpost.
- Review the event's eligibility and disclosure requirements and publish the entry manually. This file is submission copy, not a submitted entry.
