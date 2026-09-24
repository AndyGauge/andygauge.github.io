---
layout: post
section-type: post
title: "rewriter-queue v0.2.0: Autonomous Code Changes, From Your Editor"
tags: [ '2026', 'rust', 'llm', 'agents', 'open-source' ]
---

**TL;DR** — [rewriter-queue](https://github.com/AndyGauge/rewriter-queue) is my working answer to the question "what does it actually take to let LLM agents change code on their own, safely?" You hand it a source tree and a mission, and a small organization of single-purpose agents writes a contract, a test matrix, and a schema, then implements, reviews, and iterates, checkpointing every call, until the compiler and the reviewers are satisfied. You drive it from a terminal, from Zed's agent panel, or from Claude Code. [v0.2.0](https://github.com/AndyGauge/rewriter-queue/releases/tag/v0.2.0) adds two things: milestones that don't depend on each other now run in parallel, and provider routing no longer lets one bad moment bench a backend for the rest of a run.

## What it's for

Most "autonomous coding" demos show an agent writing code. The hard part is everything around the code: deciding what "done" means before anything is written, keeping the agent from drifting off the mission, knowing which objections should block a change and which are just opinions, and not losing an hour of work when the process dies. rewriter-queue is meant to show one concrete way to do all of that, in code you can read and change, running against models you host yourself.

A few principles hold the whole thing together:

- **The contract comes before the code.** Nothing is implemented until an agent has written down what the new version must do, and a second agent has checked that the contract is complete enough to build from.
- **Only the compiler blocks.** `cargo build`, `clippy`, and `test` failures feed back into the retry loop. The LLM reviewers and the [ast-grep](https://ast-grep.github.io/) lint rules are recorded in `deviations.md` and never block, because a persona's opinion can't reliably tell a real problem from a justified exception the way a compiler error can.
- **Patch before rewrite.** When the quality gate fails, the implementer is asked for a minimal SEARCH/REPLACE patch first. If the patch doesn't apply cleanly, it falls back to a full regeneration instead of guessing. On a small local model, that difference is most of the runtime.
- **Every agent call is a checkpoint.** A crash or restart replays everything already done instantly and redoes only the step it was on.

It's not a hosted service. It's three small Rust binaries — the queue, the orchestrator, and the provider router — pointed at any OpenAI-compatible endpoint. Mine is the [GB10 box running llama.cpp](/2026/09/21/two-backends-one-unified-memory-pool.html).

## The agents

Each agent is a plain markdown file in [`skills/`](https://github.com/AndyGauge/rewriter-queue/tree/master/skills), compiled into the orchestrator with `include_str!`. To change how an agent behaves, you edit the skill, not the Rust. Every one has a strict verdict format and an explicit list of what it does *not* review, so their responsibilities don't overlap.

**Understanding the problem**
- **MissionArchitect** reads the source and the mission and writes an `ObjectiveContract`: the public API, the behaviors that must be preserved, edge cases, and deviations it noticed but must not "fix."
- **ContractReviewer** checks that contract for completeness. Could an implementer build from it alone?
- **TestEngineer** turns the contract into a test matrix with concrete inputs and expected outputs.
- **InductiveReasoner** looks at the original code as a whole system rather than function by function, to surface invariants no single function shows.
- **SchemaArchitect** designs the types and function signatures, with `todo!()` bodies.

**Building it**
- **MilestonePlanner** splits the work into milestones small enough to fit the iteration budget. Anything it would call HARD has to be split further.
- **TargetImplementer** fills in the stubs, one milestone at a time.
- **MergeAgent** combines partial implementations when the input is too big to handle as one piece.

**Reviewing it**
- **SecurityReviewer** checks parity with the contract: every test branch handled, no new panics, no regressions in complexity or performance.
- **MaintenanceReviewer** is written as a mid-level engineer with two years of experience who has to fix this code at 9pm on a Friday. Clever macros and long iterator chains get rejected.
- **ProductionReadinessReviewer** is the on-call engineer three weeks after launch: unbounded channels, locks held across `.await`, and `.unwrap()` on the hot path.
- **FormalMethodsReviewer** checks totality, determinism, error-contract fidelity, and termination against the original.
- **IpCounsel** flags verbatim copying, license compatibility, and known patent-encumbered algorithms.

The security and maintenance reviewers run inside the implement loop on every iteration. The production-readiness, formal-methods, and IP reviewers run as a final panel. Their findings are all logged, and none of them can block on their own.

## Running it from Claude Code or Zed

The `rewriter-queue` binary is also an MCP server (`rewriter-queue mcp`) exposing the queue as tools: `queue_submit`, `queue_list`, `queue_status`, `queue_cancel`, `queue_fetch`, `queue_artifacts`, `queue_artifact`, and `queue_download`. That's what lets the whole thing run from inside an editor, in plain language.

**In Zed**, [`zed-extension/`](https://github.com/AndyGauge/rewriter-queue/tree/master/zed-extension) is a real compiled extension (WASM, installed with `zed: install dev extension`) that registers the MCP server as a context server. Once it shows green, you ask the agent panel "submit a synthesis run for `./src` with a 20-iteration budget" or "download job 3's artifacts to `~/Desktop`," and it calls the right tool. Zed's `openai_compatible` provider can point at the same llama.cpp server the queue uses, so the chat model and the synthesis agents share one backend.

**In Claude Code**, [`claude-code-plugin/`](https://github.com/AndyGauge/rewriter-queue/tree/master/claude-code-plugin) packages the same MCP tools, plus every agent persona as a slash command:

```
/plugin marketplace add ./rewriter-queue/claude-code-plugin
/plugin install rewriter-queue@rewriter-queue-marketplace

/rewriter-queue:production-readiness-reviewer src/main.rs
```

Those slash commands are the same personas and verdict formats the pipeline uses, so you can get one focused `READY`/`NOT_READY` review of a file without running a whole synthesis job. The full pipeline is one "submit this" away, and the single reviewer is one command away.

The queue server can run on the GPU box and be reached over HTTP with a bearer token. If no `[queue] url` is configured, every command falls back to a local, file-backed queue. Jobs survive a server restart either way: an interrupted job is requeued and resumes from its last checkpoint.

## What's new in v0.2.0

### Milestones were a straight line

Earlier in this release cycle, the orchestrator started splitting a big implementation into checkpointed milestones instead of one all-or-nothing attempt: `MilestonePlanner` breaks the work into pieces it can call `RISK: EASY`, and each piece goes through the implement → review → quality-gate loop on its own. But they always ran one after another, in the order the planner wrote them. That was safe, and slow. A plan with a config loader, an HTTP client, and a report formatter that only share types the schema already defined still waited on each other for no reason.

### `DEPENDS_ON`, with a sequential default

The planner can now write one more line per milestone:

```
## MILESTONE: http-client
RISK: EASY
DEPENDS_ON: none
TASK: ...
```

There are three ways to write it, and the default is the one that keeps old behavior:

- **Leave it out.** The milestone depends on the one before it. A plan that never uses `DEPENDS_ON` schedules exactly the way v0.1 did, strictly in order.
- **`DEPENDS_ON: none`.** An explicit claim that this milestone needs nothing else in the plan beyond the schema's types.
- **`DEPENDS_ON: config-loader, http-client`.** Wait for exactly those, and nothing else.

The parser keeps "no line at all" (`None`) separate from "explicitly none" (`Some(vec![])`). Only the first one falls back to depending on the previous milestone. That difference is the whole feature: independence has to be stated, it's never assumed.

The skill prompt is blunt about when to use it. Two isolated workspaces that each pass their own quality gate prove nothing about whether the pieces fit together, so `none` should only appear when the separation is real: no shared file, and neither piece calls the other's code. When in doubt, stay sequential. Running in parallel only pays off for work that really is separable.

### Waves, via Kahn's algorithm

`schedule_waves` groups the plan in layers, the way Kahn's algorithm does a topological sort. Each pass collects every unscheduled milestone whose dependencies are all already scheduled, and that set becomes a wave. Nothing in a wave depends on anything else in the same wave, in either direction, so the whole wave can be built at once. The number of waves is the plan's critical path length, the longest chain that has to happen in order. It gets logged when the plan is made, so you can see how much the planner actually parallelized:

```
[milestones] 'impl': 4 milestone(s) scheduled into 3 wave(s) (critical path length 3): config-loader, http-client -> fetcher -> report
```

A dependency name that doesn't resolve, whether from a typo or a real cycle, can never be satisfied. Rather than deadlock, the scheduler force-schedules whatever is left one at a time, in plan order. A bad plan runs slower. It never hangs.

### Isolated workspaces for the fan-out

Running milestones concurrently in one crate directory would be a race: two `cargo build`s fighting over `target/`, one `clippy` run reading a half-written file from the other, and the quality gate's stale-file cleanup deleting a sibling's output. So when a wave has more than one milestone, each one gets its own build directory seeded with the current `Cargo.toml`, and they run on scoped threads (`std::thread::scope`). A single-milestone wave, which is still the common case, runs inline in the shared directory just like before.

The implement-or-split-or-escalate logic was pulled out into `implement_one_milestone`, so the same code runs whether a milestone is alone in its wave or one of several. The only thing that changes between the two is which workspace it writes to. Module declarations were already wired up mechanically after all milestones finish (in the commit just before this release), which is why parallel milestones don't collide by editing the same `lib.rs`.

### The provider that never came back

The other half of the release is in `inference-providers`, the registry that routes each request across whatever backends you've configured. Each provider gets a score: a weighted mix of cost, latency, and quality, plus a backoff penalty and a reliability penalty. The lowest score is tried first, and on a rate limit or error the request falls through to the next one.

Backoff spiked on a 429 (`×2 + 1`, capped at 64) and was cut in half on a *successful* call. That's the bug. Once a provider was backed off far enough to sort last, it only got called when every better provider failed first. On a healthy setup that almost never happens, so it never got the success it needed to recover. One bad burst of rate limits could effectively retire a backend for the rest of the run.

Backoff now decays with wall-clock time, with a 10-second half-life, whether or not the provider has been called since. A provider at the 64 cap is back under 1.0 in about a minute, with no success required. Successes still halve it on top of that.

### One failure is not a 100% error rate

The reliability penalty is `2^depth × error_rate`, where depth is how close a task is to the root of the work (roots are expensive to get wrong, so they get pushed toward reliable providers). Error rate was simply failures over samples. With one call that failed, that's 1.0, which adds a full point to the score even for a depth-0 task, and 8 points for a depth-3 root. That's a harsh verdict from one data point.

Now samples are weighted by age (30-second half-life), and the denominator has a floor of 5. A provider with fewer than five samples' worth of history is treated as if the missing ones were successes, so that same single failure reads as 0.2. A provider has to build a real track record, good or bad, before its error rate moves the score much.

### Seeing the router's decisions

Both bugs were hard to spot because the registry's view of its providers was invisible from outside. `Registry::snapshot()` now returns a `ProviderSnapshot` for each backend (p50 latency, decayed error rate, current backoff, quality score, and whether it passed the context probe), so you can watch routing decisions instead of just trusting them. The new `coin_live` example in `inference-providers/examples/` uses it to show live scoring against real backends, and the registry picked up about 600 lines of tests pinning down both fixes.

This matters more now that I'm running two local backends side by side. With more than one provider actually in play, a router that quietly benches one of them for the whole run is a real cost, not a theoretical one.

## Where it is

- [Release v0.2.0](https://github.com/AndyGauge/rewriter-queue/releases/tag/v0.2.0), with prebuilt binaries
- [Source on GitHub](https://github.com/AndyGauge/rewriter-queue)
- [Docs and tutorial](https://andygauge.github.io/rewriter-queue/)
