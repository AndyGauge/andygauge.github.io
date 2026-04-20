---
layout: post
section-type: post
title: "MCP-First Development: The Server Is the Interface"
tags: [ '2026', 'ai', 'mcp', 'agents', 'testing', 'authorization', 'developer-experience' ]
---

I've been building features MCP-first — against the tool surface before the UI — and the part that surprised me is how much it changes testing.

The tool names, input schemas, and outputs are your interface. Every downstream client consumes the same surface: the UI you'll add later, the CLI somebody wires up, the dashboard that shows up in six months. It reads as a layering choice and then, gradually, you realize it's about what you can ship with confidence, because the shape of the interface determines the shape of the tests you can write.

UIs don't submit to exhaustive testing. Their effective input space is unbounded; every rendered pixel, every event handler, every race condition between them is part of the surface in theory. An MCP tool is narrow and typed. You take the schema, drive calls across the happy path and each failure mode, check the responses, and write down what happened. A reviewer who sees a report like the one to the side has something to work with.

```
tool create_invoice
  14 cases, all pass

tool void_invoice
  8 cases, 7 pass
  1 expected-error path
    returned an unexpected code
```

They can spot-check the failure and trust the thirteen passes. Compare that to the claim that the feature works, which is worth whatever the reviewer's trust in you is worth on that particular Tuesday.

So far so good, until you try to do this on a real system.

## The bottleneck turns out to be auth setup

The first time I tried to run this kind of testing against an MCP server I'd just built, the part I thought would be hard was writing the cases, and that turned out to be easy. The part that was hard was getting any of them to run. Every tool call worth testing wants a token, a tenant, a user, a role assignment, and a resource already in the right state, owned by the right party. Without automation around all of that, the harness stalls before it asserts anything.

What the harness needs is the ability to spin up a caller on demand. Mint a token with whatever scope set you need. Create a tenant with a known schema and tear it down after. Seed users and roles so you can switch who the caller is with a flag. Create resources owned by the right principal. Impersonate end users through the on-behalf-of flow the application uses in production, not a bypass path that only exists in tests. If any one of those steps is manual, the effective test surface collapses to whatever one or two identities the developer had lying around when they wrote the suite, which is where UI-era testing already lives.

Every fixture you build is serving a kind of authorization check, and this is where things get harder than they should be, because the word authorization is doing the work of at least half a dozen concepts. A bug in any one of them looks identical to a bug in the others from outside the system. When someone tells me the authorization is broken, I've learned to ask which kind they mean.

Sometimes they mean authentication, which is the question of who the caller is. That isn't authorization in the strict sense, but the two get welded together so often that failing to separate them is how you spend an afternoon chasing the wrong bug. Sometimes they mean scope or capability: the token doesn't carry the OAuth scope the tool requires, so the call never reaches the resource at all. Sometimes they mean tenancy, where the caller's organization doesn't contain the resource in question, and this is where cross-tenant leaks live. Sometimes they mean role in the RBAC sense, where the caller is in the right tenant but their role assignment doesn't include the operation. Sometimes they mean ownership or relationship in the ReBAC sense, where two callers can share a role and still differ on whether one of them is the creator, assignee, member, or approver of the specific resource being touched. Sometimes they mean delegation, where an agent is acting on behalf of a principal and the question is whether that principal's authority extends to the action. And sometimes they mean consent: the end user agreed this app may perform this kind of thing on their behalf, and the call is either inside or outside what they agreed to.

One denied tool call. From the caller's side, one error code. From the system's side, seven places to look. Most codebases collapse them into a single enforcement call that silently blends all of them.

```ruby
can?(user, :action, resource)
```

The test harness can't tell which layer said no, and the reviewer reading the report can't either.

MCP-first gives you a chance to be honest about which layer you're testing. Each tool description can declare which of these checks it enforces. The harness can target one layer at a time by holding the others constant. The report can say which flavor of authorization was exercised and which was only assumed. A denial becomes a traceable decision instead of a single bit.

## The order I build things in now

I design the tool surface first. What operations does the feature expose, what are the inputs, what are the outputs. That surface becomes the definition of done. Then I implement behind the tools rather than beside them, so the storage, the business logic, and the side effects all sit behind the MCP contract. Then I test against the tools, so every scenario is a sequence of tool calls with expected results, each tagged with the authorization layer it's exercising. The UI comes last. If the tool surface is right, the UI is easy. If the tool surface is wrong, no UI polish will save it.

None of this is about MCP. What matters is picking a machine-legible interface as the primary one and building everything else, the agent included, around that choice. The feature gets verified where it's defined instead of where it's rendered, and the sentence that says it works starts to mean something the reviewer can inspect.
