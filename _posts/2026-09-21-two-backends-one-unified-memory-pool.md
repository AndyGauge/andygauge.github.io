---
layout: post
section-type: post
title: Two Backends, One Unified Memory Pool
tags: [ '2026', 'rust', 'llm', 'agents', 'developer-experience' ]
---

**TL;DR** — The GB10 box that serves my [rust-lang design-review model](https://github.com/AndyGauge/rust-reviewer) has run exactly one inference backend at a time since I built it: vLLM for Qwen, or llama.cpp for Mistral, never both, because the "just switch it" script kills whichever one is up before starting the other. Adding [Devstral Small 2](https://mistral.ai/news/devstral-2-vibe-cli/) — Mistral's 24B model built specifically for agentic coding — didn't need that pattern. It needed a second, additive `llama-server` on its own port, sized carefully enough to sit in unified memory next to the model already running. The interesting part wasn't standing it up. It was the arithmetic that made "next to," not "instead of," the safe choice.

## The one-backend rule, and why it existed

Every model on this box shares one thing: 128 GB of unified memory on an NVIDIA GB10, no discrete VRAM to fall back on. Early on I learned the hard way that this pool doesn't forgive an aggressive loader — a vLLM attempt at a different large model triggered a kernel OOM-killer storm that took out unrelated desktop services, not just the model process. The fix that stuck was procedural: `switch-to-qwen.sh` and `switch-to-mistral.sh` each tear down the other's tmux session before starting their own. One backend owns port 8001. Full stop.

That rule was never really about the port number. It was about never letting two loaders fight over the same unified-memory pool without doing the math first. So when I wanted Devstral running alongside the Mistral-Small-119B GGUF that already owns 8001 — not instead of it, since I wanted to compare a huge general model against a small model purpose-built for agentic coding — the question wasn't "can two backends coexist," it was "does the math clear."

## Doing the math before the download

`free -m` on the box said 67.8 GB available out of 124.5 GB total, with Mistral's ~52 GB (weights plus KV cache at its 200k context) already resident. Devstral Small 2 is small enough — 24B dense parameters — that even a near-lossless Q8_0 quantization is only a 25.1 GB download. Weights were never the risk.

Context was. I wanted close to Devstral's full window, and at 232,000 tokens the KV cache math for a dense 24-billion-parameter model (40 layers, 8 KV heads, 128-dim heads) comes out to:

```
2 (K and V) × 40 layers × 8 kv_heads × 128 head_dim × 232,000 tokens × 2 bytes (f16)
≈ 35.4 GB
```

Weights plus a plain f16 cache would be ~60 GB on top of Mistral's ~52 GB — north of 112 GB used, leaving single digits of headroom on a box that's already shown it can cascade into an OOM storm when pushed. That's not a bet worth making for a baseline.

## Compressing the cache, not the ambition

The fix was quantizing the KV cache itself — a different knob than quantizing the model weights, and one I hadn't reached for before. `llama-server` supports `-ctk q8_0 -ctv q8_0`, which packs the cached keys and values into roughly a byte each instead of two, at the cost of requiring flash attention (`-fa on`) to dequantize on the fly. That took the cache from ~35 GB to ~19–20 GB — Devstral's whole footprint down to ~45 GB, for a combined ~97 GB alongside Mistral's ~52 GB, out of 124.5 GB usable. Comfortable, not tight.

The quality cost is worth being precise about, because it's easy to describe wrong. The quantization error on a cached token doesn't grow with age — a detail cached 200,000 tokens ago is quantized to the exact same precision as one cached ten tokens ago. What changes is whether anything nearby can compensate for that error. A recent detail is reinforced by everything the model just generated around it. A detail from deep in a long agentic session has to survive on that one quantized cache entry alone, with nothing nearby correcting it. So the error is uniform, but the consequence is concentrated on long-range recall — exactly the failure mode that would matter most for a coding agent trying to remember a variable name it read fifty thousand tokens back. That's the reason I picked Q8_0 over the more aggressive Q4_0: published perplexity deltas for Q8_0 KV caches are near zero, where Q4_0 starts showing up on needle-in-a-haystack benchmarks.  This was the kind of trade-off that I wanted, double the KV store in exchange for precision.

## The flags, and where they landed

The resulting `llama-server` invocation, in its own tmux session on port 8002 rather than fighting the existing switch scripts for 8001:

```sh
llama-server \
  -m Devstral-Small-2-24B-Instruct-2512-Q8_0.gguf \
  -a devstral \
  -ngl 999 \
  -c 232000 \
  -fa on \
  -ctk q8_0 -ctv q8_0 \
  --jinja \
  --host 0.0.0.0 --port 8002
```

`-ngl 999` offloads every layer to GPU — on unified memory there's no VRAM ceiling forcing a partial split. `--jinja` turns on the model's own chat template so tool-calling actually parses instead of falling back to a generic format. Nothing here is exotic; the only flags that took real thought were the three governing memory: `-c`, `-ctk`, and `-ctv`.

On the editor side, this became a second `openai_compatible` provider in Zed's settings rather than an addition to the existing one — different port, different base URL, same pattern the box already uses for Qwen and Mistral. Both backends now show up as pickable models, side by side, at the same time, for the first time on this box.

## What it actually unlocks

The point was never just "get Devstral running." It was being able to ask the same question of two very different models without a two-minute backend swap in between: does a 24B model built specifically for agentic software-engineering tasks out-navigate a 119B general-purpose MoE on real Rust work, when both are one keystroke away in the same editor? The one-backend rule is still the right default for this box — vLLM and llama.cpp still can't safely share a port, and I'm not touching that pattern. But "one backend at a time" was a proxy for "don't let two loaders fight blind," not a hard ceiling. Once the arithmetic is on paper, sharing the pool is just sizing.

Models optimized for agentic operations is exactly what the rewriter project needed, and having 2 models side by side with different capabilities appears to be running a lot faster than vLLM serving many simultanous requests.
