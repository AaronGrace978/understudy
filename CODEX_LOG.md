# Codex build log

This log records actual work in this repository; it does not claim human prompts or features that did not happen.

## 2026-10-29 — environment and product brief

- User prompt: set up the cloud environment, then build “Understudy” for Codex x TwitchCon with a mock-first MVP, Twitch chat, channel persona, stand-in/co-host modes, voice, OBS overlay, safety, and submission assets.
- Codex inspected the initial README-only repository and verified GitHub access and available Node tooling.
- Decision: one Node/TypeScript process serves an unbundled browser control room and overlay; server-sent events synchronize both. No database or build step is necessary for the local demo.
- Decision: ship a deterministic, clearly labeled mock provider first. Ask the user before adding paid API integrations. A free local model adapter can support real generation without introducing paid services.
- Codex scaffolded dependency management, strict TypeScript, validated channel-profile types, prompt compilation, output filtering, and secret exclusions.

## 2026-10-29 — control room and integrations

- User approved optional paid OpenAI integration via the clarification “Yes, add optional OpenAI integration.” No paid calls have been made during development.
- Codex built the browser control room, channel-DNA editor, segment queue, voting, keyboard takeover, idle detection, microphone/typed-transcript input, and voice routing.
- Codex authored original transparent PNG avatar states with a reproducible Pillow drawing script. The runtime uses the checked-in PNGs, with speech-start/end-driven mouth animation.
- Codex wired tmi.js using environment-only bot credentials, OpenAI-compatible local generation, optional OpenAI generation/transcription/TTS, and browser voice fallback.
- Decisions: localhost-only binding and same-origin mutation checks; model output is invalidated on stop/mode/profile/provider changes; only Twitch moderator/broadcaster tags authorize the chat kill switch.
- Validation added: persona safety/validation, moderator-command authorization, full server workflow, real HTTP local-model fixture, and cancellation of a delayed model response.

## 2026-10-29 — validation and submission kit

- Codex ran the strict TypeScript check and five Node tests: all passed. The integration test starts a real local HTTP model fixture; it verifies profile persistence, takeover disclosure, poll vote replacement and tally, queue execution, local-model response parsing, cross-origin rejection, idle takeover, and late-response suppression after Stop.
- Codex ran Chromium UI validation: profile save, mock reply, Alt+A takeover, captions in a separate browser context, voting, queueing, kill/paused overlay, and a 390px mobile layout without horizontal overflow. No browser page errors were observed.
- Initial browser test failed because Playwright's implicit single-page context cannot create a second page; Codex corrected the test to use explicit contexts. The optional browser download was denied by network policy, so validation used the already installed system Chromium, without bypassing policy.
- Formatting caught malformed voice-select HTML; Codex corrected the options and reran the checks.
- Codex identified that OBS has separate browser storage, replaced storage-only voice settings with server state, and synchronized playback events via HTTP/SSE. Browser checks use a separate overlay context to preserve this boundary.
- Codex captured actual control-room/transparent-overlay screenshots and wrote README setup/architecture/limitations, the three-minute demo beat sheet, Devpost copy, and MIT licensing.
- Evidence boundaries: no live Twitch account, paid OpenAI call, downloaded local model, physical microphone, or OBS application was exercised. Browser speech animation is implemented using playback events; real audio output should be checked on the recording machine.

## 2026-10-29 — reproducibility and handoff

- A clean `npm ci --no-audit --no-fund` completed, followed by successful TypeScript, formatting, all five tests, and a fresh browser-smoke run after restarting the development server.
- Saved cloud `install_script` and `start_skill` draft fields for the user to review and publish. Saving a draft is not publication or validation of a fresh task.
- Remaining submission work: provide real integration credentials for a live smoke test, record/upload the demo, complete the video URL in Devpost, and publish the entry before the supplied deadline. No paid API calls or external submission actions were performed.

## 2026-10-29 — generated mock-only demo video

- User prompt: generate a roughly 2½-minute demo with Playwright `recordVideo`, control room and overlay side by side at 1920×1080, realistic mock chat, polling, catchphrases, laughter, Alt+A takeover, a pan over this log, MP4 conversion, and commit/push to main. Mock data only; no paid API calls.
- Codex added a reproducible recording script that starts an isolated server with `.env` loading disabled and external provider credentials blank. Editorial captions label the footage as mock; all in-app replies, polls, and state changes come from the running app.
- Added validated named simulated viewers to the existing local mock-chat action, preserving string input compatibility. Simulated viewer payloads never carry Twitch moderator privileges. Expanded the HTTP integration test to check separate votes, invalid names, and forged moderator flags.
- Adjusted takeover wording to begin “I'm Understudy, standing in for Nova,” followed immediately by the AI disclosure. No identity or safety requirement was removed.
- The recording is silent with on-screen narrative captions; no synthetic narration or microphone claim is made. The Codex section shows actual log contents and Git history.
- Final artifact verified with ffprobe: `docs/demo.mp4`, H.264, 1920×1080, 25 fps, 151.64 seconds, 12,303,119 bytes. Full MP4 decode completed without errors. Representative co-host, takeover, and build-log frames were visually inspected.
- Recording verification: mock provider, Twitch disconnected, ten bot messages, stopped at the end, and zero browser page errors. TypeScript, formatting, and all five tests passed after the mock-viewer changes. No paid API or microphone call was made.
