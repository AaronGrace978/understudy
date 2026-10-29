# Understudy — three-minute demo

Target length: **3:00**. Record the working local app and overlay. Use the fictional Nova persona. Label mock chat/model footage on screen; do not imply a real Twitch session when using the demo provider.

Before recording: `npm i && npm run dev`, open the control room and `/overlay`, use the default profile, enable browser voice, test your audio capture, set idle automation to Manual only. Close duplicate voice tabs. If recording a real model, configure it and label the provider honestly. Never show `.env`, OAuth tokens, or API keys.

| Time      | Picture / action                                                                                                          | Voiceover                                                                                                                                                                                                                                                                                                                                          |
| --------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00–0:20 | Streamer's empty chair, then cut to control room                                                                          | “Every small streamer knows this moment: you step away, and the room goes quiet. Meet Understudy: an AI co-host that knows your channel's bits and is always honest about being AI.”                                                                                                                                                               |
| 0:20–0:45 | Edit Channel DNA: tone, catchphrases, no-go phrases, a pasted clip transcript; save                                       | “A community has its own language. Give Understudy your running jokes, stream facts, and boundaries. This is a profile you control, not a copy of your identity.”                                                                                                                                                                                  |
| 0:45–1:10 | Co-host mode: type or speak “Any ideas for our next segment?”; show reply and avatar                                      | “While I'm live, Understudy can riff on a push-to-talk transcript and suggest the next segment. Here we're using the free mock demo. Local models and optional OpenAI generation are wired behind the same persona.”                                                                                                                               |
| 1:10–1:35 | Press Alt+A; cut to overlay and AI disclosure                                                                             | “Now I step away. One shortcut puts Understudy in stand-in mode. The first thing it says is who it is: an AI co-host standing in for Nova. It never needs to pretend to be me.”                                                                                                                                                                    |
| 1:35–2:00 | Launch poll; send 1, then 2 to show the same viewer changing their vote; close it; queue/run a familiar bit               | “Chat can choose the next segment. Votes are per viewer; this local demo uses one simulated viewer. Then we can launch a familiar storytime prompt. It's an invitation to participate while the streamer takes a breath.”                                                                                                                          |
| 2:00–2:15 | Stop everything; overlay becomes paused. Show `!understudy stop` in README, clearly labeled live Twitch moderator command | “The human keeps control. Stop kills speech and discards pending replies. On Twitch, moderators and the broadcaster can stop the bot from chat too.”                                                                                                                                                                                               |
| 2:15–2:45 | CODEX_LOG, Git history, persona compiler, test run; reveal architecture diagram                                           | “Codex built the TypeScript service, profile compiler, Twitch adapter, control room, original PNG avatar assets, voice routing, and tests. We worked mock-first, then added provider boundaries. Codex also tested a delayed model response to prove that Stop prevents late output. The build log records the prompts, choices, and limitations.” |
| 2:45–3:00 | Return to control room and overlay, end title                                                                             | “Understudy gives the streamer room to breathe and the community a reason to stay in the conversation. Your channel. Your culture. An extra voice.”                                                                                                                                                                                                |

## Recording checklist

- Capture a real app session; no fabricated API responses or test results presented as live service evidence.
- Overlay captions must be readable at video resolution; crop into the app during each beat.
- Show a real microphone interaction only if it succeeds on the recording machine; otherwise explicitly use the typed-transcript fallback.
- Show the actual generated disclosure, not only a slide describing it.
- Give Codex evidence screen time: terminal `git log --oneline`, `npm test`, `CODEX_LOG.md`, and a source excerpt.
- If live Twitch or OpenAI is configured later, record a separate verified clip and update the build log. Do not claim it was validated by the current automated tests.
- Export, upload, and add the public video URL to Devpost before the deadline. Those publication steps remain manual.

## Generated 2½-minute cut

The recorded cut is [docs/demo.mp4](docs/demo.mp4). It is a captioned, silent browser demo at 1920×1080. It shows the real control room and `/overlay` side by side, using fictional viewers through the mock adapter. It does not depict a live Twitch connection or paid model output.

| Time      | Recorded beat                                                    |
| --------- | ---------------------------------------------------------------- |
| 0:00–0:20 | Hook and channel profile / pasted notes                          |
| 0:20–0:46 | Viewers arrive; profile-backed replies and laughing avatar       |
| 0:46–0:54 | Streamer typed transcript suggests a segment                     |
| 0:54–1:20 | Multiple viewers vote; one changes their vote; results announced |
| 1:20–1:43 | Actual Alt+A takeover, explicit AI disclosure, identity question |
| 1:43–2:01 | Signature storytime prompt, viewer participation, Stop           |
| 2:01–2:25 | Pan through actual `CODEX_LOG.md` and Git history                |
| 2:25–2:30 | Return to the app and closing tagline                            |

To reproduce on Linux with system Chromium and ffmpeg installed:

```sh
node scripts/record-demo.mjs
ffmpeg -y -i test-results/demo/source.webm -c:v libx264 -preset fast -crf 22 -pix_fmt yuv420p -movflags +faststart -an docs/demo.mp4
```

The recorder starts its own isolated server on port 3015 with `.env` loading disabled and Twitch, local model, and OpenAI credentials blank. It uses Playwright `recordVideo`, closes the context to finalize the WebM, and saves a verification report in ignored `test-results/demo/`. Set `CHROMIUM_PATH` and `FFMPEG_PATH` if your installed executables are elsewhere. The default server on port 3000 is unaffected. The raw WebM stays ignored; the MP4 is committed.
