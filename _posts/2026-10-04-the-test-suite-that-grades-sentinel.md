---
layout: post
section-type: post
title: "From 74% to 100%: Re-running the gem_rbs_collection Suite Against sentinel"
tags: [ '2026', 'ruby', 'rbs', 'rust', 'testing', 'open-source' ]
---

**TL;DR** — Last time I used `ruby/gem_rbs_collection` as an answer key for [sentinel](https://github.com/AndyGauge/rbs-sentinel) and it matched 74% of 3,434 real Ruby files. I turned that into a one-click scenario in [synthentic-sample](https://github.com/AndyGauge/synthentic-sample) and pointed it at sentinel 0.7.0, which reported 32 mismatches out of 3,540 pairs. Only 19 of the 32 were sentinel's: twelve were stale data in my own `pairs.jsonl` and one was a bug in my reverse compiler. The 19 traced to three limitations, which I filed ([#40](https://github.com/AndyGauge/rbs-sentinel/issues/40), [#41](https://github.com/AndyGauge/rbs-sentinel/issues/41), [#42](https://github.com/AndyGauge/rbs-sentinel/issues/42)). All three were fixed and shipped in [sentinel 0.7.1](https://rubygems.org/gems/rbs-sentinel/versions/0.7.1), which matches 3,408 of 3,411 pairs. After two more fixes on my side, **all 3,410 pairs match**. The last of those changes what the suite tests, so I explain it below.

## The 74% is now a number you re-run

The earlier post ended with "once either lands, the same command re-runs the whole corpus." Sentinel did land [#33](https://github.com/AndyGauge/rbs-sentinel/issues/33), [#35](https://github.com/AndyGauge/rbs-sentinel/issues/35), [#36](https://github.com/AndyGauge/rbs-sentinel/issues/36) and [#37](https://github.com/AndyGauge/rbs-sentinel/issues/37), so I stopped re-running a script by hand and built the loop into the app.

Pick *gem_rbs_collection → sentinel* and press Run scenario. It runs five steps:

1. **Fetch sentinel**: the latest `rbs-sentinel` gem from rubygems, whose `.gem` file is a tar holding one prebuilt binary per platform. The cached copy is used if you're offline.
2. **Sync gem_rbs_collection**: 174 gems at the current commit.
3. **Fetch gems, build pairs**: `gem unpack` each one and reverse-compile the collection's signatures into `#:` comments.
4. **Compile with sentinel**: in memory over `sentinel lsp` (`sentinel/transpile`), so thousands of pairs take seconds.
5. **Check against source, diff with last run**: compare sentinel's RBS to the signatures the annotations came from, and report what *changed* since the previous run (fixed, regressed, different mismatch), not only what's wrong.

The last step is the one I use most. A mismatch list is a to-do list, but a diff between two sentinel versions is a regression report.

## 32 mismatches, whose fault?

The GUI showed 32 red dots among 3,540 pairs. I wanted to know how many were sentinel's, and the quickest way was to run each mismatched pair through `sentinel lsp` myself. I used a line-level delta-debugger (drop chunks of lines while the symptom stays) to get minimal repros, and checked each pair's source with `ruby -c`.

| Cause | Pairs | Whose |
|---|---|---|
| Stale `pairs.jsonl` | 12 | mine |
| Class-scoped signature attached to a def in an anonymous class | 1 | mine |
| `no_commands do` / `no_tasks do` (Thor) | 10 | sentinel, [#40](https://github.com/AndyGauge/rbs-sentinel/issues/40) |
| `def x … end unless method_defined?(:x)` | 4 | sentinel, [#41](https://github.com/AndyGauge/rbs-sentinel/issues/41) |
| `included do` bodies | 2 | by design: sentinel skips and warns, so the importer now skips them too |
| `Struct.new(:a) do # :nodoc:` (a trailing comment hid the block from my compiler) | 1 | mine |
| Invalid Ruby in, `UnknownClass` out | n/a | sentinel, [#42](https://github.com/AndyGauge/rbs-sentinel/issues/42) |

**Stale data.** Seven of the pairs weren't valid Ruby. A big file gets split into hunks, and an earlier version of my splitter cut some of them mid-block. Sentinel returned `class UnknownClass` for them, which is why #42 matters, but the input was the problem. Six more had multi-line overloads truncated at `| (`, because my RBS parser stopped a statement at the first complete overload. Both bugs were already fixed in my working tree. The saved file simply predated the fixes. Regenerating took the count from 32 to 20.

**An owner bug.** Hunk `route_set.rb#3` expected `RouteSet#initialize: (?untyped config) -> untyped`, and the source has an `initialize(routes)` that sits inside `Module.new do … end`, so it belongs to an anonymous module. My reverse compiler only tracked `class` and `module`, so it put the outer class's signature on whatever `def initialize` came next. Sentinel correctly ignored a block. Teaching the compiler that `.new … do` opens an anonymous scope fixed it, and also cleared the two `Class.new do` cases in `active_model_serializers`.

After that: **3,394 of 3,411 pairs match (99.5%), 17 mismatch.** Sixteen of the 17 were the sentinel limitations below. One was another bug of mine: my check for `Struct.new(:a) do` blocks missed one with a trailing `# :nodoc:` comment. Fixing that leaves 3,409 of 3,411 matching.

## What sentinel got wrong, and what happened to it

All three limitations had the same shape as before. Sentinel doesn't fail, it just drops the annotation and says 0 errors. In 0.7.0 it warns for some of them, but the signature is still lost. I filed each one with a repro, and each was fixed within a day.

**Thor's `no_commands` and `no_tasks` ([#40](https://github.com/AndyGauge/rbs-sentinel/issues/40), fixed in [#44](https://github.com/AndyGauge/rbs-sentinel/pull/44)).** This was 10 pairs, nearly all of them `railties`. Sentinel 0.7.0 deliberately skips annotated members inside blocks and warns:

```ruby
class DevCommand < Thor
  no_commands do
    #: () -> void
    def help
      say "usage"
    end
  end
end
```

```
[warn] annotated members inside `no_commands do ... end` are not emitted
       (sentinel scans class and module bodies, not blocks)
```

Skipping blocks is the right call for `included do` or `Struct.new do`, but these two Thor blocks are evaluated in the class body, so the `def` is an ordinary instance method of the class. The fix treats them as part of the class body.

**Trailing modifiers ([#41](https://github.com/AndyGauge/rbs-sentinel/issues/41), fixed in [#43](https://github.com/AndyGauge/rbs-sentinel/pull/43)).** `def x … end unless method_defined?(:x)` is the standard polyfill idiom, and the signature above it was reported as "not attached to a method or attribute". `concurrent-ruby`'s `Map`, `sinatra` and `yard` hit it. The statement forms (`if … end` bodies) were handled in #37; the modifier forms are a different node.

**Silent recovery from syntax errors ([#42](https://github.com/AndyGauge/rbs-sentinel/issues/42), fixed in [#45](https://github.com/AndyGauge/rbs-sentinel/pull/45)).** A missing `end` didn't fail. A truncated file produced no output, and a file with an unbalanced `module` could come back under the wrong namespace. Neither reported an error. I only hit it through my own bad slices, but a CI job running sentinel would have seen the same silence. Sentinel now warns when a file has a syntax error.

The suite agrees. Compiling the same 3,411 pairs with the published 0.7.1 gem moved 14 pairs from mismatch to match and none the other way. The 2 that remained were annotated members inside `included do` bodies, in `activemodel` and `activerecord`. Sentinel skips those and warns, which I think is right: the block runs in the including class, not the module. The RBS authors flattened those members onto the module, so the answer key and sentinel disagree about what they mean.

I got to 100% by changing the question, not sentinel. The importer no longer annotates members inside `included do`, `prepended do` and `extended do`, so the suite stops grading sentinel on something it deliberately doesn't do. That removed one pair entirely, because it held nothing else, and the final run is 3,410 of 3,410. A 100% that comes from narrowing the test is weaker than one that comes from a fix, so treat it as "everything sentinel claims to support matches", not "sentinel handles all Rails idioms". If sentinel ever grows an option to treat those blocks as the module's own, the importer can switch them back on.

## Why "recompile" wasn't enough

There was a detour. After installing a sentinel with the fixes, I pressed Recompile and the count went from 32 to 18. That is the 14 pairs sentinel fixed, and the other 18 were my side. I then pressed Run scenario and got 19, and closing and reopening the app did not change it, so I suspected a stale binary. It wasn't one. The binary was old, but the number was also wrong for a second reason: the store.

`Store::merge` kept the old text of any pair whose id already existed and refreshed only its `expected` RBS. When my generator started producing a different slice under the same id, the stored pair kept its truncated 133-line input next to an `expected` describing the whole 262-line file. Sentinel can't emit methods that aren't in the file, so it was blamed for 13 "missing" members. It also never removed ids a run stopped producing, so ghost pairs from the old splitter stayed red forever.

I changed three things:

- A pair whose **input** changed is a different pair that shares a name, so it is replaced outright.
- Each stored pair records a fingerprint of the text the generator produced. A pair that still matches it follows the generator, and one that doesn't was hand-edited and is protected.
- After a run, pairs from a source it covered that it no longer produced are listed as stale, with a button to remove them. Hand-edited and synthetic pairs are never listed.

## Where it ended up

**3,410 of 3,410 pairs match** against sentinel 0.7.1, the published gem, with 0 mismatches.

Here is the whole run from an empty store: fetch sentinel 0.7.1 from rubygems, sync the collection, build the pairs, compile them and check them against the source signatures. The steps add up to about 22 seconds.

<video controls muted playsinline preload="metadata" style="width:100%;border-radius:8px;margin:1rem 0">
  <source src="/img/scenario-run.mp4" type="video/mp4">
  <a href="/img/scenario-run.mp4">Screen recording of a scenario run finishing at 3,410 of 3,410 pairs matching (28 seconds)</a>
</video>

Three things to keep in mind before reading that as "done":

- **It is a regression suite, not a proof.** Every pair is real code from a gem in the collection, and the answer is a signature written by a person. That covers the idioms those gems use, not every idiom.
- **The 100% includes a scoping decision.** Without it the number is 3,409 of 3,411.
- **"Match" means every member I annotated came out with the signature I annotated it with.** Extra members in sentinel's output are ignored, and overloaded methods and multi-symbol `attr_*` lines aren't annotated at all.

To re-run it against any sentinel, set the sentinel source to `rubygems`, `path`, `git` or `installed` and run `cargo run --release --example scenario`. It prints what changed since the last run, so the next sentinel release gets a report of what it fixed and what it broke.

## What I'd tell my past self

- **Check that the data is fresh before blaming the tool.** A third of my mismatches came from a file I'd generated before fixing my own bugs, and a store that preserved old text made it look as if the fixes hadn't worked. When a pair's input and expected output disagree, the problem is the pair.
- **A second implementation finds your bugs too.** The anonymous-class bug only surfaced because sentinel disagreed with my answer key, and the disagreement was my key being wrong.
- **Minimal repros are most of an issue.** Every report above is a handful of lines that you can paste into `sentinel lsp` and see fail. That is the difference between "sentinel drops some things" and a fix that can be verified. It is also how I knew the fixes worked: the same suite re-ran with 14 fixed and 0 regressed.

I worked through the triage with Claude Code, including the delta-debugging and the reverse-compiler fix. The calls that mattered were still human ones: check the input before blaming the tool, and file the sentinel issues rather than working around them in the generator.

## Links

- [synthentic-sample](https://github.com/AndyGauge/synthentic-sample), the generator, GUI and scenario runner
- [rbs-sentinel](https://github.com/AndyGauge/rbs-sentinel) ([0.7.1 on rubygems](https://rubygems.org/gems/rbs-sentinel/versions/0.7.1)), with this round's issues [#40](https://github.com/AndyGauge/rbs-sentinel/issues/40), [#41](https://github.com/AndyGauge/rbs-sentinel/issues/41), [#42](https://github.com/AndyGauge/rbs-sentinel/issues/42) and the fixes [#43](https://github.com/AndyGauge/rbs-sentinel/pull/43), [#44](https://github.com/AndyGauge/rbs-sentinel/pull/44), [#45](https://github.com/AndyGauge/rbs-sentinel/pull/45)
- [ruby/gem_rbs_collection](https://github.com/ruby/gem_rbs_collection)
- Previous post: [3,434 Real Ruby Files as a Test Suite for sentinel]({% post_url 2026-10-03-comprehensive-sentinel-tests %})
