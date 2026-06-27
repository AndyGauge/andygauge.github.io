---
layout: post
section-type: post
title: A Month in the Rust Cookbook
tags: [ '2026', 'rust', 'rust-cookbook', 'open-source', 'mentorship', 'documentation' ]
---

**TL;DR.** Over the last month I landed 61 recipes in the [Rust Cookbook](https://github.com/rust-lang-nursery/rust-cookbook), plus a batch of fixes. I also helped five other contributors get their first or next recipes merged. The cookbook is the kind of documentation that meets people where they actually are. It answers the *"how do I do X in Rust"* question. Growing it is the most leverage I know of for someone new to the language. This post is the ledger: what I wrote, what I mentored, and why I think the boring maintenance mattered as much as the new sections.

## Why the cookbook

The Rust Cookbook is a collection of runnable recipes for common tasks. Read a file, parse an argument, hash a password, talk to a database. Every recipe compiles and is tested as part of the book, so the answer you copy is an answer that works. That property is the whole value. A blog post rots; a tested recipe in CI does not.

It is also, quietly, one of the best on-ramps in the ecosystem. The bar to contribute is "you solved a real problem and want to write it down," not "you understand the compiler internals." That makes it a place where a maintainer's time spent reviewing turns directly into new contributors. I spent the month on both sides of that.

There's a personal reason the timing landed the way it did. The start of this stretch marked the **nine-year anniversary of my first recipe** merged into the cookbook. Back then I was the new contributor, and I was mentored by some of the most incredible people in the Rust community. Aaron Turon, Brian Anderson, and Sage Griffin were patient reviewers who treated a stranger's rough PR as worth their time. I didn't earn that; it was given to me. Nine years on, the obligation is plain: I owe it to do the same. Mentoring this month wasn't charity or extra credit. It was paying back a debt that the only honest way to settle is to pass it forward.

## What I authored

The through-line was filling in the standard library and the obvious-but-missing third-party corners.

**New sections.** The biggest gaps were whole topics the book never covered:

- A [**WebAssembly**](https://rust-lang-nursery.github.io/rust-cookbook/wasm.html) section, plus wiring it into the homepage table of contents and the project's contributor docs.
- A [**Parsing**](https://rust-lang-nursery.github.io/rust-cookbook/parsing.html) section covering the three parsers people actually reach for: `nom`, `winnow`, and `pest`.
- A [**Configuration**](https://rust-lang-nursery.github.io/rust-cookbook/configuration.html) section walking through `config`, `figment`, and `confy`.
- A [**Multimedia**](https://rust-lang-nursery.github.io/rust-cookbook/multimedia.html) section with image and audio recipes.

**Standard-library coverage.** A lot of "how do I do this with just std" questions had no recipe to point at, so I added them: [`std::collections`](https://rust-lang-nursery.github.io/rust-cookbook/data_structures/collections.html) as a Data Structures subsection, [`std::path` and basic filesystem operations](https://rust-lang-nursery.github.io/rust-cookbook/file.html), [`std::sync` primitives](https://rust-lang-nursery.github.io/rust-cookbook/concurrency/sync.html), and a set of [`Option`/`Result` combinator recipes](https://rust-lang-nursery.github.io/rust-cookbook/errors/combinators.html) for the everyday plumbing of error handling.

**Networking, rebuilt.** The old [`net`](https://rust-lang-nursery.github.io/rust-cookbook/net.html) section was a single `server` stub, and the one recipe inside it was mine. Binding to an unused port was the very first thing I ever contributed to the cookbook, nine years ago. There is a symmetry I did not plan: the recipe I started with turned out to be the seed of the section I just rebuilt. I reorganized it into [TCP](https://rust-lang-nursery.github.io/rust-cookbook/net/tcp.html), [UDP](https://rust-lang-nursery.github.io/rust-cookbook/net/udp.html), and [Addresses](https://rust-lang-nursery.github.io/rust-cookbook/net/addresses.html) subsections, moved that first recipe into its new home, and filled the rest with twelve new ones: a TCP client, an echo server, connect and read timeouts, half-close, `TCP_NODELAY`, and non-blocking sockets; UDP datagrams and multicast; and address classification, dual-stack binding, and hostname resolution.

**Concurrency, modernized.** I added an [`available_parallelism`](https://rust-lang-nursery.github.io/rust-cookbook/hardware/processor.html) recipe and migrated the existing thread-pool recipes off the `num_cpus` crate now that std covers it. Fewer dependencies for the same answer. I also added an [IO-bound thread-pool recipe](https://rust-lang-nursery.github.io/rust-cookbook/concurrency/threads.html) that sums file sizes across a directory, since the existing pool examples were all CPU-bound.

**File system, expanded.** The [File System](https://rust-lang-nursery.github.io/rust-cookbook/file.html) section grew recipes for `notify` (watching for changes), `tempfile`, and `which`.

## The unglamorous half

Roughly a third of my PRs fixed nothing new and added nothing new. They were maintenance, and I think they count.

- Repaired the async section so it actually shows up in the homepage TOC, and unwrapped Cargo snippets that were trapped inside blockquotes.
- Bumped `mdbook` from 0.4 to 0.5.
- Fixed broken `tracing` badge images and a malformed `</br>` tag in the tar-compress recipe.
- Hid a noisy test module from the `rand` recipe so the rendered page shows only the part you came for.
- Moved the PBKDF2 recipe out of Encryption and into Hashing, where it belongs.
- Made the book say "recipe" consistently instead of drifting between "recipe" and "example."

None of that is exciting. All of it is the difference between a book people trust and a book people work around. Documentation is a surface, and surfaces degrade unless someone keeps sanding them.

## Who I mentored

The part I'm most glad about isn't in my commit count. Five other contributors landed work this month. Getting their PRs across the line was the most worthwhile time I spent. That meant reviewing, suggesting, and nudging the rough edges:

- **randomctl** added [database](https://rust-lang-nursery.github.io/rust-cookbook/database.html) recipes for **SQLx and SeaORM**, and later a set of **[smart-pointer](https://rust-lang-nursery.github.io/rust-cookbook/mem/smart_pointers.html)** recipes.
- **muchuiwilliam** added recipes for **[CLI argument parsing](https://rust-lang-nursery.github.io/rust-cookbook/cli/arguments.html) and [environment variables](https://rust-lang-nursery.github.io/rust-cookbook/cli/env.html)**.
- **UsamaQaisrani** contributed **five [std I/O recipes](https://rust-lang-nursery.github.io/rust-cookbook/file/read-write.html)** to the file read/write section.
- **TheScreechingBagel** cleaned up stale instructions telling readers to install `cargo-edit`.

A few of these were people's first merged contribution to the project. Review is where mentorship actually happens in open source. Not in advice, but in the back-and-forth on a real change someone cares about landing. The database recipes in particular took a while to get right, and they're better for it.

## Tending the issue tracker

New recipes are only half the job. The other half is making sure a newcomer who wants to help can find something worth doing. So I spent time in the [issue tracker](https://github.com/rust-lang-nursery/rust-cookbook/issues) too. I worked through the older issues, closed what time had already answered, and broke the sprawling ones into new issues with a tighter, more focused scope. A good issue names one recipe and one crate. That is the difference between "someday" and "I could do that tonight."

That is also my honest answer to "where do I start." Not the codebase. The issue list. Each focused issue is a recipe waiting for an author, sized so you can finish it in a sitting and see it ship.

## What I'd tell someone starting

If you're new to Rust and looking for a way in: open the [issues](https://github.com/rust-lang-nursery/rust-cookbook/issues), or pick a thing you recently figured out the hard way and write it as a recipe. The cookbook needs it, the bar is approachable, and there's a maintainer on the other side who would rather review your PR than write the recipe themselves. That maintainer was me this month, and it was the best use of the time.
