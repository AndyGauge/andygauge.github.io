---
layout: post
section-type: post
title: "3,434 Real Ruby Files as a Test Suite for sentinel"
tags: [ '2026', 'ruby', 'rbs', 'rust', 'llm', 'testing', 'open-source' ]
---

**TL;DR** — I set out to build training data that teaches a model to write inline RBS comments, and ended up with the most thorough test of [sentinel](https://github.com/AndyGauge/rbs-sentinel) it has ever had. Reverse-compiling the signatures in `ruby/gem_rbs_collection` back into inline annotations gave me 3,434 real Ruby files with known-correct answers. Sentinel reproduced 74% of them exactly. Every one of the other 26% was a member it silently dropped, never a wrong signature, and about 94% of those trace to one limitation: sentinel transpiles one class per file. I filed three issues ([#35](https://github.com/AndyGauge/rbs-sentinel/issues/35), [#36](https://github.com/AndyGauge/rbs-sentinel/issues/36), [#37](https://github.com/AndyGauge/rbs-sentinel/issues/37)), and along the way found two bugs in my own generator that only a second implementation could have shown me.

## What I was trying to do

sentinel turns `#:` comments in Ruby into `.rbs` files. A model like gpt-oss-120b doesn't know that pattern, so I wanted a lot of rows of *plain Ruby in, annotated Ruby out* to fine-tune on. I built a small Rust crate for it ([synthentic-sample](https://github.com/AndyGauge/synthentic-sample)): an abstract factory that produces seeded, deterministic pairs, with the Ruby/RBS generator as one implementation, a Slint GUI to read, edit and delete pairs, and a debounced save every five seconds.

The first useful thing it did was test sentinel. Each generated pair is compiled by sentinel and the result is stored beside it. The first time I looked, sentinel 0.2.1 had transpiled only `#:` on instance methods: trailing `attr_reader :a #: String`, `# @rbs` tags, ivars and `def self.` were all dropped without a word ([#33](https://github.com/AndyGauge/rbs-sentinel/issues/33)). After the patch, the same 100 generated pairs went from 154 of 277 methods and 0 of 294 attributes to 277 of 277 and 294 of 294.

Making that fast mattered too. Compiling went through `sentinel init` in a temp directory behind an asdf shim, about 180 ms a pair. I added a custom `sentinel/transpile` request to `sentinel lsp` that takes source text and returns RBS plus diagnostics in memory. A hundred compiles went from 18.4 seconds to about 0.1.

## Synthetic data only tests what you thought of

A generator can only check what its author imagined. My classes had two to four attributes and a few tidy methods. Real code has nested modules, reopened classes, `private def`, methods defined inside `if` branches.

I looked for repositories with a `sig/` folder to import from and found few. `ruby/gem_rbs_collection` was the exception: 174 gems, 839 `.rbs` files, 15 MB, signatures written by people for real gems. It holds only the signatures, though. The Ruby they describe is the gems' own source, so the app syncs the collection into a cache, runs `gem unpack` for each gem (in parallel, cached), and reverse-compiles:

- `def name: SIG` becomes `#: SIG` above the `def`
- `attr_reader name: T` becomes a trailing `#: T`
- `@name: T` becomes `# @rbs @name: T`

The pair is the plain Ruby in, the annotated Ruby out. The best part is that the answer key comes for free: each pair stores the RBS its annotations were generated from. After sentinel compiles the output, the app compares sentinel's RBS to that, member by member, and puts a green or red dot on the pair. The whole job is a differential test whose oracle is a human-written signature file.

## The first full run

172 of 174 gems imported (the two sidekiq commercial gems aren't on rubygems.org). That produced 3,440 pairs, 533 seconds of it downloading and 7.3 seconds to compile and check all of them.

| | pairs |
|---|---|
| compiled RBS equals the source RBS | 2,537 (74%) |
| mismatch | 903 (26%) |
| compile error | 0 |

The first comparison I wrote was too strict. On the first gem I tried (`redis`), 4 of 14 pairs mismatched. Three were false alarms: for long signatures sentinel wraps parameters one per line with a trailing comma, which is the same type. Making the comparison ignore a trailing comma was a small change, but it is the kind of thing a differential test buries in the noise until you actually read the failures.

## "Send them through an LLM"

903 mismatches is too many to read. My first instinct was to push each one through a language model and ask whether sentinel was to blame. What worked better was a deterministic judge first and the model for the clusters.

The judge is `rbs-inline`, the reference implementation, with one question per member: does it emit this member with the expected signature? If it does and sentinel doesn't, that's sentinel's fault. If it drops it too, the problem is the pair.

That caught me out once. I ran rbs-inline as a single batch, and one file crashed it (`Constant path contains dynamic parts`). The batch silently emitted almost nothing, so it said 316 pairs were *my* fault. Run one file at a time, that dropped to 27. An oracle needs checking as much as the thing it judges.

Then the oracle did what a second implementation is for and found bugs in my side:

- **ivar annotations.** rbs-inline treats a comment directly above a member as that member's documentation and ignores a `# @rbs @count: Integer` inside it. Sentinel is lenient, so my pairs looked fine to the tool I was testing. A blank line after the block fixes it.
- **Class variables.** I was emitting `# @rbs @@x: T`. Sentinel accepts it, rbs-inline doesn't read it, so I stopped generating it rather than train on non-standard syntax.

After those fixes, on 3,434 pairs:

| | pairs |
|---|---|
| compiled RBS equals the source RBS | 2,554 (74%) |
| flagged | 880 |
| of the 879 the oracle could process: sentinel alone is to blame | 826 |
| the pair alone is to blame | 18 |
| both | 35 |

By member, that is about 4,700 members sentinel dropped against about 100 on the pair side. Not one mismatch was a differing signature. Everything wrong was something missing.

## What sentinel gets wrong

Every claim below comes from a minimal repro run through both tools, not from reading the source.

**One class per file (about 94% of dropped members; [#35](https://github.com/AndyGauge/rbs-sentinel/issues/35)).** In `walk()`, a `class` node overwrites what was collected so far and returns without visiting nested nodes. So the outermost class wins, among sibling classes the last wins, and a module after a class is ignored. The ugly case is a module with its own annotated methods that also contains any nested class, a pattern all over Rails:

```ruby
module Redirecting
  class UnsafeRedirectError < StandardError; end

  #: (String) -> void
  def redirect_to(url); end
end
```

`sentinel init` prints `Generated 0 RBS files (1 skipped, 0 errors)` and writes nothing. That is also why my own earlier run had 405 pairs with no output file. rbs-inline emits the module and both members.

| cause | members | pairs |
|---|---|---|
| a different class or module in the file was kept | 2,324 | 366 |
| class nested inside the class that was kept | 2,100 | 409 |
| a member lost inside an emitted scope | 302 | 122 |

**Visibility modifiers ([#36](https://github.com/AndyGauge/rbs-sentinel/issues/36)).** A `#:` above `private def`, `protected def`, `public def` or `module_function def` isn't attached to the method. Sentinel warns here, but the signature is lost. 35 members in 17 pairs.

**Defs inside conditionals and blocks ([#37](https://github.com/AndyGauge/rbs-sentinel/issues/37)).** A `def` inside `if`/`unless`/`case`/`begin` or a `do` block is dropped with no warning at all: 23 members in conditionals, 10 in blocks. For `class_methods do` I'm not sure rbs-inline's answer (treat them as instance methods of the module) is right, so the issue asks for a warning there rather than copying it.

The thing all three share is the part that bothers me most. None of them *fails*. Sentinel exits 0, reports no errors, and the annotation you wrote vanishes. A tool that says "I can't do that" is easy to work around. One that quietly does less is only caught by a test like this one.

## Caveats

- Counts are pairs, meaning files or hunks of large files, so big gems weigh a lot. activerecord alone is 583 pairs.
- "Match" checks the members I annotated. Extra members in sentinel's output are ignored.
- The reverse compiler only handles single-signature methods. Overloads and `attr_*` lines naming several symbols are skipped.
- rbs-inline is an oracle, not a spec. Where the two disagree on meaning (the `class_methods` case), I flagged it instead of calling a winner.
- This is one run against one build: sentinel-rb 0.6.0 from my `feat/inline-rbs-forms` branch, rbs-inline 0.11.0, and the newest collection entry of each gem.

## Where it goes next

The fix I'd most like is for sentinel to emit every class and module in a file, and failing that, to warn when it drops an annotation. Once either lands, the same command re-runs the whole corpus:

```sh
cargo run --release --example import -- gems out.jsonl
```

and the number to watch is 74%. That makes it a regression suite as much as a data generator: a few thousand real files, each with a known-correct answer, checked in seconds. The 26% that fails today is, conveniently, also the list of what to fix.

As for the original goal, the pairs that match are exactly the training rows I wanted, and the flagged ones are easy to filter out until sentinel catches up.

I did most of this pairing with Claude Code, including the triage and drafting the issues, but the decisions that mattered were the ones above: use the reference implementation as the judge, and distrust the judge too.

## Links

- [synthentic-sample](https://github.com/AndyGauge/synthentic-sample), the generator, GUI and importer
- [rbs-sentinel](https://github.com/AndyGauge/rbs-sentinel) and the issues from this run: [#33](https://github.com/AndyGauge/rbs-sentinel/issues/33), [#35](https://github.com/AndyGauge/rbs-sentinel/issues/35), [#36](https://github.com/AndyGauge/rbs-sentinel/issues/36), [#37](https://github.com/AndyGauge/rbs-sentinel/issues/37)
- [ruby/gem_rbs_collection](https://github.com/ruby/gem_rbs_collection)
