---
layout: post
section-type: post
title: pray.rs and the Noninterference Guarantee
tags: [ '2026', 'rust', 'leptos', 'pray-rs', 'leptosbook', 'mcp', 'open-source', 'type-safety' ]
---

**TL;DR** — I built [pray.rs](https://pray.rs), a distraction-free place to track and share prayers and praises. It works with any AI, or with none — whichever is your style. The build pushed me to pull its navigation primitives into their own crate, [leptosbook](https://crates.io/crates/leptosbook), now released as open source. Along the way I tested the one property I actually cared about: an unauthenticated AI actor reading the public surface can see what has been published and nothing else. The noninterference guarantee held. Prayers are private unless you publicize them.

## The network I wanted, not the one I didn't

I did not want to build a social network. I wanted a spiritual one. The difference is the whole point. A social network is engineered to pull your attention back; a place for prayer should give it back. So pray.rs has no feed designed to keep you scrolling, no metrics dressed up as encouragement, no reason to stay longer than the prayer took. You track your prayers and praises, you carry them forward, and if you choose to, you share them. Sharing is a decision you make, not a default you forget to turn off.

It also does not care how you pray. Bring an AI to help you find words, or bring nothing but the words you already have. The app works the same either way. That neutrality mattered to me enough that I made the AI an actor the system reasons about explicitly, rather than a feature bolted to the side.

## Privacy as a type, not a wish

Most apps treat privacy as a setting — a checkbox, a hope, a line in a policy. I wanted it to be a property the program could not violate even if I wrote the wrong code. That is what noninterference means: what is public must not depend on what is private. The public surface can change when public things change, and never when private ones do. If that holds, "your prayers are private unless you publicize them" stops being a promise and becomes a fact about the system.

So I ran the experiment I had been wanting to run. I let an unauthenticated AI actor reach the app over MCP and try to pull information — the kind of automated, credential-less read that a careless integration would hand everything to. It got exactly the public content and nothing past it. No private prayers, no group-shared entries, no side channel.

Here is the part I care about. That did not happen because I wrote careful handlers that check a flag and refuse. It happened because in an unauthenticated context the private tools do not exist. The MCP tool registry is dynamic — the set of tools an actor is offered is itself a function of who that actor is. An anonymous reader is handed the tools that read public things, and those are the only tools on the table. There is no private-prayer tool to call, no group-feed tool to misuse, nothing to filter because nothing was ever registered. You cannot exploit a capability you were never granted, and that is the whole point of a dynamic tool registry: the safe surface is not the result of every handler behaving — it is the result of the unsafe surface not being there.

This is where full-stack Rust earns its keep. The same types describe the data on the server, over the wire, and in the browser, so the boundary between "published" and "private" is one definition, checked once, everywhere. A whole class of "oops, that field was serialized into the public response" bugs simply cannot compile. I have shipped apps in languages where that guarantee lives in your discipline and your tests. Here it lives in the compiler. For something holding people's prayers, I will take the compiler.

## leptosbook: the part worth keeping

Halfway through, I noticed the most reusable thing I had built was not about prayer at all. It was the way you move through pray.rs — paginated, gesture-driven, swipe and arrow-key navigation that feels like turning pages instead of clicking through a UI. Those Folio primitives had no business being trapped inside one app, so I extracted them into leptosbook and released it open source.

The idea of a book as an information harness did not start here. It came from sveltekitbook — a solid step toward this project, but a *static* book: the same pages for everyone who opened it. pray.rs takes the next step and makes the book dynamic. What is in it depends on who is logged in and who they have chosen to share with. The harness is the same; what flows through it is now a function of identity and consent. That is exactly the seam where noninterference has to hold — a dynamic book is only safe if the private pages can never bleed into someone else's copy.

It is modular and free to extend. A carousel, an onboarding flow, a slide deck, a swipeable dashboard — same primitives, different content. The library ships with examples, a [cookbook](https://andygauge.github.io/leptosbook), and tests, and it is on crates.io now for anyone building with Leptos who wants page-turning navigation without writing the gesture math themselves.

## What it proves

The thing I keep coming back to: this is an AI-generated app, and none of the above is a compromise. The UI is genuinely nice to use. The developer experience is ergonomic. The type safety is real, not aspirational. People will tell you to pick two of those three. With Rust and Leptos, and an AI that respects the boundaries the types draw, I did not have to.

pray.rs is small and quiet on purpose. But under the quiet is a guarantee I can state plainly and back up: your prayers are yours. They go nowhere you did not send them. The math holds.
