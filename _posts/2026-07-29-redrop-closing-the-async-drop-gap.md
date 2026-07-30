---
layout: post
section-type: post
title: redrop, Closing the Async Drop Gap
tags: [ '2026', 'rust', 'async', 'proc-macro', 'open-source', 'tutorial' ]
---

**TL;DR** — I built [redrop](https://crates.io/crates/redrop), a small library that closes one of the more annoying gaps in async Rust: `Drop::drop` is synchronous, so a value that needs `.await` to clean up properly has no sanctioned way to do it when it goes out of scope. Annotate the async cleanup method with `#[redrop::async_drop]` and the generated `Drop::drop` hands it to a collector instead — one built to handle a burst of many drops at once, not just a single tidy one. It's [on crates.io](https://crates.io/crates/redrop) now, and I wrote a slow, chapter-by-chapter [tutorial site](https://andygauge.github.io/redrop/) alongside it, because the interesting part isn't the macro, it's what the macro has to get right.

## The gap

You already know the shape of the problem if you've written enough async Rust: `Drop::drop` cannot contain `.await`. If closing a resource properly means talking to something asynchronously — flushing a batch of buffered log lines, sending a goodbye frame over a socket, releasing a lease held in a database — you're stuck. Block inside `drop` and you stall whatever thread happens to be dropping the value. Fire off an unstructured `tokio::spawn` and you've detached the cleanup from anything that would wait for it; the process can exit before it runs. Require an explicit `.close().await` and you've reintroduced exactly the class of bug `Drop` exists to prevent — the one where someone forgets.

None of the common workarounds account for the second half of the problem either: what happens when a few thousand things need this kind of cleanup at once, say during a deploy. Spawn all of them unbounded and you can hammer whatever they're talking to. That's the part I actually wanted to solve, not just "let drop be async-ish."

## What the macro actually diverts to

`#[redrop::async_drop]` on an `impl` block containing `async fn async_drop(&mut self)` expands to a generated `Drop::drop` that does two things: `mem::take(self)` to get an owned value out from behind `&mut self` (which is why the type needs `Default`), then hands a future wrapping that owned value to `redrop::enqueue`. The collector behind `enqueue` drains its queue through a bounded-concurrency pump — `FuturesUnordered` capped at a configurable limit, 32 by default — so a burst of drops queues and waits its turn instead of opening a thousand concurrent connections at once. With the `tokio` feature on, a background task drains that queue continuously; without it, everything queues until you `.await redrop::shutdown()`, which works with any executor and is the actual guarantee that every collected drop finished before your program exits.

## The bug that almost shipped

The first version had a real infinite recursion in it, and I think it's worth admitting rather than glossing over. The owned value moved into the queued future is the *same type* the macro just generated `Drop` for. When that future finished and dropped its captured value for real, that re-triggered the generated `Drop::drop` — which did another `mem::take` and re-enqueued, forever. Stack overflow, every time, even with a single dropped value. The fix is a thread-local guard: after `async_drop()` runs, redrop drops the value again through a `finalize` helper that flips a flag first, and the generated `Drop::drop` checks that flag and no-ops on the second pass, letting Rust's ordinary per-field drop glue run instead of diverting again. No unsafe code needed — just recognizing that `Drop::drop`'s only real job is deciding whether to intervene, and the compiler handles the rest either way.

## Configuration that lives outside the code

The `showcase/` crate and the tutorial spend a whole chapter on something small on purpose: the concurrency limit is read from a `redrop.toml` at startup, not hardcoded. That's the kind of number that needs to change per environment — what's fine on a laptop is wrong on a busy server — and recompiling to change one integer is friction nobody needs. The config path itself is overridable with an env var, so the same binary can pick up different tuning depending on where it's deployed. It's a small pattern, but it's the one I actually wanted the tutorial to model, not just document.

## A tutorial, not just docs

The [site](https://andygauge.github.io/redrop/) is built with [Zola](https://www.getzola.org/) and structured as six short chapters: why the problem exists, setup, implementing `#[async_drop]` and what it expands to, handling load, externalizing configuration, and shutdown. It deploys itself — GitHub Actions builds and tests the workspace under both feature configurations, builds the site, and pushes it to GitHub Pages on every merge to `main`.

## Where it is

- [`redrop` on crates.io](https://crates.io/crates/redrop)
- [Source on GitHub](https://github.com/AndyGauge/redrop)
- [The tutorial](https://andygauge.github.io/redrop/)

It's a small crate solving a specific, well-known gap, but it's the kind of small I like: the macro is a few dozen lines, the collector is a few dozen more, and almost all of the actual thought went into what happens when many things go wrong — or go right — at the same time.
