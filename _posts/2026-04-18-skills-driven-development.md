---
layout: post
section-type: post
title: Skills-Driven Development - Why Agentic Systems Need Waterfall
tags: [ '2026', 'ai', 'architecture', 'skills-driven-development', 'authorization', 'security' ]
---

Agile solved a human problem.

Humans are slow. Humans forget. Humans misread specs, skip details, and learn by touching the thing. So we learned to ship slices, make progress visible, and adjust in public. That made sense when the bottleneck was human throughput and human uncertainty.

Agentic systems fail differently.

Agents are fast, tireless, and obedient. They can generate beautiful local solutions all day long, and still tear the architecture apart if they are not constrained by a complete plan. That is the new failure mode: local correctness with global incoherence.

## Waterfall is right for agentic systems

The old argument against waterfall was cost. Exhaustive planning took too long, so teams coded first and discovered intent later. In agentic development, that argument collapses. We can generate formal models, boundary maps, interface contracts, threat models, and failure analyses before the first implementation prompt is issued.

Planning is no longer the expensive step. Repairing architectural drift across dozens of agent-produced diffs is the expensive step.

So yes, for agentic systems, waterfall is right. Not as dogma and not as nostalgia, but as control. Finish the plan, review it, freeze it as baseline, and only then allow implementation. If generated code drifts from baseline, either the code is rejected or the plan is formally revised and re-approved.

That is not anti-iteration. It is disciplined iteration. You still adapt. You just adapt from architecture into code, not from code into accidental architecture.

## Skills-Driven Development

This is where Skills-Driven Development enters.

In Skills-Driven Development, the skill commits before the code. The skill is not a prompt fragment or a style guide. It is the reasoning that produced the design and the application of that reasoning in real implementation decisions. It carries intent, defines constraints, names invariants, sets boundary rules, and encodes proof obligations for high-risk logic.

That artifact is reviewed first. It is challenged for logic gaps, security blind spots, and contradictions. Once approved, it is committed as a versioned baseline. Only then do agents apply the skill to produce implementation.

This is also where long-term maintenance changes. The skill is written for the maintainer who was not in the room when the decisions were made. It explains why the boundary exists, why a shortcut is forbidden, what must stay true when requirements change, and how to extend the system without breaking its core guarantees.

Over time the skill becomes a teaching guide, not a static artifact. Every real change can add better examples, sharper constraints, and clearer reasoning. The system gets easier to maintain because the logic that built it is preserved and improved instead of being lost in old pull requests.

Most teams review code and try to infer intent from the diff. Skills-Driven Development reverses that burden. Intent is reviewed directly, before code exists, and implementation is judged by conformance to committed intent. That single inversion is the pattern.

## Authorization is the proving ground

Authorization does not usually break in one dramatic moment. It drifts. A role check appears in one endpoint. A tenant exception appears in another. An emergency support bypass survives long after the emergency ends. Months later, nobody can explain policy end to end with confidence.

A formal authorization skill stops that slide. It states who can do what, under which context, with which limits, and with which required evidence. It makes invariants explicit, such as no cross-tenant reads, explicit scope for writes, and time-bounded attributable elevation. It forces deny paths and escalation paths to be part of the model rather than afterthoughts in controller code.

Now agents are not inventing policy one request handler at a time. They are implementing a committed model. Auditing still exists, but it changes shape. Instead of reverse-engineering intent from scattered conditionals, you verify conformance against a known baseline.

That is faster. That is safer. That is legible.

## The practical shift

This does not require an organizational reset on day one. Start where mistakes are expensive. Build a real skill artifact. Put a gate in front of implementation so no agent-generated PR lands without an approved skill baseline. Require code changes to map back to specific clauses in that baseline. Treat drift as a defect, not an inevitability.

The principle is simple enough to remember under pressure.

Centralize architecture before you parallelize coding.

Waterfall was not wrong because planning is bad. It was wrong when planning was too slow for reality. In agentic systems, planning is cheap and drift is expensive. That flips the equation.

Skill first. Then code.
