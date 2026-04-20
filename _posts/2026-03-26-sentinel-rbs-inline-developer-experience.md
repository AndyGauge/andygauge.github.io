---
layout: post
section-type: post
title: "Sentinel: Keeping Ruby Type Signatures in Sync Without Breaking Your Flow"
tags: [ '2026', 'ruby', 'rbs', 'sentinel', 'types', 'ci', 'developer-experience' ]
---

Ruby 3 introduced RBS as the language's official type signature format, and with
[rbs-inline](https://github.com/soutaro/rbs-inline) you can write type annotations
directly in your Ruby files using `#:` comments:

```ruby
class OrderProcessor
  #: (Order, Payment) -> Result
  def process(order, payment)
    # ...
  end
end
```

This is a significant step forward. Types live next to the code they describe,
which means they get reviewed in the same PR, updated in the same commit, and
read in the same context. No more hunting through a parallel `sig/` tree to
figure out what a method accepts.

## The gap: annotations alone aren't enough

But here's the catch. Writing the annotations is only half the story. Your
editor's language server (Steep) doesn't read the inline comments directly — it
reads compiled `.rbs` files. So every time you annotate a method, you need to
regenerate the signatures before Steep can give you updated diagnostics.

In practice this means one of two things: you either run a manual generation
command every time you save, or you accept stale type information in your editor
until you remember to regenerate. Neither is great. The first interrupts your
flow; the second defeats the purpose of having types at all.

## Sentinel: a background watcher that closes the loop

[Sentinel](https://github.com/andygauge/sentinel-rb) is a Rust-powered file
watcher that sits in the background and regenerates `.rbs` files the moment you
save a Ruby file. The cycle becomes:

1. You write a `#:` annotation
2. Sentinel detects the change and regenerates the `.rbs` in milliseconds
3. Steep picks up the new signature and updates your editor diagnostics

No manual step. No context switch. You stay in your editor writing code, and
the type feedback just works.

Because Sentinel is written in Rust and uses parallel processing via rayon, init
on a large codebase (thousands of files) takes under a second. The file watcher
handles individual saves in single-digit milliseconds. It's fast enough that the
feedback feels instant.

## This works for AI too

If you're using an AI coding assistant — Cursor, Claude Code, Copilot — the same
problem applies but at a different scale. AI agents edit files rapidly and
often across multiple parts of the codebase at once. Without Sentinel running,
the language server falls behind, and the AI loses access to accurate type
information when deciding what to generate next.

With Sentinel watching in the background, every file the AI touches gets its
signatures regenerated immediately. The language server stays current, which
means better autocomplete suggestions, fewer type errors introduced by generated
code, and a tighter feedback loop for both human and machine.

## `sentinel check`: a CI gate for type freshness

Keeping signatures in sync locally is one thing. Making sure they stay in sync
across a team is another. Sentinel 0.3.0 introduces the `check` command — a
read-only verification that regenerates signatures in memory, compares them
against what's on disk, and exits with code 1 if anything is stale or missing.
It doesn't modify any files, which makes it safe to drop into any stage that
needs a freshness gate: a CI step, a Git pre-commit hook, a developer's
terminal before pushing.

<section class="col2" markdown="1">
<div class="col2__left" markdown="1">

The command itself is one line. Wire it into CI by invoking it before the rest
of your test suite runs, and wire it into Git with a pre-commit script so the
freshness check runs on every commit — catching stale signatures before they
ever reach the PR.

If someone adds a type annotation but forgets to regenerate, or if an AI agent
modifies method signatures without updating the `.rbs` files, the check catches
it before the code lands.

</div>
<div class="col2__right" markdown="1">

```bash
bundle exec sentinel check
```

```yaml
- name: Check RBS signatures are up to date
  run: bundle exec sentinel check
```

```bash
#!/usr/bin/env bash
set -e
bundle exec sentinel check
```

</div>
</section>

## Getting started

Add the gem to your Gemfile:

```ruby
group :development do
  gem 'rbs-sentinel'
end
```

Initialize and start watching:

```bash
bundle exec sentinel init
bundle exec sentinel watch
```

Configure which folders to watch in `.sentinel.toml`:

```toml
folders = ["app", "lib"]
output = "sig/generated"
```

The type annotations you write inline stay inline. Sentinel handles the rest.
