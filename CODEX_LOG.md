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
