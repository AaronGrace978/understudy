# Codex build log

This log records actual work in this repository; it does not claim human prompts or features that did not happen.

## 2026-10-29 — environment and product brief
- User prompt: set up the cloud environment, then build “Understudy” for Codex x TwitchCon with a mock-first MVP, Twitch chat, channel persona, stand-in/co-host modes, voice, OBS overlay, safety, and submission assets.
- Codex inspected the initial README-only repository and verified GitHub access and available Node tooling.
- Decision: one Node/TypeScript process serves an unbundled browser control room and overlay; server-sent events synchronize both. No database or build step is necessary for the local demo.
- Decision: ship a deterministic, clearly labeled mock provider first. Ask the user before adding paid API integrations. A free local model adapter can support real generation without introducing paid services.
- Codex scaffolded dependency management, strict TypeScript, validated channel-profile types, prompt compilation, output filtering, and secret exclusions.
