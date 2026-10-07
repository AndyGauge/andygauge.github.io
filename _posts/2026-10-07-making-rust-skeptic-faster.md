---
layout: post
section-type: post
title: "Making rust-skeptic 4.7x Faster on the Rust Cookbook"
tags: [ '2026', 'rust', 'performance', 'testing', 'open-source' ]
---

**TL;DR** — [rust-skeptic](https://github.com/budziq/rust-skeptic) turns the Rust code blocks in markdown into `#[test]` functions. The [Rust Cookbook](https://github.com/rust-lang-nursery/rust-cookbook) uses it for every recipe, and its `cargo test` was slow and pinned the CPU. I measured it, found that the per-snippet setup work dominated, and fixed that. The full cookbook run (225 tests) dropped from 297 s to 63 s. The changes are on the [`perf-on-rlib-patch`](https://github.com/AndyGauge/rust-skeptic/tree/perf-on-rlib-patch) branch of my fork, and [PR #3](https://github.com/AndyGauge/rust-skeptic/pull/3) now runs the benchmarks under [CodSpeed](https://codspeed.io) in CI.

## Measuring first

Skeptic's work comes in two phases:

1. **Generate** (in `build.rs`): parse markdown, emit one `#[test]` per snippet.
2. **Run** (`skeptic::rt`, once per snippet): find the project's compiled dependencies, call `rustc`, optionally run the binary.

I added a separate bench crate (`benches/`) using [divan](https://github.com/nvzqz/divan) through [CodSpeed](https://codspeed.io)'s [`codspeed-divan-compat`](https://crates.io/crates/codspeed-divan-compat), so the same benchmarks run locally with `cargo bench` and in CI under CodSpeed (now running on [PR #3](https://github.com/AndyGauge/rust-skeptic/pull/3)). It lives outside the main workspace so the 1.56 MSRV build isn't affected. Setting `COOKBOOK_DIR` makes it use the real cookbook instead of a synthetic corpus.

Here is the benchmark that measures the generate phase over the whole cookbook:

```rust
// Whole cookbook `src/` tree (no-op unless `COOKBOOK_DIR` is set).
#[divan::bench(sample_count = 10)]
fn generate_cookbook(bencher: Bencher) {
    let Some(dir) = cookbook() else {
        return bencher.bench_local(|| ()); // keep the bench registered
    };
    let docs = skeptic::markdown_files_of_directory(dir.join("src").to_str().unwrap());
    bench_generate(bencher, &dir, &docs);
}
```

Without `COOKBOOK_DIR` it registers an empty bench, so the suite still runs everywhere.

The first result ruled out the obvious suspect. Parsing and generating tests for the entire cookbook takes about 30 ms. The cost is all in phase 2.

## What was slow

For every snippet, `rt` did the following before it ever ran `rustc`:

- ran `cargo metadata` to find the edition
- ran `cargo metadata` again to find the locked dependencies
- walked `target/.fingerprint` to map each dependency to an rlib

Against the cookbook, a trivial `no_run` snippet cost about 1.3 s, compared with about 0.3 s in a small project. The setup work, not compilation, dominated, and it scaled with project size. libtest runs tests on many threads, so every thread repeated all of it at once.

## What changed

1. **Resolve once per process.** The edition, the dependency set and the `--extern` arguments are computed on first use and shared. Concurrent tests wait for one resolution instead of each doing their own.
2. **A bounded worker pool.** libtest threads now enqueue a job and wait. A fixed pool (`SKEPTIC_JOBS`, default CPU count) runs `rustc`, so concurrency no longer depends on how many test threads exist. Output and panics are still reported from the test's own thread, so `should_panic` behaves as before.
3. **Fixing dependency lookup on newer Cargo.** Cargo changed its package-id format in 1.77, which made skeptic find no dependencies and fail four of its own tests. Names and versions are now read from the `packages` list instead of parsed out of the id string.

The worker pool is small enough to show in full:

```rust
/// A fixed pool of workers fed by a queue. libtest runs each generated test
/// on its own thread; those threads only enqueue and wait, so the number of
/// concurrent `rustc` processes stays bounded.
static QUEUE: Lazy<Mutex<Sender<Job>>> = Lazy::new(|| {
    let (tx, rx) = mpsc::channel::<Job>();
    let rx = Arc::new(Mutex::new(rx));
    for _ in 0..worker_count() {
        let rx = Arc::clone(&rx);
        thread::spawn(move || loop {
            let job = match rx.lock().unwrap_or_else(|e| e.into_inner()).recv() {
                Ok(job) => job,
                Err(_) => return,
            };
            let _ = job.reply.send((job.work)());
        });
    }
    Mutex::new(tx)
});
```

Each job carries a closure and a reply channel. The test thread sends the job, blocks on the reply, and reports the result itself, which is why panics and output still land on the right test.

I used std threads and channels rather than an async runtime. The work is spawning processes and waiting on them, so futures would add dependencies without making anything faster.

A resident compiler isn't an option either: stable `rustc` has no server mode, and `rustc_driver` is nightly-only and version-locked.

## Results

On the upstream codebase, per snippet against the cookbook (median):

| | Before | After |
|---|---|---|
| `compile_test` (`no_run`) | 1.29 s | 79 ms |
| `run_test` | 1.76 s | 512 ms |

The cookbook pins a fork of skeptic (`rlib-patch`) that already has a disk cache and handling for multiple versions of the same crate. I ported the same changes onto it. Full `cargo test` in the cookbook, 225 tests:

| | Test run | Wall time |
|---|---|---|
| Fork as pinned | 297 s | 299 s |
| With in-process cache + worker pool | 63 s | 72 s |

## Does dependency complexity matter?

I built fixtures of increasing complexity: no dependencies, 12 dependencies, an 8-member workspace, and a crate depending on two versions of `rand`. Median per snippet:

| Fixture | Warm | Cold (first snippet) |
|---|---|---|
| no deps | 73 ms | 139 ms |
| many deps | 75 ms | 487 ms |
| workspace | 72 ms | 387 ms |
| conflicting rand versions | 82 ms | 248 ms |

Once cached, complexity disappears and what remains is `rustc`. The cold cost grows with the dependency tree, but it's paid once per test process.

## Link-time experiment

`run_test` costs about 510 ms against 73 ms for `compile_test`. I timed each stage of a trivial snippet with `rustc` directly (macOS, `rustc` 1.95, medians of 10 runs):

| Stage | Time |
|---|---|
| Metadata only (`compile_test` path) | 69 ms |
| Compile to object file | 99 ms |
| Compile + link | 195 ms |
| Run a binary that has already run once | 5 ms |
| **Run a freshly linked binary** | **295 ms** |

Linking is about 100 ms. The surprise is the last row: the first execution of any new binary costs about 290 ms, and the second costs 5 ms.

I tried to shrink both:

- **Compiler and linker flags** (`-C debuginfo=0`, `strip=symbols`, `prefer-dynamic`, `codegen-units=1`, `panic=abort`, incremental, `-dead_strip`, `-no_uuid`): all land between 198 and 210 ms for compile + link, against 285 ms for the first, cold run. None change the result in a meaningful way, and `-no_uuid` was slower.
- **The first-run penalty:** dropping the linker's ad-hoc signature (`-no_adhoc_codesign`) or moving the binary out of the temp directory changes nothing. It stays at about 290 ms.

So flags don't help. The first-run cost is the operating system vetting each new executable (Gatekeeper and friends), not anything `rustc` does. It isn't a skeptic problem and doesn't apply on Linux CI. Two things soften it:

- The worker pool overlaps these waits across snippets, so it costs wall time less than the sum suggests.
- On a development Mac, enabling Developer Tools exemption for your terminal (System Settings → Privacy & Security → Developer Tools) is the supported way to skip the check. I haven't measured that.

The only way to skip it in skeptic would be to not execute a new binary at all. For `no_run` snippets that is already the case, and for the rest the snippet has to run.

## What's left

- **Stop running `cargo metadata` before the disk cache check.** Storing the edition and a lock-file check in the cache entry lets a repeat process skip it. That saves 100-400 ms once per process.
- **Batch snippets that share a template** into one compile, if their semantics allow it.
